const { Client } = require('pg');

const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zhurgvwsaawacmukbvbi',
    password: 'Babasaheb@250',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function applySlotManagement() {
    await client.connect();
    console.log('Connected to PostgreSQL database...');

    // 1. Create slot_overrides table
    await client.query(`
        CREATE TABLE IF NOT EXISTS public.slot_overrides (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slot_date DATE NOT NULL,
            slot_start VARCHAR(10) NOT NULL,
            machine_id INT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
            is_disabled BOOLEAN NOT NULL DEFAULT true,
            reason TEXT DEFAULT 'Slot disabled by hostel administrator',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            updated_by TEXT DEFAULT 'admin'
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_slot_overrides_unique 
        ON public.slot_overrides (slot_date, slot_start, COALESCE(machine_id, 0));

        ALTER TABLE public.slot_overrides ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Public can view slot overrides" ON public.slot_overrides;
        CREATE POLICY "Public can view slot overrides" ON public.slot_overrides
            FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Admins can manage slot overrides" ON public.slot_overrides;
        CREATE POLICY "Admins can manage slot overrides" ON public.slot_overrides
            FOR ALL TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    `);
    console.log('Created public.slot_overrides table with RLS');

    // 2. Update book_washing_machine RPC to check disabled slots and support operational booking_date
    await client.query(`
        CREATE OR REPLACE FUNCTION public.book_washing_machine(
            p_machine_id INT,
            p_student_name TEXT,
            p_student_roll TEXT,
            p_student_phone TEXT,
            p_student_email TEXT,
            p_start_time TIMESTAMPTZ,
            p_booking_date DATE DEFAULT NULL
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
            v_slot_start_str TEXT;
        BEGIN
            -- Compute exact 75-minute end time
            v_end_time := p_start_time + INTERVAL '75 minutes';

            -- Determine operational booking date
            IF p_booking_date IS NOT NULL THEN
                v_booking_date := p_booking_date;
            ELSE
                v_booking_date := (p_start_time AT TIME ZONE 'Asia/Kolkata')::DATE;
            END IF;

            v_today := (TIMEZONE('Asia/Kolkata', NOW()))::DATE;

            -- Past date check
            IF v_booking_date < v_today THEN
                RAISE EXCEPTION 'PAST_DATE_ERROR: Cannot book slots in the past.';
            END IF;

            -- Window limit check (rolling 30 days)
            IF v_booking_date > (v_today + INTERVAL '30 days')::DATE THEN
                RAISE EXCEPTION 'WINDOW_LIMIT_EXCEEDED: Bookings are restricted to the next 30 days.';
            END IF;

            -- Required student field validation
            IF TRIM(p_student_name) = '' OR TRIM(p_student_roll) = '' OR TRIM(p_student_phone) = '' THEN
                RAISE EXCEPTION 'VALIDATION_ERROR: Student name, roll number, and phone number are required.';
            END IF;

            -- Phone format validation
            IF LENGTH(REGEXP_REPLACE(p_student_phone, '\\D', '', 'g')) < 10 THEN
                RAISE EXCEPTION 'VALIDATION_ERROR: A valid 10-digit phone number is required.';
            END IF;

            -- Machine status check
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

            -- Check if slot is disabled by hostel administrator
            v_slot_start_str := TO_CHAR(p_start_time AT TIME ZONE 'Asia/Kolkata', 'HH24:MI');
            IF EXISTS (
                SELECT 1 FROM public.slot_overrides
                WHERE slot_date = v_booking_date
                  AND slot_start = v_slot_start_str
                  AND (machine_id IS NULL OR machine_id = p_machine_id)
                  AND is_disabled = true
            ) THEN
                RAISE EXCEPTION 'SLOT_DISABLED_BY_ADMIN: This slot has been disabled by the hostel administrator.';
            END IF;

            -- Overlap count check (redundant server-side validation)
            SELECT COUNT(*) INTO v_overlap_count
            FROM public.bookings
            WHERE machine_id = p_machine_id
              AND status != 'cancelled'
              AND tstzrange(start_time, end_time) && tstzrange(p_start_time, v_end_time);

            IF v_overlap_count > 0 THEN
                RAISE EXCEPTION 'SLOT_OVERLAP_ERROR: This machine is already booked for this 75-minute window.';
            END IF;

            -- Unique Reference Code
            v_reference_code := 'WM' || p_machine_id || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6));

            -- Exclusion constraint-protected insertion
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
                    TRIM(COALESCE(p_student_email, '')),
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

            -- Record Audit Log
            INSERT INTO public.audit_logs (action, performed_by, target_id, details)
            VALUES (
                'BOOKING_CREATED',
                'student',
                v_reference_code,
                jsonb_build_object(
                    'machine_id', p_machine_id,
                    'booking_date', v_booking_date,
                    'duration_minutes', 75,
                    'reference_code', v_reference_code
                )
            );

            RETURN jsonb_build_object(
                'success', true,
                'booking_id', v_new_booking_id,
                'reference_code', v_reference_code,
                'message', 'Slot successfully booked for 75 minutes!'
            );
        END;
        $$;
    `);
    console.log('Updated public.book_washing_machine RPC with slot override checks');

    // 3. Update get_public_machine_slots RPC to cover late night extension
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
            WHERE (b.booking_date = p_date OR (b.start_time >= (p_date::TEXT || ' 00:00:00+05:30')::TIMESTAMPTZ AND b.start_time < ((p_date + 1)::TEXT || ' 04:00:00+05:30')::TIMESTAMPTZ))
              AND b.status != 'cancelled'
            ORDER BY b.start_time ASC;
        $$;
    `);
    console.log('Updated public.get_public_machine_slots RPC');

    await client.end();
    console.log('Database migration completed successfully!');
}

applySlotManagement().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
