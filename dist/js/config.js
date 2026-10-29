/**
 * Hostel Washing Machine Booking Portal - Application Configuration
 * 
 * Safely handles Supabase credentials without hardcoding secrets.
 * Reads from:
 * 1. window.__ENV__ (if injected at deployment)
 * 2. localStorage ('HOSTELWASH_CONFIG')
 * 3. Default empty state that prompts the user through an in-app setup modal
 */

const AppConfig = (function () {
    const STORAGE_KEY = 'HOSTELWASH_CONFIG';

    // Default configuration (Safe placeholders - no secrets)
    const defaults = {
        supabaseUrl: 'https://zhurgvwsaawacmukbvbi.supabase.co',
        supabaseAnonKey: 'sb_publishable_w1Y0JZdQfxdaEkZDL3Af2g_88t8IgGj',
        hostelName: 'Boys & Girls Hostel Laundry Wing',
        slotDurationMinutes: 75,
        bookingWindowDays: 7, // Today + 6 days
        operatingHours: {
            startHour: 6,   // 06:00 AM
            startMinute: 30, // 06:30 AM
            endHour: 23,    // 11:45 PM
            endMinute: 45
        }
    };

    function getConfig() {
        // 1. Check window.__ENV__ if provided by hosting environment
        if (window.__ENV__ && window.__ENV__.SUPABASE_URL && window.__ENV__.SUPABASE_ANON_KEY) {
            return {
                ...defaults,
                supabaseUrl: window.__ENV__.SUPABASE_URL,
                supabaseAnonKey: window.__ENV__.SUPABASE_ANON_KEY
            };
        }

        // 2. Check localStorage
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ...defaults,
                    supabaseUrl: parsed.supabaseUrl || defaults.supabaseUrl,
                    supabaseAnonKey: parsed.supabaseAnonKey || defaults.supabaseAnonKey
                };
            }
        } catch (e) {
            console.warn('Could not read config from localStorage', e);
        }

        return defaults;
    }

    function saveConfig(supabaseUrl, supabaseAnonKey) {
        const cleanedUrl = (supabaseUrl || '').trim().replace(/\/+$/, '');
        const cleanedKey = (supabaseAnonKey || '').trim();

        const config = {
            supabaseUrl: cleanedUrl,
            supabaseAnonKey: cleanedKey
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
            return true;
        } catch (e) {
            console.error('Failed to save config to localStorage', e);
            return false;
        }
    }

    function clearConfig() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            return true;
        } catch (e) {
            return false;
        }
    }

    function isConfigured() {
        const cfg = getConfig();
        return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && cfg.supabaseUrl.startsWith('http'));
    }

    return {
        getConfig,
        saveConfig,
        clearConfig,
        isConfigured
    };
})();

// Export globally
window.AppConfig = AppConfig;
