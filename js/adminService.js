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
                if (session?.user) {
                    currentAdminUser = session.user;
                    notifyAuthListeners();
                } else {
                    checkLocalAdminSession();
                }
            }).catch(() => {
                checkLocalAdminSession();
            });

            client.auth.onAuthStateChange((event, session) => {
                currentAdminUser = session?.user || null;
                notifyAuthListeners();
            });
        } else {
            checkLocalAdminSession();
        }
    }

    function checkLocalAdminSession() {
        try {
            const saved = localStorage.getItem('HOSTELWASH_LOCAL_ADMIN');
            if (saved) {
                currentAdminUser = JSON.parse(saved);
                notifyAuthListeners();
            }
        } catch (e) {}
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
     * Admin Sign In (Supports Mobile ID 7447642019 or Email)
     */
    async function login(identifier, password) {
        const cleanId = (identifier || '').trim();
        const loginEmail = cleanId.includes('@') ? cleanId : `${cleanId.replace(/\s+/g, '')}@hostel.edu`;

        const client = window.SupabaseManager.getClient();

        // 1. If Supabase is connected, authenticate via Supabase Auth
        if (client) {
            const { data, error } = await client.auth.signInWithPassword({
                email: loginEmail,
                password: password
            });

            if (!error && data?.user) {
                currentAdminUser = data.user;
                localStorage.removeItem('HOSTELWASH_LOCAL_ADMIN');
                notifyAuthListeners();
                return data.user;
            }

            // If Supabase returned invalid login and it matches the designated admin ID
            if (error && (cleanId === '7447642019' || loginEmail === '7447642019@hostel.edu') && password === 'BVG@250') {
                console.info('Supabase user not created yet in Auth dashboard; falling back to local admin verification.');
            } else if (error) {
                throw new Error(error.message || 'Invalid Admin ID or Password.');
            }
        }

        // 2. Local fallback verification for ID 7447642019
        if ((cleanId === '7447642019' || loginEmail === '7447642019@hostel.edu') && password === 'BVG@250') {
            currentAdminUser = {
                id: 'admin-7447642019',
                email: '7447642019@hostel.edu',
                role: 'admin',
                user_metadata: { full_name: 'Hostel Administrator (7447642019)' }
            };
            localStorage.setItem('HOSTELWASH_LOCAL_ADMIN', JSON.stringify(currentAdminUser));
            notifyAuthListeners();
            return currentAdminUser;
        }

        throw new Error('Invalid Admin ID or Password.');
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

    /**
     * Change Machine Status
     * Allowed statuses: 'available', 'in_use', 'maintenance', 'offline'
     */
    async function updateMachineStatus(machineId, newStatus) {
        if (!isAuthenticated()) {
            throw new Error('UNAUTHORIZED: Only authenticated admins can modify machine status.');
        }

        const validStatuses = ['available', 'in_use', 'maintenance', 'offline'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}`);
        }

        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not established.');

        const { data, error } = await client
            .from('machines')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', machineId)
            .select();

        if (error) {
            console.error('Update machine status error:', error);
            throw new Error(error.message || 'Failed to update machine status.');
        }

        return data;
    }

    /**
     * Upload Washing Mode Guide Photo to Supabase Storage
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

        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not established.');

        const fileExt = file.name.split('.').pop() || 'jpg';
        const filePath = `machine_${machineId}_guide_${Date.now()}.${fileExt}`;

        // 1. Upload to Storage bucket
        const { error: uploadError } = await client.storage
            .from('machine-guides')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error(uploadError.message || 'Failed to upload photo to storage.');
        }

        // 2. Retrieve Public URL
        const { data: urlData } = client.storage
            .from('machine-guides')
            .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // 3. Update photo_url in machines table
        const { error: updateError } = await client
            .from('machines')
            .update({
                photo_url: publicUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', machineId);

        if (updateError) {
            console.error('Failed to link photo to machine record:', updateError);
            throw new Error(updateError.message || 'Failed to link photo to machine.');
        }

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
        if (!client) return [];

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

        if (error) {
            console.error('Admin getAllBookings error:', error);
            throw new Error(error.message || 'Failed to retrieve bookings.');
        }

        let results = data || [];

        // Apply client-side search across name, roll, phone, or ref code
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

        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not established.');

        const { error } = await client
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId);

        if (error) {
            console.error('Cancel booking error:', error);
            throw new Error(error.message || 'Failed to cancel booking.');
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
        downloadDateWisePdfReport
    };
})();

// Export globally
window.AdminService = AdminService;
