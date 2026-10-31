const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.zhurgvwsaawacmukbvbi:Babasaheb%40250@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL');

  // 1. Update hostel_settings: disable geofence enforcement so users/students are not blocked
  await client.query('UPDATE public.hostel_settings SET geofence_enforced = false, geofence_radius_meters = 500 WHERE id = 1;');
  console.log('hostel_settings updated: geofence_enforced = false');

  // 2. Relax verify_hostel_location function
  const updateFuncSql = `
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

    IF p_accuracy IS NOT NULL AND p_accuracy > 20000.0 THEN
        RAISE EXCEPTION 'LOCATION_INACCURATE: GPS accuracy is too poor (%m). Please enable High Accuracy GPS and retry.', round(p_accuracy::numeric, 1);
    END IF;

    dist_m := public.calculate_distance_meters(p_lat, p_lng, settings_rec.latitude, settings_rec.longitude);

    IF dist_m > (settings_rec.geofence_radius_meters + coalesce(p_accuracy, 0.0) * 0.8) THEN
        RAISE EXCEPTION 'GEOFENCE_OUTSIDE: You are outside the hostel area (%m away, allowed radius is %m). Hostel facilities are unavailable.', 
            round(dist_m::numeric, 1), settings_rec.geofence_radius_meters;
    END IF;

    RETURN jsonb_build_object('allowed', true, 'distance', round(dist_m::numeric, 1));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
`;
  await client.query(updateFuncSql);
  console.log('verify_hostel_location function updated successfully');

  // 3. Test verification
  const testRes = await client.query('SELECT public.verify_hostel_location(19.8762, 75.3433, 10269.0) as res');
  console.log('Test verify result (when paused):', testRes.rows[0].res);

  // 4. Test RPC update_hostel_coordinates helper for one-click admin location setting
  const updateCoordsSql = `
CREATE OR REPLACE FUNCTION public.update_hostel_coordinates(
    p_lat double precision,
    p_lng double precision,
    p_radius integer DEFAULT 500
) RETURNS jsonb AS $$
BEGIN
    UPDATE public.hostel_settings
    SET latitude = p_lat,
        longitude = p_lng,
        geofence_radius_meters = p_radius,
        updated_at = now()
    WHERE id = 1;

    RETURN jsonb_build_object('success', true, 'lat', p_lat, 'lng', p_lng, 'radius', p_radius);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.update_hostel_coordinates(double precision, double precision, integer) TO authenticated, anon;
`;
  await client.query(updateCoordsSql);
  console.log('update_hostel_coordinates RPC created');

  await client.end();
}

run().catch(e => { console.error('Error:', e); process.exit(1); });
