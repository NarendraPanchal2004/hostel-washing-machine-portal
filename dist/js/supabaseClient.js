/**
 * Hostel Washing Machine Booking Portal - Supabase Client Manager
 * 
 * Manages the Supabase connection, connection state callbacks,
 * and Realtime subscriptions.
 */

const SupabaseManager = (function () {
    let client = null;
    let realtimeChannel = null;
    let connectionState = 'unconfigured'; // 'unconfigured' | 'connecting' | 'connected' | 'error'
    const stateListeners = [];

    function initClient() {
        const config = window.AppConfig.getConfig();

        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            setConnectionState('unconfigured', 'Supabase credentials not configured');
            client = null;
            return null;
        }

        try {
            if (!window.supabase || typeof window.supabase.createClient !== 'function') {
                console.error('Supabase JS library is not loaded on window.');
                setConnectionState('error', 'Supabase JS library failed to load');
                return null;
            }

            client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                },
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                }
            });

            setConnectionState('connecting', 'Connecting to Supabase...');
            testConnection();
            return client;
        } catch (err) {
            console.error('Failed to initialize Supabase client:', err);
            setConnectionState('error', err.message || 'Initialization error');
            return null;
        }
    }

    function getClient() {
        if (!client) {
            return initClient();
        }
        return client;
    }

    async function testConnection() {
        if (!client) return { ok: false, message: 'Client not initialized' };

        try {
            // Test query on machines table
            const { data, error } = await client
                .from('machines')
                .select('id, name, status')
                .limit(4);

            if (error) {
                // Table might not exist or schema not run
                console.warn('Supabase connected but query returned error:', error);
                setConnectionState('error', error.message || 'Error querying database');
                return { ok: false, error: error.message };
            }

            setConnectionState('connected', 'Live Cloud Sync Active');
            return { ok: true, data };
        } catch (err) {
            console.error('Supabase connection test failed:', err);
            setConnectionState('error', err.message || 'Network error');
            return { ok: false, error: err.message };
        }
    }

    function setConnectionState(state, message = '') {
        connectionState = state;
        stateListeners.forEach(fn => {
            try { fn(state, message); } catch (e) { console.error(e); }
        });
    }

    function onStateChange(listener) {
        stateListeners.push(listener);
        // Immediately notify with current state
        listener(connectionState, '');
    }

    function subscribeRealtime(onMachineEvent, onBookingEvent, onNoticeEvent) {
        if (!client) return null;

        // Clean up any existing channel
        if (realtimeChannel) {
            client.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }

        try {
            realtimeChannel = client.channel('public:laundry_realtime')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'machines' },
                    payload => {
                        console.log('Realtime Machine Event:', payload);
                        if (typeof onMachineEvent === 'function') onMachineEvent(payload);
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'bookings' },
                    payload => {
                        console.log('Realtime Booking Event:', payload);
                        if (typeof onBookingEvent === 'function') onBookingEvent(payload);
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'hostel_notices' },
                    payload => {
                        console.log('Realtime Notice Event:', payload);
                        if (typeof onNoticeEvent === 'function') onNoticeEvent(payload);
                    }
                )
                .subscribe((status) => {
                    console.log('Supabase Realtime status:', status);
                    if (status === 'SUBSCRIBED') {
                        setConnectionState('connected', 'Live Realtime Active');
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn('Realtime subscription issue:', status);
                    }
                });

            return realtimeChannel;
        } catch (e) {
            console.warn('Failed to subscribe to Realtime channel:', e);
            return null;
        }
    }

    return {
        initClient,
        getClient,
        testConnection,
        onStateChange,
        subscribeRealtime,
        getState: () => connectionState
    };
})();

// Export globally
window.SupabaseManager = SupabaseManager;
