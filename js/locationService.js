/**
/**
 * Hostel Management System - Location & Geofence Service
 * 
 * Enforces mandatory hostel-area physical presence verification using
 * GPS coordinates (High Accuracy) verified on the server-side via Supabase RPC.
 */

const LocationService = (function () {
    let cachedCoords = null; // { lat, lng, accuracy, timestamp }
    let cachedVerification = null; // { allowed, distance, lastChecked }
    let isVerifying = false;
    let hostelSettings = {
        latitude: 19.8762,
        longitude: 75.3433,
        geofence_radius_meters: 100,
        geofence_enforced: true,
        hostel_name: 'Hostel Campus'
    };

    const listeners = [];

    /**
     * Fetch latest hostel geofence settings from database
     */
    async function refreshSettings() {
        try {
            const client = window.SupabaseManager.getClient();
            if (client) {
                const { data, error } = await client
                    .from('hostel_settings')
                    .select('*')
                    .eq('id', 1)
                    .single();

                if (!error && data) {
                    hostelSettings = {
                        ...hostelSettings,
                        ...data
                    };
                }
            }
        } catch (e) {
            console.warn('Could not fetch hostel settings, using defaults:', e);
        }
        return hostelSettings;
    }

    /**
     * Get device GPS coordinates with high accuracy
     */
    async function getCurrentCoordinates() {
        // 1. If running under Capacitor Android App
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) {
            try {
                const position = await window.Capacitor.Plugins.Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 10000
                });
                cachedCoords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy || 20,
                    timestamp: Date.now()
                };
                return cachedCoords;
            } catch (capErr) {
                console.warn('Capacitor geolocation fallback to browser API:', capErr);
            }
        }

        // 2. Standard Browser Geolocation API
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by your browser or device.');
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    cachedCoords = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy || 25,
                        timestamp: Date.now()
                    };
                    resolve(cachedCoords);
                },
                err => {
                    let msg = 'Failed to obtain GPS location.';
                    if (err.code === 1) { // PERMISSION_DENIED
                        msg = 'Location permission was denied. Hostel protected facilities require location access.';
                    } else if (err.code === 2) { // POSITION_UNAVAILABLE
                        msg = 'GPS location is unavailable. Please turn on device Location/GPS.';
                    } else if (err.code === 3) { // TIMEOUT
                        msg = 'GPS location request timed out. Please retry with clear sky view.';
                    }
                    reject(new Error(msg));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 30000
                }
            );
        });
    }

    /**
     * Verify location on server-side using PostgreSQL RPC
     */
    async function verifyLocation(forceFresh = false) {
        if (!forceFresh && cachedVerification && (Date.now() - cachedVerification.lastChecked < 60000)) {
            return cachedVerification;
        }

        isVerifying = true;
        notifyListeners('checking', null);

        try {
            await refreshSettings();

            // If geofence enforcement is turned off by admin
            if (hostelSettings.geofence_enforced === false) {
                cachedVerification = {
                    allowed: true,
                    distance: 0,
                    enforced: false,
                    lastChecked: Date.now(),
                    message: 'Geofence check paused by Admin.'
                };
                notifyListeners('verified', cachedVerification);
                isVerifying = false;
                return cachedVerification;
            }

            const coords = await getCurrentCoordinates();

            const client = window.SupabaseManager.getClient();
            if (!client) {
                // Offline fallback client-side estimation
                const dist = calculateClientDistance(coords.lat, coords.lng, hostelSettings.latitude, hostelSettings.longitude);
                const allowed = dist <= (hostelSettings.geofence_radius_meters + coords.accuracy * 0.5);
                cachedVerification = {
                    allowed,
                    distance: Math.round(dist),
                    enforced: true,
                    coords,
                    lastChecked: Date.now(),
                    message: allowed ? `Inside hostel area (${Math.round(dist)}m)` : `Outside hostel area (${Math.round(dist)}m)`
                };
            } else {
                // Secure Server-Side RPC
                const { data, error } = await client.rpc('verify_hostel_location', {
                    p_lat: coords.lat,
                    p_lng: coords.lng,
                    p_accuracy: coords.accuracy
                });

                if (error) {
                    cachedVerification = {
                        allowed: false,
                        error: error.message,
                        enforced: true,
                        coords,
                        lastChecked: Date.now(),
                        message: error.message.replace(/^.*GEOFENCE_OUTSIDE:\s*/, '').replace(/^.*LOCATION_INACCURATE:\s*/, '')
                    };
                } else {
                    cachedVerification = {
                        allowed: data.allowed === true,
                        distance: data.distance,
                        enforced: true,
                        coords,
                        lastChecked: Date.now(),
                        message: `Inside hostel area (${data.distance}m)`
                    };
                }
            }

            notifyListeners(cachedVerification.allowed ? 'verified' : 'outside', cachedVerification);
            isVerifying = false;
            return cachedVerification;
        } catch (err) {
            isVerifying = false;
            cachedVerification = {
                allowed: false,
                error: err.message,
                enforced: true,
                lastChecked: Date.now(),
                message: err.message
            };
            notifyListeners('error', cachedVerification);
            return cachedVerification;
        }
    }

    /**
     * Client-side Haversine distance in meters
     */
    function calculateClientDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function onLocationChange(listener) {
        listeners.push(listener);
        if (cachedVerification) listener(cachedVerification.allowed ? 'verified' : 'outside', cachedVerification);
    }

    function notifyListeners(status, data) {
        listeners.forEach(fn => {
            try { fn(status, data); } catch (e) { console.error(e); }
        });
    }

    /**
     * Helper to require location before executing an action
     */
    async function assertInsideHostel() {
        const check = await verifyLocation();
        if (!check.allowed) {
            throw new Error(check.message || 'You are outside the hostel area. Hostel facilities are unavailable.');
        }
        return check;
    }

    return {
        refreshSettings,
        getSettings: () => hostelSettings,
        getCurrentCoordinates,
        verifyLocation,
        assertInsideHostel,
        onLocationChange,
        getCachedVerification: () => cachedVerification,
        isInside: () => Boolean(cachedVerification && cachedVerification.allowed)
    };
})();

window.LocationService = LocationService;
