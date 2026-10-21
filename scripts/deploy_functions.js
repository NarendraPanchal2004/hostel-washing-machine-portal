const { Client } = require('pg');

const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zhurgvwsaawacmukbvbi',
    password: 'Babasaheb@250',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function deployFunctions() {
    await client.connect();
    console.log('Connected to DB');

    // 1. Create admin_profiles table
    await client.query(`
        CREATE TABLE IF NOT EXISTS public.admin_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            email VARCHAR(120) NOT NULL UNIQUE,
            full_name VARCHAR(100) DEFAULT 'Hostel Warden / Laundry Manager',
            created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
        );

        INSERT INTO public.admin_profiles (email, full_name)
        VALUES 
            ('7447642019@hostel.edu', 'Hostel Laundry In-Charge (7447642019)'),
            ('admin@hostel.edu', 'Hostel Warden / Laundry Manager')
        ON CONFLICT (email) DO NOTHING;
    `);
    console.log('Admin profiles verified');

    // 2. Atomic booking procedure
    await client.query(`
        CREATE OR REPLACE FUNCTION public.book_washing_machine(
            p_machine_id INT,
            p_student_name TEXT,
            p_student_roll TEXT,
            p_student_phone TEXT,
            p_student_email TEXT,
            p_start_time TIMESTAMPTZ
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public, pg_temp
        AS $$
        DECLARE
            v_end_time TIMESTAMPTZ;
            v_booking_date DATE;
            v_today DATE;
            v_machine_status VARCHAR(20);
            v_machine_name VARCHAR(100);
            v_active_from_date DATE;
            v_reference_code TEXT;
            v_new_booking_id UUID;
            v_overlap_count INT;
        BEGIN
            v_end_time := p_start_time + INTERVAL '75 minutes';
            v_booking_date := (p_start_time AT TIME ZONE 'UTC')::DATE;
            v_today := (TIMEZONE('utc', NOW()))::DATE;

            IF v_booking_date < v_today THEN
                RAISE EXCEPTION 'PAST_DATE_ERROR: Cannot book slots in the past.';
            END IF;

            IF v_booking_date > (v_today + INTERVAL '30 days')::DATE THEN
                RAISE EXCEPTION 'WINDOW_LIMIT_EXCEEDED: Bookings are restricted to the next 30 days.';
            END IF;

            IF TRIM(p_student_name) = '' OR TRIM(p_student_roll) = '' OR TRIM(p_student_phone) = '' THEN
                RAISE EXCEPTION 'VALIDATION_ERROR: Student name, roll number, and phone number are required.';
            END IF;

            SELECT status, name, active_from_date INTO v_machine_status, v_machine_name, v_active_from_date
            FROM public.machines
            WHERE id = p_machine_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'MACHINE_NOT_FOUND: Machine #% does not exist.', p_machine_id;
            END IF;

            IF v_active_from_date IS NOT NULL AND v_booking_date < v_active_from_date THEN
                RAISE EXCEPTION 'MACHINE_NOT_STARTED: % is scheduled to start on %.', v_machine_name, v_active_from_date;
            END IF;

            IF v_machine_status = 'maintenance' THEN
                RAISE EXCEPTION 'MACHINE_MAINTENANCE: % is currently under maintenance. Please select another machine.', v_machine_name;
            END IF;

            IF v_machine_status = 'offline' THEN
                RAISE EXCEPTION 'MACHINE_OFFLINE: % is currently offline. Please select another machine.', v_machine_name;
            END IF;

            SELECT COUNT(*) INTO v_overlap_count
            FROM public.bookings
            WHERE machine_id = p_machine_id
              AND status != 'cancelled'
              AND tstzrange(start_time, end_time) && tstzrange(p_start_time, v_end_time);

            IF v_overlap_count > 0 THEN
                RAISE EXCEPTION 'SLOT_OVERLAP_ERROR: This machine is already booked for this 75-minute window.';
            END IF;

            v_reference_code := 'WM' || p_machine_id || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6));

            BEGIN
                INSERT INTO public.bookings (
                    machine_id,
                    student_name,
                    student_roll,
                    student_phone,
                    student_email,
                    booking_date,
                    start_time,
                    end_time,
                    status,
                    reference_code
                ) VALUES (
                    p_machine_id,
                    TRIM(p_student_name),
                    TRIM(p_student_roll),
                    TRIM(p_student_phone),
                    TRIM(p_student_email),
                    v_booking_date,
                    p_start_time,
                    v_end_time,
                    'confirmed',
                    v_reference_code
                )
                RETURNING id INTO v_new_booking_id;
            EXCEPTION
                WHEN exclusion_violation THEN
                    RAISE EXCEPTION 'SLOT_OVERLAP_ERROR: Concurrent booking conflict! Another student just booked this slot.';
            END;

            RETURN jsonb_build_object(
                'success', true,
                'booking_id', v_new_booking_id,
                'reference_code', v_reference_code,
                'machine_id', p_machine_id,
                'machine_name', v_machine_name,
                'student_name', TRIM(p_student_name),
                'booking_date', v_booking_date,
                'start_time', p_start_time,
                'end_time', v_end_time,
                'duration_minutes', 75,
                'message', 'Slot successfully booked for 75 minutes!'
            );
        END;
        $$;
    `);
    console.log('Created book_washing_machine RPC');

    // 3. Privacy-Preserving Slot Viewer
    await client.query(`
        CREATE OR REPLACE FUNCTION public.get_public_machine_slots(p_date DATE)
        RETURNS TABLE (
            id UUID,
            machine_id INT,
            booking_date DATE,
            start_time TIMESTAMPTZ,
            end_time TIMESTAMPTZ,
            status VARCHAR(20)
        )
        LANGUAGE sql
        SECURITY DEFINER
        STABLE
        AS $$
            SELECT 
                b.id,
                b.machine_id,
                b.booking_date,
                b.start_time,
                b.end_time,
                b.status
            FROM public.bookings b
            WHERE b.booking_date = p_date
              AND b.status != 'cancelled'
            ORDER BY b.start_time ASC;
        $$;
    `);
    console.log('Created get_public_machine_slots RPC');

    // 4. Student pass lookup
    await client.query(`
        CREATE OR REPLACE FUNCTION public.get_booking_by_ref(
            p_reference_code TEXT,
            p_phone TEXT
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        STABLE
        AS $$
        DECLARE
            v_result JSONB;
        BEGIN
            SELECT jsonb_build_object(
                'reference_code', b.reference_code,
                'machine_id', b.machine_id,
                'machine_name', m.name,
                'student_name', b.student_name,
                'student_roll', b.student_roll,
                'booking_date', b.booking_date,
                'start_time', b.start_time,
                'end_time', b.end_time,
                'status', b.status
            ) INTO v_result
            FROM public.bookings b
            JOIN public.machines m ON m.id = b.machine_id
            WHERE UPPER(b.reference_code) = UPPER(TRIM(p_reference_code))
              AND RIGHT(b.student_phone, 4) = RIGHT(TRIM(p_phone), 4);

            IF v_result IS NULL THEN
                RAISE EXCEPTION 'NOT_FOUND: No matching booking pass found for this reference code and phone number.';
            END IF;

            RETURN v_result;
        END;
        $$;
    `);
    console.log('Created get_booking_by_ref RPC');

    await client.end();
    console.log('All functions successfully deployed!');
}

deployFunctions().catch(console.error);
