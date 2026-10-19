-- ============================================================================
-- Hostel Washing Machine Booking System - Supabase Storage Configuration
-- ============================================================================
-- Features:
-- 1. Creates 'machine-guides' bucket for washing mode photo diagrams.
-- 2. Public read access so students can view washing mode guidance photos.
-- 3. Restricted upload/delete access to authenticated admins only.
-- ============================================================================

-- 1. Insert bucket if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'machine-guides',
    'machine-guides',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE 
SET public = true, 
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- 2. Storage RLS Policies
-- Allow anyone to view washing mode photos
DROP POLICY IF EXISTS "Public can view machine guides" ON storage.objects;
CREATE POLICY "Public can view machine guides"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'machine-guides');

-- Allow only authenticated admins to upload photos
DROP POLICY IF EXISTS "Admins can upload machine guides" ON storage.objects;
CREATE POLICY "Admins can upload machine guides"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'machine-guides'
        AND public.is_admin()
    );

-- Allow only authenticated admins to update/replace photos
DROP POLICY IF EXISTS "Admins can update machine guides" ON storage.objects;
CREATE POLICY "Admins can update machine guides"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'machine-guides' AND public.is_admin())
    WITH CHECK (bucket_id = 'machine-guides' AND public.is_admin());

-- Allow only authenticated admins to delete photos
DROP POLICY IF EXISTS "Admins can delete machine guides" ON storage.objects;
CREATE POLICY "Admins can delete machine guides"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'machine-guides' AND public.is_admin());
