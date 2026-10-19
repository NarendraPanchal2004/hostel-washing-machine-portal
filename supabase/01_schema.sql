-- ============================================================================
-- Hostel Washing Machine Booking System - Supabase PostgreSQL Schema
-- ============================================================================
-- Features:
-- 1. 4 Washing Machines connected to a single database.
-- 2. Strict 75-minute slot constraints.
-- 3. PostgreSQL btree_gist EXCLUSION constraint preventing overlapping bookings.
-- 4. Row Level Security (RLS) protecting student private data.
-- 5. Realtime replication enabled.
-- ============================================================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Step 2: Create machines table
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

-- Step 3: Create bookings table with exclusion constraint
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
    
    -- Constraint C: CRITICAL OVERLAP CONSTRAINT
    -- Prevents any two active bookings from overlapping on the same machine
    CONSTRAINT prevent_overlapping_machine_bookings 
        EXCLUDE USING gist (
            machine_id WITH =,
            tstzrange(start_time, end_time) WITH &&
        ) WHERE (status != 'cancelled')
);

-- Step 4: Create admin_profiles table for authorized admin emails
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(120) NOT NULL UNIQUE,
    full_name VARCHAR(100) DEFAULT 'Hostel Warden / Laundry Manager',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Step 5: Helper function to determine if caller is an authenticated admin
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
            -- Or fallback: any authenticated user in auth.users if admin_profiles is empty
            OR NOT EXISTS (SELECT 1 FROM public.admin_profiles)
        );
$$;

-- Step 6: Row Level Security (RLS) Configuration

-- Enable RLS on machines
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- Anyone (including students/guests) can view machines
DROP POLICY IF EXISTS "Public can view machines" ON public.machines;
CREATE POLICY "Public can view machines"
    ON public.machines
    FOR SELECT
    USING (true);

-- Only authenticated admins can modify machine status or info
DROP POLICY IF EXISTS "Admins can update machines" ON public.machines;
CREATE POLICY "Admins can update machines"
    ON public.machines
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Admins can view all bookings (including student phone & email)
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Admins can update/cancel/delete bookings
DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;
CREATE POLICY "Admins can manage bookings"
    ON public.bookings
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Public / Students can insert bookings (with server-side validation)
DROP POLICY IF EXISTS "Students can insert bookings" ON public.bookings;
CREATE POLICY "Students can insert bookings"
    ON public.bookings
    FOR INSERT
    WITH CHECK (
        -- Can only book for today and next 6 days
        booking_date >= (TIMEZONE('utc', NOW()))::DATE
        AND booking_date <= ((TIMEZONE('utc', NOW()))::DATE + INTERVAL '6 days')::DATE
        -- Machine must be available
        AND EXISTS (
            SELECT 1 FROM public.machines 
            WHERE id = machine_id AND status != 'offline' AND status != 'maintenance'
        )
    );

-- Step 7: Enable Supabase Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.machines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Create Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_bookings_machine_date ON public.bookings (machine_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON public.bookings (start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_ref_code ON public.bookings (reference_code);
