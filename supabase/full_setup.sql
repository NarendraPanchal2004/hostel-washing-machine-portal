-- ============================================================================
-- COMPLETE ALL-IN-ONE SUPABASE SETUP SCRIPT FOR HOSTEL WASHING MACHINE APP
-- Run this entire script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ============================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Create Machines Table
CREATE TABLE IF NOT EXISTS public.machines (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    capacity_kg NUMERIC(3,1) NOT NULL DEFAULT 8.0,
    status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'in_use', 'maintenance', 'offline')),
    photo_url TEXT DEFAULT NULL,
    location VARCHAR(120) DEFAULT 'Hostel Laundry Room, Ground Floor',
    instructions TEXT DEFAULT 'Use HE detergent. Maximum 1 pod per load. Clean lint filter after wash.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Create Bookings Table with Exclusion Constraint
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id INT NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    student_name VARCHAR(100) NOT NULL,
    student_roll VARCHAR(50) NOT NULL,
    student_phone VARCHAR(20) NOT NULL,
    student_email VARCHAR(120) NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'in_progress', 'completed', 'cancelled')),
    reference_code VARCHAR(30) NOT NULL UNIQUE,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    
    -- Constraint A: End time must be exactly 75 minutes after start time
    CONSTRAINT check_exact_75_minutes CHECK (end_time = start_time + INTERVAL '75 minutes'),
    
    -- Constraint B: Start time must precede end time
    CONSTRAINT check_time_ordering CHECK (start_time < end_time),
    
    -- Constraint C: CRITICAL OVERLAP CONSTRAINT (PostgreSQL btree_gist)
    CONSTRAINT prevent_overlapping_machine_bookings 
        EXCLUDE USING gist (
            machine_id WITH =,
            tstzrange(start_time, end_time) WITH &&
        ) WHERE (status != 'cancelled')
);

-- 4. Create Admin Profiles Table
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(120) NOT NULL UNIQUE,
    full_name VARCHAR(100) DEFAULT 'Hostel Warden / Laundry Manager',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Seed designated admin profile
INSERT INTO public.admin_profiles (email, full_name)
VALUES 
    ('7447642019@hostel.edu', 'Hostel Laundry In-Charge (7447642019)'),
    ('admin@hostel.edu', 'Hostel Warden / Laundry Manager')
ON CONFLICT (email) DO NOTHING;

-- 5. Helper Function: Check Admin Permission
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        (auth.role() = 'authenticated') AND (
            EXISTS (
                SELECT 1 FROM public.admin_profiles 
                WHERE user_id = auth.uid() OR email = (auth.jwt() ->> 'email')
            )
            -- Fallback: If no admin profiles are registered yet, allow any authenticated user
            OR NOT EXISTS (SELECT 1 FROM public.admin_profiles)
        );
$$;

-- 6. Row Level Security (RLS) Policies
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view machines" ON public.machines;
CREATE POLICY "Public can view machines"
    ON public.machines FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can update machines" ON public.machines;
CREATE POLICY "Admins can update machines"
    ON public.machines FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings"
    ON public.bookings FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;
CREATE POLICY "Admins can manage bookings"
    ON public.bookings FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Students can insert bookings" ON public.bookings;
CREATE POLICY "Students can insert bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (
        booking_date >= (TIMEZONE('utc', NOW()))::DATE
        AND booking_date <= ((TIMEZONE('utc', NOW()))::DATE + INTERVAL '6 days')::DATE
        AND EXISTS (
            SELECT 1 FROM public.machines 
            WHERE id = machine_id AND status != 'offline' AND status != 'maintenance'
        )
    );

-- 7. Realtime Replication Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.machines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- 8. Fast Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_machine_date ON public.bookings (machine_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON public.bookings (start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_ref_code ON public.bookings (reference_code);

-- 9. Server-Side Atomic Booking Procedure
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
    -- 1. Compute 75-minute end time
    v_end_time := p_start_time + INTERVAL '75 minutes';
    
    -- 2. Determine booking date
    v_booking_date := (p_start_time AT TIME ZONE 'UTC')::DATE;
    v_today := (TIMEZONE('utc', NOW()))::DATE;

    -- 3. Window Validation: Today and next 6 days
    IF v_booking_date < v_today THEN
        RAISE EXCEPTION 'PAST_DATE_ERROR: Cannot book slots in the past.';
    END IF;

    IF v_booking_date > (v_today + INTERVAL '6 days')::DATE THEN
        RAISE EXCEPTION 'WINDOW_LIMIT_EXCEEDED: Bookings are restricted to today and the next 6 days.';
    END IF;

    -- 4. Validate Student Details
    IF TRIM(p_student_name) = '' OR TRIM(p_student_roll) = '' OR TRIM(p_student_phone) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Student name, roll number, and phone number are required.';
    END IF;

    -- 5. Machine Status Check
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

    -- 6. Server-Side Atomic Overlap Check
    SELECT COUNT(*) INTO v_overlap_count
    FROM public.bookings
    WHERE machine_id = p_machine_id
      AND status != 'cancelled'
      AND tstzrange(start_time, end_time) && tstzrange(p_start_time, v_end_time);

    IF v_overlap_count > 0 THEN
        RAISE EXCEPTION 'SLOT_OVERLAP_ERROR: This machine is already booked for this 75-minute window.';
    END IF;

    -- 7. Generate Reference Code
    v_reference_code := 'WM' || p_machine_id || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6));

    -- 8. Insert Booking with DB Exclusion Constraint Protection
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

    -- 9. Return structured JSON
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

-- 10. Privacy-Preserving Slot Viewer for Students
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

-- 11. Student Lookup Own Booking Pass
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

-- 12. Seed 4 Washing Machines
INSERT INTO public.machines (id, name, model, capacity_kg, status, location, photo_url, instructions)
VALUES
(
    1, 
    'Machine 1 (Bay 1)', 
    'LG Commercial AI Direct Drive 9.0 Kg', 
    9.0, 
    'available', 
    'Laundry Hall (Ground Floor, Bay 1)',
    'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80',
    'Heavy 9 Kg Load. Best for cottons, bedsheets, and daily laundry. Quick Wash: 15m, Normal: 45m, Heavy/Allergy: 75m.'
),
(
    2, 
    'Machine 2 (Bay 2)', 
    'Samsung Inverter Eco Drum 9.0 Kg', 
    9.0, 
    'available', 
    'Laundry Hall (Ground Floor, Bay 2)',
    'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=800&q=80',
    'Heavy 9 Kg Load. High-speed wash with tangle-free drum. Suitable for sportswear and bulk wash.'
),
(
    3, 
    'Machine 3 (Bay 3)', 
    'Bosch Serie 6 VarioDrum 9.0 Kg', 
    9.0, 
    'available', 
    'Laundry Hall (Ground Floor, Bay 3)',
    'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=800&q=80',
    'Heavy 9 Kg Load. Ultra-quiet brushless motor with anti-vibration walls. Great for study hours and evening laundry.'
),
(
    4, 
    'Machine 4 (Bay 4)', 
    'IFB Senator Heavy Steam Pro 9.0 Kg', 
    9.0, 
    'available', 
    'Laundry Hall (Ground Floor, Bay 4)',
    'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
    'Heavy 9 Kg Load. Steam allergy care. Recommended for winter jackets, curtains, blankets, and hoodies.'
)
ON CONFLICT (id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    model = EXCLUDED.model,
    capacity_kg = EXCLUDED.capacity_kg,
    location = EXCLUDED.location,
    instructions = EXCLUDED.instructions;
