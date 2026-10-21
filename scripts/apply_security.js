const { Client } = require('pg');

const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zhurgvwsaawacmukbvbi',
    password: 'Babasaheb@250',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function applySecurity() {
    await client.connect();
    console.log('Connected to DB for security hardening...');

    // 1. Audit Logs Table
    await client.query(`
        CREATE TABLE IF NOT EXISTS public.audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            action VARCHAR(60) NOT NULL,
            performed_by VARCHAR(120) NOT NULL,
            target_id TEXT,
            details JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
        );
    `);
    console.log('Verified audit_logs table');

    // 2. Constraints on bookings (75-minute duration & ordering)
    await client.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_exact_75_minutes') THEN
                ALTER TABLE public.bookings ADD CONSTRAINT check_exact_75_minutes CHECK (end_time = start_time + INTERVAL '75 minutes');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_time_ordering') THEN
                ALTER TABLE public.bookings ADD CONSTRAINT check_time_ordering CHECK (start_time < end_time);
            END IF;
        END $$;
    `);
    console.log('Verified 75-minute duration and time-ordering constraints');

    // 3. Admin Authorization Helper Function
    await client.query(`
        CREATE OR REPLACE FUNCTION public.is_admin()
        RETURNS BOOLEAN
        LANGUAGE sql
        SECURITY DEFINER
        STABLE
        AS $$
            SELECT (
                auth.role() = 'authenticated' AND (
                    EXISTS (
                        SELECT 1 FROM public.admin_profiles 
                        WHERE user_id = auth.uid() OR email = (auth.jwt() ->> 'email')
                    )
                )
            );
        $$;
    `);
    console.log('Created is_admin() security definer function');

    // 4. Privacy-Preserving Active Wash Cycles Viewer
    await client.query(`
        CREATE OR REPLACE FUNCTION public.get_public_active_cycles()
        RETURNS TABLE (
            id UUID,
            machine_id INT,
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
                b.start_time,
                b.end_time,
                b.status
            FROM public.bookings b
            WHERE b.status != 'cancelled'
              AND b.start_time <= TIMEZONE('utc', NOW())
              AND b.end_time >= TIMEZONE('utc', NOW());
        $$;
    `);
    console.log('Created get_public_active_cycles RPC');

    // 5. Update book_washing_machine with audit log logging
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
            -- Compute exact 75-minute end time
            v_end_time := p_start_time + INTERVAL '75 minutes';
            v_booking_date := (p_start_time AT TIME ZONE 'UTC')::DATE;
            v_today := (TIMEZONE('utc', NOW()))::DATE;

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

            -- Record Audit Log (without exposing raw phone or email in audit logs)
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
    console.log('Updated book_washing_machine with audit log');

    // 6. Restrictive Row Level Security (RLS) Policies
    console.log('Applying Restrictive RLS Policies...');

    // A. MACHINES: Public can view, only Admin can modify
    await client.query(`
        ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public can view machines" ON public.machines;
        DROP POLICY IF EXISTS "Public machines" ON public.machines;
        DROP POLICY IF EXISTS "Admins can update machines" ON public.machines;

        CREATE POLICY "Public can view machines"
            ON public.machines FOR SELECT
            TO anon, authenticated
            USING (true);

        CREATE POLICY "Admins can manage machines"
            ON public.machines FOR ALL
            TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    `);
    console.log('Secured public.machines RLS');

    // B. HOSTEL NOTICES: Public can view, only Admin can modify
    await client.query(`
        ALTER TABLE public.hostel_notices ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public can view notices" ON public.hostel_notices;
        DROP POLICY IF EXISTS "Public can update notices" ON public.hostel_notices;
        DROP POLICY IF EXISTS "Admins can manage notices" ON public.hostel_notices;

        CREATE POLICY "Public can view notices"
            ON public.hostel_notices FOR SELECT
            TO anon, authenticated
            USING (true);

        CREATE POLICY "Admins can manage notices"
            ON public.hostel_notices FOR ALL
            TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    `);
    console.log('Secured public.hostel_notices RLS');

    // C. ADMIN PROFILES: Only Admin can view/modify
    await client.query(`
        ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins can view admin_profiles" ON public.admin_profiles;
        DROP POLICY IF EXISTS "Admins can manage admin_profiles" ON public.admin_profiles;

        CREATE POLICY "Admins can view admin_profiles"
            ON public.admin_profiles FOR SELECT
            TO authenticated
            USING (public.is_admin());

        CREATE POLICY "Admins can manage admin_profiles"
            ON public.admin_profiles FOR ALL
            TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    `);
    console.log('Secured public.admin_profiles RLS');

    // D. AUDIT LOGS: Only Admin can view, system/authenticated can insert
    await client.query(`
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins can view audit_logs" ON public.audit_logs;
        DROP POLICY IF EXISTS "System can insert audit_logs" ON public.audit_logs;

        CREATE POLICY "Admins can view audit_logs"
            ON public.audit_logs FOR SELECT
            TO authenticated
            USING (public.is_admin());

        CREATE POLICY "System can insert audit_logs"
            ON public.audit_logs FOR INSERT
            TO anon, authenticated
            WITH CHECK (true);
    `);
    console.log('Secured public.audit_logs RLS');

    // E. BOOKINGS: Only Admin can SELECT/UPDATE/DELETE. Public uses SECURITY DEFINER RPCs.
    await client.query(`
        ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public bookings" ON public.bookings;
        DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
        DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;
        DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
        DROP POLICY IF EXISTS "Students can insert bookings" ON public.bookings;

        CREATE POLICY "Admins can view all bookings"
            ON public.bookings FOR SELECT
            TO authenticated
            USING (public.is_admin());

        CREATE POLICY "Admins can manage all bookings"
            ON public.bookings FOR ALL
            TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    `);
    console.log('Secured public.bookings RLS: Student personal info strictly shielded from public queries!');

    // 7. Add audit_logs to Realtime publication
    try {
        await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;');
        console.log('Added audit_logs to realtime');
    } catch (e) {
        console.log('Realtime publication note:', e.message);
    }

    await client.end();
    console.log('Security hardening database migration complete!');
}

applySecurity().catch(console.error);
