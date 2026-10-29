/**
 * Hostel Management System - Authentication & RBAC Service
 * 
 * Supports:
 * - Student Registration & Login (Email or Roll Number)
 * - Staff & Admin Authentication (Warden, Security, Mess Staff, Lab Staff, Super Admin)
 * - Role-Based Access Control (RBAC)
 * - Automatic Profile Synchronization with Supabase Auth & user_profiles
 */

const AuthService = (function () {
    let currentUser = null;
    let currentProfile = null;
    const authListeners = [];

    /**
     * Initialize Auth listener from Supabase session
     */
    async function init() {
        const client = window.SupabaseManager.getClient();
        if (client) {
            try {
                const { data: { session } } = await client.auth.getSession();
                if (session?.user) {
                    currentUser = session.user;
                    await fetchUserProfile(currentUser.id, currentUser.email);
                } else {
                    currentUser = null;
                    currentProfile = null;
                }
                notifyListeners();
            } catch (err) {
                console.warn('Session init error:', err);
            }

            client.auth.onAuthStateChange(async (event, session) => {
                currentUser = session?.user || null;
                if (currentUser) {
                    await fetchUserProfile(currentUser.id, currentUser.email);
                } else {
                    currentProfile = null;
                }
                notifyListeners();
            });
        }
    }

    /**
     * Fetch user profile from user_profiles table or admin_profiles fallback
     */
    async function fetchUserProfile(userId, email) {
        const client = window.SupabaseManager.getClient();
        if (!client) return null;

        try {
            const { data, error } = await client
                .from('user_profiles')
                .select('*')
                .or(`user_id.eq.${userId},email.eq.${email}`)
                .maybeSingle();

            if (!error && data) {
                currentProfile = data;
                // If user_id wasn't linked yet, update it
                if (!data.user_id && userId) {
                    await client.from('user_profiles').update({ user_id: userId }).eq('id', data.id);
                }
                return currentProfile;
            }

            // Fallback: check admin_profiles
            const { data: adminData } = await client
                .from('admin_profiles')
                .select('*')
                .or(`user_id.eq.${userId},email.eq.${email}`)
                .maybeSingle();

            if (adminData) {
                currentProfile = {
                    id: adminData.id,
                    user_id: userId,
                    email: adminData.email,
                    full_name: adminData.full_name,
                    role: 'admin',
                    phone: '7447642019'
                };
                return currentProfile;
            }

            // Default student profile if newly signed up
            currentProfile = {
                user_id: userId,
                email: email,
                full_name: email.split('@')[0],
                role: (email === 'narendrapanchal8114@gmail.com') ? 'admin' : 'student'
            };
            return currentProfile;
        } catch (e) {
            console.warn('Error fetching user profile:', e);
            return null;
        }
    }

    /**
     * Student Registration
     */
    async function registerStudent({ email, password, fullName, rollNo, roomNo, phone, hostelBlock }) {
        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not established.');

        const cleanEmail = email.trim().toLowerCase();
        const cleanRoll = rollNo.trim().toUpperCase();

        const { data: authData, error: authError } = await client.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
                data: {
                    full_name: fullName.trim(),
                    student_roll: cleanRoll,
                    room_no: roomNo.trim(),
                    phone: phone.trim(),
                    role: 'student'
                }
            }
        });

        if (authError) throw authError;

        const userId = authData?.user?.id;

        // Upsert user_profiles record
        const { data: profData, error: profError } = await client
            .from('user_profiles')
            .upsert({
                user_id: userId,
                email: cleanEmail,
                full_name: fullName.trim(),
                role: 'student',
                student_roll: cleanRoll,
                room_no: roomNo.trim(),
                phone: phone.trim(),
                hostel_block: hostelBlock || 'A Block'
            }, { onConflict: 'email' })
            .select()
            .single();

        if (profError) {
            console.warn('Profile upsert warning:', profError);
        }

        currentUser = authData.user;
        currentProfile = profData || {
            user_id: userId,
            email: cleanEmail,
            full_name: fullName.trim(),
            role: 'student',
            student_roll: cleanRoll,
            room_no: roomNo.trim(),
            phone: phone.trim()
        };

        notifyListeners();
        return { user: currentUser, profile: currentProfile };
    }

    /**
     * Unified Login (Student or Staff/Admin)
     */
    async function login(identifier, password) {
        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not established.');

        const cleanId = (identifier || '').trim();
        let loginEmail = cleanId;

        // Handle Admin phone mapping: 7447642019 -> narendrapanchal8114@gmail.com
        if (!cleanId.includes('@')) {
            if (cleanId === '7447642019') {
                loginEmail = 'narendrapanchal8114@gmail.com';
            } else {
                // Check if identifier is student roll number or mobile
                const { data: foundProfile } = await client
                    .from('user_profiles')
                    .select('email')
                    .or(`student_roll.ilike.${cleanId},phone.eq.${cleanId}`)
                    .limit(1)
                    .maybeSingle();

                if (foundProfile?.email) {
                    loginEmail = foundProfile.email;
                } else {
                    loginEmail = `${cleanId.toLowerCase()}@hostel.edu`;
                }
            }
        }

        const { data, error } = await client.auth.signInWithPassword({
            email: loginEmail,
            password: password
        });

        if (error || !data?.user) {
            throw new Error(error?.message || 'Invalid ID or Password.');
        }

        currentUser = data.user;
        await fetchUserProfile(currentUser.id, currentUser.email);
        notifyListeners();
        return { user: currentUser, profile: currentProfile };
    }

    /**
     * Sign Out
     */
    async function logout() {
        const client = window.SupabaseManager.getClient();
        if (client) {
            try { await client.auth.signOut(); } catch (e) {}
        }
        currentUser = null;
        currentProfile = null;
        notifyListeners();
    }

    function onAuthStateChange(listener) {
        authListeners.push(listener);
        listener(currentUser, currentProfile);
    }

    function notifyListeners() {
        authListeners.forEach(fn => {
            try { fn(currentUser, currentProfile); } catch (e) { console.error(e); }
        });
    }

    function getUser() { return currentUser; }
    function getProfile() { return currentProfile; }
    function isAuthenticated() { return Boolean(currentUser); }

    function getRole() {
        if (!currentUser) return 'guest';
        return currentProfile?.role || 'student';
    }

    function isAdmin() {
        const r = getRole();
        return r === 'admin' || currentUser?.email === 'narendrapanchal8114@gmail.com';
    }

    function isWarden() {
        const r = getRole();
        return r === 'warden' || isAdmin();
    }

    function isSecurity() {
        const r = getRole();
        return r === 'security' || isAdmin();
    }

    function isMessStaff() {
        const r = getRole();
        return r === 'mess_staff' || isAdmin();
    }

    function isLabStaff() {
        const r = getRole();
        return r === 'lab_staff' || isAdmin();
    }

    return {
        init,
        registerStudent,
        login,
        logout,
        onAuthStateChange,
        getUser,
        getProfile,
        isAuthenticated,
        getRole,
        isAdmin,
        isWarden,
        isSecurity,
        isMessStaff,
        isLabStaff
    };
})();

window.AuthService = AuthService;
