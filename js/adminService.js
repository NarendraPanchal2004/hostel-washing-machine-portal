/**
 * Hostel Washing Machine Booking Portal - Admin Service
 * 
 * Handles:
 * - Supabase Admin Authentication (Email & Password)
 * - Machine Status Modification (Available, In Use, Maintenance, Offline)
 * - Washing Mode Photo Upload to Supabase Storage ('machine-guides')
 * - Full Bookings Management (with student contact info for authorized admins only)
 * - Date-Wise PDF Report Generation using jsPDF and jspdf-autotable
 */

const AdminService = (function () {
    let currentAdminUser = null;
    const authListeners = [];

    /**
     * Initialize Auth listener
     */
    function initAuth() {
        const client = window.SupabaseManager.getClient();
        if (client) {
            client.auth.getSession().then(({ data: { session } }) => {
                currentAdminUser = session?.user || null;
                notifyAuthListeners();
            }).catch(() => {
                currentAdminUser = null;
                notifyAuthListeners();
            });

            client.auth.onAuthStateChange((event, session) => {
                currentAdminUser = session?.user || null;
                notifyAuthListeners();
            });
        }
    }

    function onAuthStateChange(listener) {
        authListeners.push(listener);
        listener(currentAdminUser);
    }

    function notifyAuthListeners() {
        authListeners.forEach(fn => {
            try { fn(currentAdminUser); } catch (e) { console.error(e); }
        });
    }

    function isAuthenticated() {
        return Boolean(currentAdminUser);
    }

    function getCurrentAdmin() {
        return currentAdminUser;
    }

    /**
     * Admin Sign In via Supabase Auth
     * Authenticates exclusively via Supabase Auth server-side verification.
     * No hardcoded passwords or client-side bypass flags.
     */
    async function login(identifier, password) {
        const cleanId = (identifier || '').trim();
        let loginEmail = cleanId;

        // Map mobile number to admin email
        if (!cleanId.includes('@')) {
            if (cleanId === '7447642019') {
                loginEmail = 'narendrapanchal8114@gmail.com';
            } else {
                loginEmail = `${cleanId}@hostel.edu`;
            }
        }

        const client = window.SupabaseManager.getClient();
        if (!client) {
            throw new Error('Database connection not established.');
        }

        const { data, error } = await client.auth.signInWithPassword({
            email: loginEmail,
            password: password
        });

        if (error || !data?.user) {
            console.warn('Supabase Auth failed:', error?.message);
            throw new Error('Invalid Admin ID or Password.');
        }

        currentAdminUser = data.user;
        localStorage.removeItem('HOSTELWASH_LOCAL_ADMIN');
        notifyAuthListeners();
        return data.user;
    }

    /**
     * Admin Sign Out
     */
    async function logout() {
        const client = window.SupabaseManager.getClient();
        if (client) {
            try { await client.auth.signOut(); } catch (e) {}
        }
        localStorage.removeItem('HOSTELWASH_LOCAL_ADMIN');
        currentAdminUser = null;
        notifyAuthListeners();
    }

    const DEFAULT_ADMIN_MACHINES = [
        { id: 1, name: 'Machine 1 (Bay 1)', model: 'LG Commercial AI Direct Drive 9.0 Kg', capacity_kg: 9.0, status: 'available', active_from_date: null },
        { id: 2, name: 'Machine 2 (Bay 2)', model: 'Samsung Inverter Eco Drum 9.0 Kg', capacity_kg: 9.0, status: 'available', active_from_date: null },
        { id: 3, name: 'Machine 3 (Bay 3)', model: 'Bosch Serie 6 VarioDrum 9.0 Kg', capacity_kg: 9.0, status: 'available', active_from_date: null },
        { id: 4, name: 'Machine 4 (Bay 4)', model: 'IFB Senator Heavy Steam Pro 9.0 Kg', capacity_kg: 9.0, status: 'available', active_from_date: null }
    ];

    /**
     * Change Machine Status and Scheduled Operational Date
     * Allowed statuses: 'available', 'in_use', 'maintenance', 'offline'
     */
    async function updateMachineStatus(machineId, newStatus, activeFromDate = undefined) {
        if (!isAuthenticated()) {
            throw new Error('UNAUTHORIZED: Only authenticated admins can modify machine status.');
        }

        const validStatuses = ['available', 'in_use', 'maintenance', 'offline'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}`);
        }

        // 1. Always update and persist to Local Storage immediately
        try {
            let machines = DEFAULT_ADMIN_MACHINES;
            const saved = localStorage.getItem('HOSTELWASH_LOCAL_MACHINES');
            if (saved) {
                try { machines = JSON.parse(saved); } catch (e) {}
            }
            const idx = machines.findIndex(m => Number(m.id) === Number(machineId));
            if (idx !== -1) {
                machines[idx].status = newStatus;
                if (activeFromDate !== undefined) {
                    machines[idx].active_from_date = activeFromDate || null;
                }
                machines[idx].updated_at = new Date().toISOString();
            } else {
                machines.push({
                    id: Number(machineId),
                    name: `Machine ${machineId}`,
                    status: newStatus,
                    active_from_date: activeFromDate || null,
                    updated_at: new Date().toISOString()
                });
            }
            localStorage.setItem('HOSTELWASH_LOCAL_MACHINES', JSON.stringify(machines));
        } catch (e) {
            console.warn('LocalStorage machine update failed:', e);
        }

        // 2. If Supabase client is connected, also update remote database
        const client = window.SupabaseManager.getClient();
        if (client) {
            try {
                const updatePayload = {
                    status: newStatus,
                    updated_at: new Date().toISOString()
                };
                if (activeFromDate !== undefined) {
                    updatePayload.active_from_date = activeFromDate || null;
                }

                const { error: updErr } = await client
                    .from('machines')
                    .update(updatePayload)
                    .eq('id', machineId);

                if (updErr) {
                    throw new Error('Database error: ' + updErr.message);
                }

                // Log security audit trail
                try {
                    await client.from('audit_logs').insert([{
                        action: 'MACHINE_STATUS_UPDATED',
                        performed_by: currentAdminUser?.email || 'admin',
                        target_id: String(machineId),
                        details: { new_status: newStatus, active_from_date: activeFromDate || null }
                    }]);
                } catch (e) {}
            } catch (err) {
                console.error('Supabase remote machine status update error:', err);
                throw err;
            }
        }

        return { success: true, machineId, status: newStatus, activeFromDate };
    }

    /**
     * Upload Washing Mode Guide Photo to Supabase Storage or Local Persistent Store
     * Bucket: 'machine-guides'
     */
    async function uploadWashingModePhoto(machineId, file) {
        if (!isAuthenticated()) {
            throw new Error('UNAUTHORIZED: Only authenticated admins can upload washing mode photos.');
        }

        if (!file) throw new Error('No photo file selected.');

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please upload a JPG, PNG, or WebP image.');
        }

        // Limit size to 5MB
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('Photo size exceeds 5MB limit.');
        }

        let publicUrl = '';
        const client = window.SupabaseManager.getClient();

        if (client) {
            try {
                const fileExt = file.name.split('.').pop() || 'jpg';
                const filePath = `machine_${machineId}_guide_${Date.now()}.${fileExt}`;

                // Upload to Storage bucket
                const { error: uploadError } = await client.storage
                    .from('machine-guides')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (!uploadError) {
                    const { data: urlData } = client.storage
                        .from('machine-guides')
                        .getPublicUrl(filePath);
                    publicUrl = urlData.publicUrl;

                    await client
                        .from('machines')
                        .update({
                            photo_url: publicUrl,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', machineId);
                }
            } catch (err) {
                console.warn('Remote photo upload error, falling back to local:', err);
            }
        }

        // If not connected to Supabase or upload failed, convert to base64 Data URL
        if (!publicUrl) {
            publicUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        // Save in LocalStorage machines
        try {
            let machines = DEFAULT_ADMIN_MACHINES;
            const saved = localStorage.getItem('HOSTELWASH_LOCAL_MACHINES');
            if (saved) {
                try { machines = JSON.parse(saved); } catch (e) {}
            }
            const idx = machines.findIndex(m => Number(m.id) === Number(machineId));
            if (idx !== -1) {
                machines[idx].photo_url = publicUrl;
                localStorage.setItem('HOSTELWASH_LOCAL_MACHINES', JSON.stringify(machines));
            }
        } catch (e) {}

        return publicUrl;
    }

    /**
     * Fetch all bookings for Admin Management
     * Includes sensitive student info (Phone, Email, Roll No)
     */
    async function getAllBookings({ dateFilter, machineFilter, searchStr }) {
        if (!isAuthenticated()) {
            throw new Error('UNAUTHORIZED: Access restricted to authenticated administrators.');
        }

        const client = window.SupabaseManager.getClient();
        let results = [];

        if (client) {
            try {
                let query = client
                    .from('bookings')
                    .select(`
                        id,
                        machine_id,
                        student_name,
                        student_roll,
                        student_phone,
                        student_email,
                        booking_date,
                        start_time,
                        end_time,
                        status,
                        reference_code,
                        notes,
                        created_at,
                        machines ( id, name, model )
                    `)
                    .order('start_time', { ascending: false });

                if (dateFilter) {
                    query = query.eq('booking_date', dateFilter);
                }

                if (machineFilter && machineFilter !== 'all') {
                    query = query.eq('machine_id', Number(machineFilter));
                }

                const { data, error } = await query;
                if (!error && Array.isArray(data)) {
                    results = data;
                }
            } catch (err) {
                console.warn('Supabase getAllBookings error, checking local store:', err);
            }
        }

        // Fallback / merge with local bookings
        try {
            const local = localStorage.getItem('HOSTELWASH_LOCAL_BOOKINGS');
            if (local) {
                let localBookings = JSON.parse(local);
                if (dateFilter) {
                    localBookings = localBookings.filter(b => b.booking_date === dateFilter);
                }
                if (machineFilter && machineFilter !== 'all') {
                    localBookings = localBookings.filter(b => Number(b.machine_id) === Number(machineFilter));
                }
                // Append local bookings that aren't already in results
                localBookings.forEach(lb => {
                    if (!results.some(r => r.id === lb.id || r.reference_code === lb.reference_code)) {
                        results.push(lb);
                    }
                });
            }
        } catch (e) {}

        // Apply search filter if present
        if (searchStr && searchStr.trim()) {
            const q = searchStr.trim().toLowerCase();
            results = results.filter(b => 
                (b.student_name && b.student_name.toLowerCase().includes(q)) ||
                (b.student_roll && b.student_roll.toLowerCase().includes(q)) ||
                (b.student_phone && b.student_phone.includes(q)) ||
                (b.reference_code && b.reference_code.toLowerCase().includes(q))
            );
        }

        return results;
    }

    /**
     * Cancel an active booking
     */
    async function cancelBooking(bookingId) {
        if (!isAuthenticated()) {
            throw new Error('UNAUTHORIZED: Only authenticated admins can cancel bookings.');
        }

        // Always update local storage
        try {
            const saved = localStorage.getItem('HOSTELWASH_LOCAL_BOOKINGS');
            if (saved) {
                const list = JSON.parse(saved);
                const b = list.find(item => item.id == bookingId || item.reference_code == bookingId);
                if (b) {
                    b.status = 'cancelled';
                    localStorage.setItem('HOSTELWASH_LOCAL_BOOKINGS', JSON.stringify(list));
                }
            }
        } catch (e) {}

        const client = window.SupabaseManager.getClient();
        if (client) {
            try {
                const { error: cancelErr } = await client
                    .from('bookings')
                    .update({ status: 'cancelled' })
                    .eq('id', bookingId);

                if (cancelErr) {
                    throw new Error('Database cancellation failed: ' + cancelErr.message);
                }

                // Log security audit trail
                try {
                    await client.from('audit_logs').insert([{
                        action: 'BOOKING_CANCELLED',
                        performed_by: currentAdminUser?.email || 'admin',
                        target_id: String(bookingId),
                        details: { timestamp: new Date().toISOString() }
                    }]);
                } catch (e) {}
            } catch (err) {
                console.error('Supabase remote cancelBooking error:', err);
                throw err;
            }
        }

        return true;
    }

    /**
     * Generate & Download Date-Wise PDF Report
     */
    async function downloadDateWisePdfReport(selectedDate, machineFilter = 'all') {
        if (!isAuthenticated()) {
            throw new Error('UNAUTHORIZED: Only authenticated admins can download audit reports.');
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('jsPDF library is not loaded. Please verify internet connectivity.');
        }

        const bookings = await getAllBookings({
            dateFilter: selectedDate,
            machineFilter: machineFilter
        });

        const doc = new window.jspdf.jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Report Title & Header
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59);
        doc.text('Hostel Washing Machine Booking Management System', 14, 18);

        doc.setFontSize(12);
        doc.setTextColor(79, 70, 229);
        doc.text(`Daily Facility Utilization & Audit Report - Date: ${selectedDate}`, 14, 26);

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const generatedAt = new Date().toLocaleString();
        const adminEmail = currentAdminUser ? currentAdminUser.email : 'Authorized Admin';
        doc.text(`Generated On: ${generatedAt}  |  Generated By: ${adminEmail}  |  Filter: Machine ${machineFilter}`, 14, 32);

        // Compute Metrics Summary
        const totalBookings = bookings.length;
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

        // Summary Metric Box
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 36, 269, 14, 2, 2, 'FD');

        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`Total Bookings: ${totalBookings}   |   Confirmed / Active: ${confirmedBookings}   |   Cancelled: ${cancelledBookings}   |   Slot Duration: 75 Mins`, 18, 45);

        // Prepare Table Data
        const tableRows = bookings.map((b, idx) => {
            const start = new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const end = new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const machineName = b.machines?.name || `Machine ${b.machine_id}`;

            return [
                idx + 1,
                b.reference_code || '-',
                machineName,
                `${start} - ${end}`,
                b.student_name || '-',
                b.student_roll || '-',
                b.student_phone || '-',
                (b.status || 'confirmed').toUpperCase()
            ];
        });

        if (tableRows.length === 0) {
            tableRows.push(['-', '-', 'No bookings recorded for this date.', '-', '-', '-', '-', '-']);
        }

        // Render Table with autoTable
        doc.autoTable({
            startY: 54,
            head: [['#', 'Ref Code', 'Machine', 'Slot Window (75m)', 'Student Name', 'Roll / Room', 'Contact No', 'Status']],
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: [30, 41, 59]
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 26 },
                2: { cellWidth: 46 },
                3: { cellWidth: 35 },
                4: { cellWidth: 45 },
                5: { cellWidth: 35 },
                6: { cellWidth: 35 },
                7: { cellWidth: 30 }
            }
        });

        // Signoff footer
        const finalY = doc.lastAutoTable.finalY + 18;
        if (finalY < 185) {
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            doc.text('Authorized Hostel Warden Signature: __________________________', 14, finalY);
            doc.text('Facility In-Charge Signature: __________________________', 160, finalY);
        }

        // Save PDF
        doc.save(`Hostel_Laundry_Report_${selectedDate}.pdf`);
        return true;
    }

    const DEFAULT_NOTICE = {
        id: 1,
        title: 'Hostel Laundry Notice / सूचना',
        content: 'कृपया वॉशिंग मशीन वापरल्यानंतर ड्रम स्वच्छ ठेवा आणि दरवाजा उघडा ठेवा.',
        author: 'Hostel In-Charge (7447642019)',
        priority: 'info',
        is_active: true,
        updated_at: new Date().toISOString()
    };

    /**
     * Get active hostel notice
     */
    async function getNotice() {
        const client = window.SupabaseManager.getClient();
        if (client) {
            try {
                const { data, error } = await client
                    .from('hostel_notices')
                    .select('*')
                    .eq('id', 1)
                    .maybeSingle();

                if (!error && data) {
                    try { localStorage.setItem('HOSTELWASH_LOCAL_NOTICE', JSON.stringify(data)); } catch (e) {}
                    return data;
                }
            } catch (err) {
                console.warn('Failed to fetch notice from Supabase:', err);
            }
        }

        try {
            const saved = localStorage.getItem('HOSTELWASH_LOCAL_NOTICE');
            if (saved) return JSON.parse(saved);
        } catch (e) {}

        return DEFAULT_NOTICE;
    }

    /**
     * Save / Publish Notice to all students
     */
    async function saveNotice({ title, content, priority = 'info', is_active = true }) {
        if (!isAuthenticated()) {
            throw new Error('UNAUTHORIZED: Only authenticated admins can publish notices.');
        }

        const noticeData = {
            id: 1,
            title: (title || 'Hostel Laundry Notice').trim(),
            content: (content || '').trim(),
            author: currentAdminUser?.user_metadata?.full_name || 'Hostel In-Charge (7447642019)',
            priority: priority || 'info',
            is_active: Boolean(is_active),
            updated_at: new Date().toISOString()
        };

        // 1. Update LocalStorage
        try {
            localStorage.setItem('HOSTELWASH_LOCAL_NOTICE', JSON.stringify(noticeData));
        } catch (e) {}

        // 2. Update Supabase
        const client = window.SupabaseManager.getClient();
        if (client) {
            try {
                const { data, error } = await client
                    .from('hostel_notices')
                    .upsert(noticeData, { onConflict: 'id' })
                    .select()
                    .single();

                if (error) {
                    console.error('Supabase notice upsert error:', error);
                    throw new Error('Notice save failed: ' + error.message);
                }

                // Log security audit trail
                try {
                    await client.from('audit_logs').insert([{
                        action: is_active ? 'NOTICE_PUBLISHED' : 'NOTICE_CLEARED',
                        performed_by: currentAdminUser?.email || 'admin',
                        target_id: '1',
                        details: { title, priority, is_active }
                    }]);
                } catch (e) {}

                if (data) return data;
            } catch (err) {
                console.warn('Remote notice save error:', err);
                throw err;
            }
        }

        return noticeData;
    }

    /**
     * Clear / Deactivate Notice
     */
    async function clearNotice() {
        if (!isAuthenticated()) {
            throw new Error('UNAUTHORIZED: Only authenticated admins can clear notices.');
        }

        return saveNotice({
            title: '',
            content: '',
            priority: 'info',
            is_active: false
        });
    }

    /**
     * Fetch security audit logs (Admin only)
     */
    async function getAuditLogs(limit = 50) {
        if (!isAuthenticated()) {
            throw new Error('UNAUTHORIZED: Only authenticated admins can view audit logs.');
        }

        const client = window.SupabaseManager.getClient();
        if (client) {
            try {
                const { data, error } = await client
                    .from('audit_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (!error && Array.isArray(data)) {
                    return data;
                }
            } catch (err) {
                console.warn('Failed to fetch audit logs:', err);
            }
        }
        return [];
    }

    return {
        initAuth,
        onAuthStateChange,
        isAuthenticated,
        getCurrentAdmin,
        login,
        logout,
        updateMachineStatus,
        uploadWashingModePhoto,
        getAllBookings,
        cancelBooking,
        downloadDateWisePdfReport,
        getNotice,
        saveNotice,
        clearNotice,
        getAuditLogs
    };
})();

// Export globally
window.AdminService = AdminService;
