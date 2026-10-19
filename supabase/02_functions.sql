-- ============================================================================
-- Hostel Washing Machine Booking System - Supabase Server-Side Functions (RPC)
-- ============================================================================
-- Features:
-- 1. Atomic booking function with strict overlap protection.
-- 2. 75-minute duration and 7-day rolling window server validation.
-- 3. Student privacy preserving slot-querying RPC (zero leakage of personal info).
-- ============================================================================

-- Function 1: Secure Server-Side Atomic Booking
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
    v_reference_code TEXT;
    v_new_booking_id UUID;
    v_overlap_count INT;
BEGIN
    -- 1. Compute exact 75-minute end time
    v_end_time := p_start_time + INTERVAL '75 minutes';
    
    -- 2. Determine booking date in UTC
    v_booking_date := (p_start_time AT TIME ZONE 'UTC')::DATE;
    v_today := (TIMEZONE('utc', NOW()))::DATE;

    -- 3. Validation: Booking window must be Today through Today + 6 Days
    IF v_booking_date < v_today THEN
        RAISE EXCEPTION 'PAST_DATE_ERROR: Cannot book slots in the past.';
    END IF;

    IF v_booking_date > (v_today + INTERVAL '6 days')::DATE THEN
        RAISE EXCEPTION 'WINDOW_LIMIT_EXCEEDED: Bookings are restricted to today and the next 6 days.';
    END IF;

    -- 4. Validation: Student contact info cannot be empty
    IF TRIM(p_student_name) = '' OR TRIM(p_student_roll) = '' OR TRIM(p_student_phone) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Student name, roll number, and phone number are required.';
    END IF;

    -- 5. Validation: Machine existence and operational status
    SELECT status, name INTO v_machine_status, v_machine_name
    FROM public.machines
    WHERE id = p_machine_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'MACHINE_NOT_FOUND: Machine #% does not exist.', p_machine_id;
    END IF;

    IF v_machine_status = 'maintenance' THEN
        RAISE EXCEPTION 'MACHINE_MAINTENANCE: % is currently under maintenance. Please select another machine.', v_machine_name;
    END IF;

    IF v_machine_status = 'offline' THEN
        RAISE EXCEPTION 'MACHINE_OFFLINE: % is currently offline. Please select another machine.', v_machine_name;
    END IF;

    -- 6. Server-Side Atomic Overlap Check (in addition to DB Exclusion Constraint)
    SELECT COUNT(*) INTO v_overlap_count
    FROM public.bookings
    WHERE machine_id = p_machine_id
      AND status != 'cancelled'
      AND tstzrange(start_time, end_time) && tstzrange(p_start_time, v_end_time);

    IF v_overlap_count > 0 THEN
        RAISE EXCEPTION 'SLOT_OVERLAP_ERROR: This machine is already booked for this 75-minute window or an overlapping slot.';
    END IF;

    -- 7. Generate a unique, user-friendly Reference Code (e.g. WM1-784920)
    v_reference_code := 'WM' || p_machine_id || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6));

    -- 8. Insert the booking into database (Exclusion constraint will double-verify)
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

    -- 9. Return structured success JSON response
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


-- Function 2: Privacy-Preserving Slot Viewer for Students
-- Explicitly strips out private phone numbers, emails, and student roll numbers
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


-- Function 3: Student View Own Booking Pass by Reference Code
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
