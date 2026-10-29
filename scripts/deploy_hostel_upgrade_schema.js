const { Client } = require('pg');

const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zhurgvwsaawacmukbvbi',
    password: 'Babasaheb@250',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

const migrationSQL = `
-- ============================================================
-- 1. EXTENSIONS & DISTANCE HELPER
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Distance calculation using Haversine formula (meters)
CREATE OR REPLACE FUNCTION public.calculate_distance_meters(
    lat1 double precision, lon1 double precision,
    lat2 double precision, lon2 double precision
) RETURNS double precision AS $$
DECLARE
    r double precision := 6371000.0; -- Earth radius in meters
    phi1 double precision;
    phi2 double precision;
    delta_phi double precision;
    delta_lambda double precision;
    a double precision;
    c double precision;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN 99999999.0;
    END IF;
    phi1 := radians(lat1);
    phi2 := radians(lat2);
    delta_phi := radians(lat2 - lat1);
    delta_lambda := radians(lon2 - lon1);
    a := sin(delta_phi/2.0)^2 + cos(phi1) * cos(phi2) * sin(delta_lambda/2.0)^2;
    c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
    RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 2. HOSTEL SETTINGS & GEOFENCE CONFIGURATION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hostel_settings (
    id integer PRIMARY KEY DEFAULT 1,
    hostel_name character varying DEFAULT 'Hostel Laundry & Residential Campus',
    latitude double precision NOT NULL DEFAULT 19.8762,
    longitude double precision NOT NULL DEFAULT 75.3433,
    geofence_radius_meters integer NOT NULL DEFAULT 100,
    geofence_enforced boolean NOT NULL DEFAULT true,
    morning_checkin_start time DEFAULT '06:00:00',
    morning_checkin_end time DEFAULT '08:30:00',
    mess_breakfast_deadline time DEFAULT '08:00:00',
    mess_lunch_deadline time DEFAULT '11:00:00',
    mess_dinner_deadline time DEFAULT '18:00:00',
    mess_special_days character varying[] DEFAULT ARRAY['Wednesday', 'Sunday'],
    emergency_contacts jsonb DEFAULT '[
        {"name": "Hostel Warden Office", "phone": "7447642019", "role": "Warden In-Charge"},
        {"name": "Security Main Gate", "phone": "9404673711", "role": "Campus Security"},
        {"name": "Campus Medical Officer", "phone": "108", "role": "Ambulance / Emergency"},
        {"name": "Chief Hostel Rector", "phone": "9168154088", "role": "Rector"}
    ]'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by text
);

-- Seed default row if not present
INSERT INTO public.hostel_settings (id, hostel_name, latitude, longitude, geofence_radius_meters, geofence_enforced)
VALUES (1, 'Hostel Laundry & Residential Campus', 19.8762, 75.3433, 100, true)
ON CONFLICT (id) DO NOTHING;

-- Verification function for location
CREATE OR REPLACE FUNCTION public.verify_hostel_location(
    p_lat double precision,
    p_lng double precision,
    p_accuracy double precision DEFAULT 50.0
) RETURNS jsonb AS $$
DECLARE
    settings_rec RECORD;
    dist_m double precision;
BEGIN
    SELECT * INTO settings_rec FROM public.hostel_settings WHERE id = 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('allowed', true, 'distance', 0, 'reason', 'No settings found');
    END IF;

    -- If geofence is disabled by admin, allow
    IF settings_rec.geofence_enforced = false THEN
        RETURN jsonb_build_object('allowed', true, 'distance', 0, 'reason', 'Geofence enforcement paused by Admin');
    END IF;

    IF p_lat IS NULL OR p_lng IS NULL THEN
        RAISE EXCEPTION 'LOCATION_REQUIRED: GPS coordinates must be provided for protected hostel operations.';
    END IF;

    IF p_accuracy IS NOT NULL AND p_accuracy > 250.0 THEN
        RAISE EXCEPTION 'LOCATION_INACCURATE: GPS accuracy is too poor (%m). Please enable High Accuracy GPS and retry.', round(p_accuracy::numeric, 1);
    END IF;

    dist_m := public.calculate_distance_meters(p_lat, p_lng, settings_rec.latitude, settings_rec.longitude);

    IF dist_m > (settings_rec.geofence_radius_meters + coalesce(p_accuracy, 0.0) * 0.5) THEN
        RAISE EXCEPTION 'GEOFENCE_OUTSIDE: You are outside the hostel area (%m away, allowed radius is %m). Hostel facilities are unavailable.', 
            round(dist_m::numeric, 1), settings_rec.geofence_radius_meters;
    END IF;

    RETURN jsonb_build_object('allowed', true, 'distance', round(dist_m::numeric, 1));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. USER PROFILES & RBAC
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    email character varying NOT NULL UNIQUE,
    full_name character varying NOT NULL,
    role character varying NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'warden', 'admin', 'security', 'mess_staff', 'lab_staff')),
    student_roll character varying,
    room_no character varying,
    phone character varying,
    hostel_block character varying DEFAULT 'A Block',
    is_verified boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_roll ON public.user_profiles(student_roll);

-- Helper functions for RBAC
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS character varying AS $$
DECLARE
    r character varying;
BEGIN
    IF auth.role() = 'authenticated' THEN
        SELECT role INTO r FROM public.user_profiles WHERE user_id = auth.uid() OR email = (auth.jwt() ->> 'email');
        IF r IS NOT NULL THEN
            RETURN r;
        END IF;
        -- Fallback: check admin_profiles
        IF EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid() OR email = (auth.jwt() ->> 'email')) THEN
            RETURN 'admin';
        END IF;
    END IF;
    RETURN 'anonymous';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Updated is_admin function (checks admin_profiles, user_profiles, or superadmin email)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT (
        auth.role() = 'authenticated' AND (
            (auth.jwt() ->> 'email') = 'narendrapanchal8114@gmail.com'
            OR EXISTS (
                SELECT 1 FROM public.admin_profiles 
                WHERE user_id = auth.uid() OR email = (auth.jwt() ->> 'email')
            )
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE (user_id = auth.uid() OR email = (auth.jwt() ->> 'email')) AND role IN ('admin', 'warden')
            )
        )
    );
$$;

-- Migrate existing admins into user_profiles
INSERT INTO public.user_profiles (user_id, email, full_name, role, phone)
SELECT 
    CASE WHEN ap.user_id IN (SELECT id FROM auth.users) THEN ap.user_id ELSE NULL END,
    ap.email, 
    ap.full_name, 
    'admin', 
    '7447642019'
FROM public.admin_profiles ap
ON CONFLICT (email) DO UPDATE SET 
    user_id = COALESCE(EXCLUDED.user_id, public.user_profiles.user_id),
    role = 'admin';

-- ============================================================
-- 4. FACILITY QR TOKENS (Rotating/Expiry + Replay Protection)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.facility_qr_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_type character varying NOT NULL,
    token_hash text NOT NULL UNIQUE,
    plain_token_preview text,
    label character varying NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    is_active boolean DEFAULT true,
    used_count integer DEFAULT 0,
    max_uses integer DEFAULT 1000
);

-- ============================================================
-- 5. GATE ENTRY & EXIT MANAGEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gate_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    student_name character varying NOT NULL,
    student_roll character varying NOT NULL,
    action character varying NOT NULL CHECK (action IN ('entry', 'exit')),
    timestamp timestamp with time zone DEFAULT now(),
    gate_name character varying DEFAULT 'Main Campus Gate',
    location_lat double precision,
    location_lng double precision,
    distance_meters double precision,
    status character varying DEFAULT 'verified' CHECK (status IN ('verified', 'flagged', 'manual')),
    qr_token_hash text,
    security_guard_id uuid,
    security_remarks text
);

CREATE INDEX IF NOT EXISTS idx_gate_logs_timestamp ON public.gate_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gate_logs_student ON public.gate_logs(student_roll);

-- ============================================================
-- 6. MESS MANAGEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mess_menus (
    id serial PRIMARY KEY,
    day_of_week character varying NOT NULL UNIQUE,
    breakfast_menu text NOT NULL,
    lunch_menu text NOT NULL,
    dinner_menu text NOT NULL,
    is_special_day boolean DEFAULT false,
    special_dish text,
    updated_at timestamp with time zone DEFAULT now()
);

-- Seed standard weekly mess menu
INSERT INTO public.mess_menus (day_of_week, breakfast_menu, lunch_menu, dinner_menu, is_special_day, special_dish)
VALUES
('Monday', 'Pohe, Tea / Milk, Banana', 'Dal Tadka, Rice, Chapati, Matki Usal, Salad', 'Paneer Bhurji / Veg Kadhai, Chapati, Dal, Rice', false, NULL),
('Tuesday', 'Upma, Sheera, Tea / Coffee', 'Rajma Masala, Jeera Rice, Chapati, Mix Veg', 'Chole Bhature, Pulao, Curd, Pickle', false, NULL),
('Wednesday', 'Idli Sambhar, Chutney, Tea', 'Aloo Gobi, Dal Fry, Rice, Phulka', 'Special Chicken Curry (Non-Veg) / Shahi Paneer (Veg), Gulab Jamun, Jeera Rice', true, 'Chicken Curry / Shahi Paneer & Gulab Jamun'),
('Thursday', 'Medu Vada, Sambhar, Tea / Milk', 'Kadhi Pakoda, Khichdi, Chapati, Baingan Bharta', 'Veg Biryani, Boondi Raita, Chapati, Moong Dal', false, NULL),
('Friday', 'Poha, Sprouts Usal, Tea', 'Chole Curry, Rice, Puri / Chapati, Cabbage Sabji', 'Egg Curry (Non-Veg) / Dal Makhani (Veg), Jeera Rice, Tandoori Roti', false, 'Egg Curry / Dal Makhani'),
('Saturday', 'Uttapam, Coconut Chutney, Coffee', 'Veg Pulao, Dal Palak, Chapati, Aloo Jeera', 'Sev Bhaji, Chapati, Dal Fry, Steamed Rice, Papad', false, NULL),
('Sunday', 'Misal Pav, Farsan, Tea', 'Masala Bhat, Matar Paneer, Puri, Shrikhand, Dal Fry', 'Special Mutton Curry / Chicken Biryani (Non-Veg) / Paneer Tikka Masala (Veg), Ice Cream', true, 'Hostel Sunday Grand Feast')
ON CONFLICT (day_of_week) DO UPDATE SET
    breakfast_menu = EXCLUDED.breakfast_menu,
    lunch_menu = EXCLUDED.lunch_menu,
    dinner_menu = EXCLUDED.dinner_menu,
    is_special_day = EXCLUDED.is_special_day,
    special_dish = EXCLUDED.special_dish;

-- Student Daily Meal Choice (Veg vs Non-Veg vs Skip)
CREATE TABLE IF NOT EXISTS public.mess_choices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    student_roll character varying NOT NULL,
    meal_date date NOT NULL,
    meal_type character varying NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
    diet_choice character varying NOT NULL CHECK (diet_choice IN ('veg', 'non_veg', 'skip')),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_student_meal_choice UNIQUE (student_id, meal_date, meal_type)
);

CREATE INDEX IF NOT EXISTS idx_mess_choices_date ON public.mess_choices(meal_date, meal_type);

-- Mess Attendance (Verified via QR at Mess Hall)
CREATE TABLE IF NOT EXISTS public.mess_attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    student_roll character varying NOT NULL,
    meal_date date NOT NULL,
    meal_type character varying NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    diet_served character varying DEFAULT 'veg',
    marked_at timestamp with time zone DEFAULT now(),
    location_lat double precision,
    location_lng double precision,
    qr_token_hash text,
    CONSTRAINT unique_mess_attendance_record UNIQUE (student_id, meal_date, meal_type)
);

CREATE INDEX IF NOT EXISTS idx_mess_attendance_date ON public.mess_attendance(meal_date, meal_type);

-- ============================================================
-- 7. MORNING ATTENDANCE & REMINDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.morning_attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    student_roll character varying NOT NULL,
    student_name character varying NOT NULL,
    room_no character varying,
    attendance_date date NOT NULL,
    checkin_time timestamp with time zone DEFAULT now(),
    status character varying NOT NULL CHECK (status IN ('on_time', 'late', 'absent')),
    location_lat double precision,
    location_lng double precision,
    distance_meters double precision,
    verified_by text DEFAULT 'gps_geofence',
    CONSTRAINT unique_morning_attendance UNIQUE (student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_morning_attendance_date ON public.morning_attendance(attendance_date DESC);

-- ============================================================
-- 8. SPORTS MANAGEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sports_facilities (
    id serial PRIMARY KEY,
    name character varying NOT NULL,
    sport_type character varying NOT NULL,
    capacity integer NOT NULL DEFAULT 10,
    open_time time DEFAULT '06:00:00',
    close_time time DEFAULT '21:30:00',
    is_active boolean DEFAULT true,
    rules text
);

INSERT INTO public.sports_facilities (id, name, sport_type, capacity, rules)
VALUES
(1, 'Hostel Cricket Ground', 'cricket', 22, 'Strictly rubber/leather ball with safety gear. Max 2 hours per team slot.'),
(2, 'Badminton Court 1 (Indoor)', 'badminton', 4, 'Non-marking shoes mandatory. 45-min match slots.'),
(3, 'Volleyball Court', 'volleyball', 12, 'Proper sports attire required. 60-min slots.'),
(4, 'Kabaddi Ground (Sand Bay)', 'kabaddi', 14, 'Hostel league rules apply. Warm up mandatory.'),
(5, 'Table Tennis Room', 'table_tennis', 4, 'Hostel TT bat issue available at sports desk.')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sports_equipment (
    id serial PRIMARY KEY,
    facility_id integer REFERENCES public.sports_facilities(id),
    name character varying NOT NULL,
    sport_type character varying NOT NULL,
    total_qty integer NOT NULL DEFAULT 5,
    available_qty integer NOT NULL DEFAULT 5
);

INSERT INTO public.sports_equipment (id, facility_id, name, sport_type, total_qty, available_qty)
VALUES
(1, 1, 'Cricket Bat (Kashmir Willow)', 'cricket', 6, 6),
(2, 1, 'Cricket Leather Ball', 'cricket', 10, 10),
(3, 1, 'Cricket Stumps Set', 'cricket', 4, 4),
(4, 2, 'Badminton Racket (Yonex Carbon)', 'badminton', 8, 8),
(5, 2, 'Feather Shuttlecocks Box', 'badminton', 12, 12),
(6, 3, 'Cosco Volleyball Super Volley', 'volleyball', 5, 5),
(7, 5, 'Stag TT Rackets & Balls', 'table_tennis', 6, 6)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sports_bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id integer REFERENCES public.sports_facilities(id) ON DELETE CASCADE,
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    student_name character varying NOT NULL,
    student_roll character varying NOT NULL,
    booking_date date NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status character varying DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    team_name character varying,
    players_count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sports_bookings_date ON public.sports_bookings(facility_id, booking_date);

CREATE TABLE IF NOT EXISTS public.sports_equipment_loans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id integer REFERENCES public.sports_equipment(id) ON DELETE CASCADE,
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    student_name character varying NOT NULL,
    student_roll character varying NOT NULL,
    issued_at timestamp with time zone DEFAULT now(),
    returned_at timestamp with time zone,
    status character varying DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'damaged')),
    staff_remarks text
);

-- ============================================================
-- 9. LABORATORY MANAGEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lab_facilities (
    id serial PRIMARY KEY,
    name character varying NOT NULL,
    department character varying NOT NULL,
    capacity integer NOT NULL DEFAULT 30,
    open_hours character varying DEFAULT '08:00 AM - 08:00 PM',
    is_active boolean DEFAULT true
);

INSERT INTO public.lab_facilities (id, name, department, capacity)
VALUES
(1, 'Hostel Computer Center & Programming Lab', 'Computer Engg', 40),
(2, 'Electronics & IoT Innovation Lab', 'Electronics & Telecomm', 25),
(3, 'Applied Physics & Chemistry Research Lab', 'Applied Science', 30)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.lab_attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id integer REFERENCES public.lab_facilities(id) ON DELETE CASCADE,
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    student_name character varying NOT NULL,
    student_roll character varying NOT NULL,
    entry_time timestamp with time zone DEFAULT now(),
    exit_time timestamp with time zone,
    purpose text,
    qr_token_hash text
);

CREATE INDEX IF NOT EXISTS idx_lab_attendance_student ON public.lab_attendance(student_roll, entry_time DESC);

CREATE TABLE IF NOT EXISTS public.lab_equipment_loans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id integer REFERENCES public.lab_facilities(id) ON DELETE CASCADE,
    equipment_name character varying NOT NULL,
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    student_name character varying NOT NULL,
    student_roll character varying NOT NULL,
    issued_at timestamp with time zone DEFAULT now(),
    returned_at timestamp with time zone,
    status character varying DEFAULT 'in_use' CHECK (status IN ('in_use', 'returned', 'damaged')),
    staff_remarks text
);

CREATE TABLE IF NOT EXISTS public.lab_complaints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id integer REFERENCES public.lab_facilities(id) ON DELETE CASCADE,
    equipment_or_pc text NOT NULL,
    issue_description text NOT NULL,
    reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reporter_name character varying NOT NULL,
    status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- 10. LEAVE APPLICATIONS & MAINTENANCE COMPLAINTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leave_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    student_name character varying NOT NULL,
    student_roll character varying NOT NULL,
    room_no character varying NOT NULL,
    parent_phone character varying NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text NOT NULL,
    destination text NOT NULL,
    status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewer_comments text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_student ON public.leave_applications(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_status ON public.leave_applications(status);

CREATE TABLE IF NOT EXISTS public.hostel_complaints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    student_name character varying NOT NULL,
    student_roll character varying NOT NULL,
    room_no character varying NOT NULL,
    category character varying NOT NULL CHECK (category IN ('water', 'electricity', 'wifi', 'cleanliness', 'furniture', 'plumbing', 'other')),
    title character varying NOT NULL,
    description text NOT NULL,
    photo_url text,
    status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
    assigned_to text,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_complaints_student ON public.hostel_complaints(student_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.hostel_complaints(status);

-- ============================================================
-- 11. SECURE RPC BACKEND FUNCTIONS FOR ALL ACTIONS
-- ============================================================

-- A. Gate Entry / Exit Log RPC
CREATE OR REPLACE FUNCTION public.record_gate_entry_exit(
    p_action text,
    p_student_roll text,
    p_student_name text,
    p_lat double precision,
    p_lng double precision,
    p_accuracy double precision DEFAULT 40.0,
    p_gate_name text DEFAULT 'Main Campus Gate'
) RETURNS jsonb AS $$
DECLARE
    loc_check jsonb;
    new_log_id uuid;
    s_user_id uuid;
    recent_count integer;
BEGIN
    -- Verify location within hostel boundary
    loc_check := public.verify_hostel_location(p_lat, p_lng, p_accuracy);

    -- Find student user_id if authenticated
    s_user_id := auth.uid();

    -- Anti-replay / Duplicate prevention: No duplicate scan within 2 minutes for same action
    SELECT count(*) INTO recent_count 
    FROM public.gate_logs 
    WHERE student_roll = p_student_roll 
      AND action = p_action 
      AND timestamp > (now() - interval '2 minutes');

    IF recent_count > 0 THEN
        RAISE EXCEPTION 'DUPLICATE_SCAN: An % scan for Roll No % was already recorded in the last 2 minutes.', p_action, p_student_roll;
    END IF;

    INSERT INTO public.gate_logs (
        student_id, student_name, student_roll, action, 
        location_lat, location_lng, distance_meters, status, gate_name
    ) VALUES (
        s_user_id, p_student_name, p_student_roll, p_action,
        p_lat, p_lng, (loc_check->>'distance')::double precision, 'verified', p_gate_name
    ) RETURNING id INTO new_log_id;

    -- Audit log
    INSERT INTO public.audit_logs (action, performed_by, target_id, details)
    VALUES ('GATE_' || upper(p_action), coalesce(p_student_roll, 'student'), new_log_id::text, jsonb_build_object(
        'student_name', p_student_name, 'distance', loc_check->>'distance', 'gate', p_gate_name
    ));

    RETURN jsonb_build_object(
        'success', true,
        'log_id', new_log_id,
        'action', p_action,
        'timestamp', now(),
        'message', 'Gate ' || p_action || ' verified successfully within hostel boundary.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- B. Mess Daily Diet Selection RPC
CREATE OR REPLACE FUNCTION public.select_mess_diet(
    p_meal_date date,
    p_meal_type text,
    p_diet_choice text,
    p_student_roll text,
    p_lat double precision DEFAULT NULL,
    p_lng double precision DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    settings_rec RECORD;
    cutoff_time time;
    target_dt timestamp with time zone;
    cur_dt timestamp with time zone := now();
    s_user_id uuid := auth.uid();
BEGIN
    SELECT * INTO settings_rec FROM public.hostel_settings WHERE id = 1;

    -- If location is provided, optionally verify
    IF p_lat IS NOT NULL AND p_lng IS NOT NULL AND settings_rec.geofence_enforced THEN
        PERFORM public.verify_hostel_location(p_lat, p_lng, 100.0);
    END IF;

    -- Check deadline
    IF p_meal_type = 'lunch' THEN
        cutoff_time := coalesce(settings_rec.mess_lunch_deadline, '11:00:00'::time);
    ELSIF p_meal_type = 'dinner' THEN
        cutoff_time := coalesce(settings_rec.mess_dinner_deadline, '18:00:00'::time);
    ELSE
        RAISE EXCEPTION 'INVALID_MEAL_TYPE: Meal type must be lunch or dinner.';
    END IF;

    target_dt := (p_meal_date || ' ' || cutoff_time)::timestamp with time zone;
    IF cur_dt > target_dt THEN
        RAISE EXCEPTION 'DEADLINE_PASSED: The selection deadline for % on % was at %. Late selections cannot be accepted.', p_meal_type, p_meal_date, cutoff_time;
    END IF;

    INSERT INTO public.mess_choices (
        student_id, student_roll, meal_date, meal_type, diet_choice
    ) VALUES (
        s_user_id, p_student_roll, p_meal_date, p_meal_type, p_diet_choice
    )
    ON CONFLICT (student_id, meal_date, meal_type) DO UPDATE SET
        diet_choice = EXCLUDED.diet_choice,
        created_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'meal_date', p_meal_date,
        'meal_type', p_meal_type,
        'diet_choice', p_diet_choice,
        'message', 'Meal preference updated successfully.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- C. Mess QR Attendance RPC (Prevents duplicate attendance for same meal)
CREATE OR REPLACE FUNCTION public.record_mess_attendance(
    p_meal_date date,
    p_meal_type text,
    p_student_roll text,
    p_lat double precision,
    p_lng double precision,
    p_accuracy double precision DEFAULT 40.0
) RETURNS jsonb AS $$
DECLARE
    loc_check jsonb;
    s_user_id uuid := auth.uid();
    existing_rec RECORD;
    diet_pref text := 'veg';
    new_id uuid;
BEGIN
    -- Verify physical presence in hostel mess area
    loc_check := public.verify_hostel_location(p_lat, p_lng, p_accuracy);

    -- Check for duplicate attendance
    SELECT * INTO existing_rec FROM public.mess_attendance 
    WHERE student_id = s_user_id AND meal_date = p_meal_date AND meal_type = p_meal_type;

    IF existing_rec.id IS NOT NULL THEN
        RAISE EXCEPTION 'DUPLICATE_MEAL_ATTENDANCE: Attendance for % on % was already recorded at %.', p_meal_type, p_meal_date, existing_rec.marked_at;
    END IF;

    -- Lookup student diet preference if logged
    SELECT diet_choice INTO diet_pref FROM public.mess_choices
    WHERE student_id = s_user_id AND meal_date = p_meal_date AND meal_type = p_meal_type;
    IF diet_pref IS NULL THEN
        diet_pref := 'veg';
    END IF;

    INSERT INTO public.mess_attendance (
        student_id, student_roll, meal_date, meal_type, diet_served, location_lat, location_lng
    ) VALUES (
        s_user_id, p_student_roll, p_meal_date, p_meal_type, diet_pref, p_lat, p_lng
    ) RETURNING id INTO new_id;

    RETURN jsonb_build_object(
        'success', true,
        'attendance_id', new_id,
        'meal_type', p_meal_type,
        'diet_served', diet_pref,
        'marked_at', now(),
        'message', 'Mess attendance verified and logged successfully.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- D. Morning Attendance Check-In RPC
CREATE OR REPLACE FUNCTION public.record_morning_attendance(
    p_student_roll text,
    p_student_name text,
    p_room_no text,
    p_lat double precision,
    p_lng double precision,
    p_accuracy double precision DEFAULT 40.0
) RETURNS jsonb AS $$
DECLARE
    loc_check jsonb;
    today_d date := CURRENT_DATE;
    cur_t time := CURRENT_TIME;
    settings_rec RECORD;
    att_status text := 'on_time';
    new_id uuid;
BEGIN
    -- Must be physically in hostel
    loc_check := public.verify_hostel_location(p_lat, p_lng, p_accuracy);

    SELECT * INTO settings_rec FROM public.hostel_settings WHERE id = 1;

    -- Check morning window
    IF cur_t < coalesce(settings_rec.morning_checkin_start, '06:00:00'::time) THEN
        RAISE EXCEPTION 'WINDOW_NOT_OPEN: Morning attendance opens at %.', settings_rec.morning_checkin_start;
    END IF;

    IF cur_t > coalesce(settings_rec.morning_checkin_end, '08:30:00'::time) THEN
        att_status := 'late';
    ELSE
        att_status := 'on_time';
    END IF;

    INSERT INTO public.morning_attendance (
        student_id, student_roll, student_name, room_no, attendance_date,
        checkin_time, status, location_lat, location_lng, distance_meters
    ) VALUES (
        auth.uid(), p_student_roll, p_student_name, p_room_no, today_d,
        now(), att_status, p_lat, p_lng, (loc_check->>'distance')::double precision
    ) RETURNING id INTO new_id;

    RETURN jsonb_build_object(
        'success', true,
        'attendance_id', new_id,
        'date', today_d,
        'status', att_status,
        'checkin_time', now(),
        'message', 'Morning attendance recorded (' || att_status || ').'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- E. Sports Facility Booking RPC (Overlap Prevention & Location Check)
CREATE OR REPLACE FUNCTION public.book_sports_facility(
    p_facility_id integer,
    p_student_roll text,
    p_student_name text,
    p_booking_date date,
    p_start_time timestamp with time zone,
    p_end_time timestamp with time zone,
    p_team_name text DEFAULT NULL,
    p_players_count integer DEFAULT 1,
    p_lat double precision DEFAULT NULL,
    p_lng double precision DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    conflict_count integer;
    new_id uuid;
BEGIN
    -- Location check if coordinates provided
    IF p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
        PERFORM public.verify_hostel_location(p_lat, p_lng, 100.0);
    END IF;

    -- Check for overlapping booking on same facility
    SELECT count(*) INTO conflict_count
    FROM public.sports_bookings
    WHERE facility_id = p_facility_id
      AND booking_date = p_booking_date
      AND status = 'confirmed'
      AND (
          (start_time < p_end_time AND end_time > p_start_time)
      );

    IF conflict_count > 0 THEN
        RAISE EXCEPTION 'SPORTS_SLOT_CONFLICT: This facility is already booked for the selected time window.';
    END IF;

    INSERT INTO public.sports_bookings (
        facility_id, student_id, student_name, student_roll,
        booking_date, start_time, end_time, status, team_name, players_count
    ) VALUES (
        p_facility_id, auth.uid(), p_student_name, p_student_roll,
        p_booking_date, p_start_time, p_end_time, 'confirmed', p_team_name, p_players_count
    ) RETURNING id INTO new_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', new_id,
        'facility_id', p_facility_id,
        'message', 'Sports slot booked successfully.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- A. hostel_settings
ALTER TABLE public.hostel_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view hostel_settings" ON public.hostel_settings;
CREATE POLICY "Public can view hostel_settings" ON public.hostel_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage hostel_settings" ON public.hostel_settings;
CREATE POLICY "Admins can manage hostel_settings" ON public.hostel_settings FOR ALL USING (public.is_admin());

-- B. user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT 
USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT 
WITH CHECK (user_id = auth.uid() OR auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update own details" ON public.user_profiles;
CREATE POLICY "Users can update own details" ON public.user_profiles FOR UPDATE 
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- C. gate_logs
ALTER TABLE public.gate_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students view own gate logs" ON public.gate_logs;
CREATE POLICY "Students view own gate logs" ON public.gate_logs FOR SELECT 
USING (student_id = auth.uid() OR public.is_admin() OR public.get_current_role() IN ('security', 'warden'));
DROP POLICY IF EXISTS "Authorized can insert gate logs" ON public.gate_logs;
CREATE POLICY "Authorized can insert gate logs" ON public.gate_logs FOR INSERT 
WITH CHECK (true);

-- D. mess_menus
ALTER TABLE public.mess_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view mess menus" ON public.mess_menus;
CREATE POLICY "Public view mess menus" ON public.mess_menus FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage mess menus" ON public.mess_menus;
CREATE POLICY "Admins manage mess menus" ON public.mess_menus FOR ALL USING (public.is_admin() OR public.get_current_role() = 'mess_staff');

-- E. mess_choices
ALTER TABLE public.mess_choices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students view own choices" ON public.mess_choices;
CREATE POLICY "Students view own choices" ON public.mess_choices FOR SELECT 
USING (student_id = auth.uid() OR public.is_admin() OR public.get_current_role() = 'mess_staff');
DROP POLICY IF EXISTS "Students manage own choices" ON public.mess_choices;
CREATE POLICY "Students manage own choices" ON public.mess_choices FOR ALL 
USING (student_id = auth.uid() OR public.is_admin());

-- F. mess_attendance
ALTER TABLE public.mess_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students view own mess attendance" ON public.mess_attendance;
CREATE POLICY "Students view own mess attendance" ON public.mess_attendance FOR SELECT 
USING (student_id = auth.uid() OR public.is_admin() OR public.get_current_role() = 'mess_staff');
DROP POLICY IF EXISTS "Staff insert mess attendance" ON public.mess_attendance;
CREATE POLICY "Staff insert mess attendance" ON public.mess_attendance FOR INSERT WITH CHECK (true);

-- G. morning_attendance
ALTER TABLE public.morning_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students view own morning attendance" ON public.morning_attendance;
CREATE POLICY "Students view own morning attendance" ON public.morning_attendance FOR SELECT 
USING (student_id = auth.uid() OR public.is_admin() OR public.get_current_role() = 'warden');
DROP POLICY IF EXISTS "System insert morning attendance" ON public.morning_attendance;
CREATE POLICY "System insert morning attendance" ON public.morning_attendance FOR INSERT WITH CHECK (true);

-- H. sports_facilities & equipment
ALTER TABLE public.sports_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view sports facilities" ON public.sports_facilities FOR SELECT USING (true);
CREATE POLICY "Admins manage sports facilities" ON public.sports_facilities FOR ALL USING (public.is_admin());

ALTER TABLE public.sports_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view sports equipment" ON public.sports_equipment FOR SELECT USING (true);
CREATE POLICY "Admins manage sports equipment" ON public.sports_equipment FOR ALL USING (public.is_admin());

ALTER TABLE public.sports_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View sports bookings" ON public.sports_bookings FOR SELECT USING (true);
CREATE POLICY "Insert sports bookings" ON public.sports_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Manage sports bookings" ON public.sports_bookings FOR ALL USING (student_id = auth.uid() OR public.is_admin());

ALTER TABLE public.sports_equipment_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View sports loans" ON public.sports_equipment_loans FOR SELECT USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "Manage sports loans" ON public.sports_equipment_loans FOR ALL USING (public.is_admin());

-- I. lab_facilities & attendance
ALTER TABLE public.lab_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view lab facilities" ON public.lab_facilities FOR SELECT USING (true);
CREATE POLICY "Admins manage lab facilities" ON public.lab_facilities FOR ALL USING (public.is_admin());

ALTER TABLE public.lab_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View lab attendance" ON public.lab_attendance FOR SELECT USING (student_id = auth.uid() OR public.is_admin() OR public.get_current_role() = 'lab_staff');
CREATE POLICY "Insert lab attendance" ON public.lab_attendance FOR INSERT WITH CHECK (true);

ALTER TABLE public.lab_equipment_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View lab loans" ON public.lab_equipment_loans FOR SELECT USING (student_id = auth.uid() OR public.is_admin() OR public.get_current_role() = 'lab_staff');
CREATE POLICY "Manage lab loans" ON public.lab_equipment_loans FOR ALL USING (public.is_admin() OR public.get_current_role() = 'lab_staff');

ALTER TABLE public.lab_complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View lab complaints" ON public.lab_complaints FOR SELECT USING (true);
CREATE POLICY "Insert lab complaints" ON public.lab_complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Manage lab complaints" ON public.lab_complaints FOR ALL USING (public.is_admin() OR public.get_current_role() = 'lab_staff');

-- J. leave_applications & hostel_complaints
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own leave" ON public.leave_applications FOR SELECT USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "Students submit leave" ON public.leave_applications FOR INSERT WITH CHECK (student_id = auth.uid() OR auth.role() = 'authenticated');
CREATE POLICY "Admins manage leave" ON public.leave_applications FOR ALL USING (public.is_admin());

ALTER TABLE public.hostel_complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View complaints" ON public.hostel_complaints FOR SELECT USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "Submit complaints" ON public.hostel_complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage complaints" ON public.hostel_complaints FOR ALL USING (public.is_admin());

-- K. facility_qr_tokens
ALTER TABLE public.facility_qr_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view active qr tokens" ON public.facility_qr_tokens FOR SELECT USING (is_active = true AND expires_at > now());
CREATE POLICY "Admins manage qr tokens" ON public.facility_qr_tokens FOR ALL USING (public.is_admin());
`;

async function deployMigration() {
    await client.connect();
    console.log('Connected to DB for schema migration...');

    try {
        await client.query('BEGIN');
        await client.query(migrationSQL);
        await client.query('COMMIT');
        console.log('Migration deployed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed and rolled back:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

deployMigration();
