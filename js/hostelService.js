/**
 * Hostel Management System - Main Hostel Operations Service
 * 
 * Coordinates:
 * - Gate Entry/Exit verification
 * - Mess Menu, Diet Choices & QR Attendance
 * - Morning Attendance & Reminders
 * - Sports Facilities & Equipment Loans
 * - Lab Attendance & Complaints
 * - Leave Applications & Maintenance Complaints
 * - Emergency Directory & Hostel Geofence Configuration
 */

const HostelService = (function () {

    // ==========================================
    // 1. GATE ENTRY & EXIT MANAGEMENT
    // ==========================================
    async function recordGateAction({ action, studentRoll, studentName, gateName = 'Main Campus Gate' }) {
        // Assert within hostel boundary
        const loc = await window.LocationService.assertInsideHostel();
        const coords = loc.coords || await window.LocationService.getCurrentCoordinates();

        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not active.');

        const { data, error } = await client.rpc('record_gate_entry_exit', {
            p_action: action,
            p_student_roll: studentRoll,
            p_student_name: studentName,
            p_lat: coords.lat,
            p_lng: coords.lng,
            p_accuracy: coords.accuracy || 30.0,
            p_gate_name: gateName
        });

        if (error) throw new Error(error.message.replace(/^.*DUPLICATE_SCAN:\s*/, ''));
        return data;
    }

    async function getStudentGateLogs(studentRoll) {
        const client = window.SupabaseManager.getClient();
        if (!client) return [];

        let query = client
            .from('gate_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(30);

        if (studentRoll) {
            query = query.eq('student_roll', studentRoll);
        }

        const { data, error } = await query;
        if (error) {
            console.warn('Error fetching student gate logs:', error);
            return [];
        }
        return data || [];
    }

    async function getAllGateLogs(dateFilter = null) {
        const client = window.SupabaseManager.getClient();
        if (!client) return [];

        let query = client
            .from('gate_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(100);

        if (dateFilter) {
            const startDay = `${dateFilter}T00:00:00.000Z`;
            const endDay = `${dateFilter}T23:59:59.999Z`;
            query = query.gte('timestamp', startDay).lte('timestamp', endDay);
        }

        const { data, error } = await query;
        if (error) return [];
        return data || [];
    }

    // ==========================================
    // 2. MESS MANAGEMENT
    // ==========================================
    async function getWeeklyMessMenu() {
        const client = window.SupabaseManager.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('mess_menus')
            .select('*')
            .order('id');

        if (error) return [];
        return data || [];
    }

    async function selectMealDiet({ mealDate, mealType, dietChoice, studentRoll }) {
        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not active.');

        let coords = null;
        try {
            coords = await window.LocationService.getCurrentCoordinates();
        } catch (e) {}

        const { data, error } = await client.rpc('select_mess_diet', {
            p_meal_date: mealDate,
            p_meal_type: mealType,
            p_diet_choice: dietChoice,
            p_student_roll: studentRoll,
            p_lat: coords?.lat || null,
            p_lng: coords?.lng || null
        });

        if (error) throw new Error(error.message.replace(/^.*DEADLINE_PASSED:\s*/, ''));
        return data;
    }

    async function getStudentMealChoices(studentRoll, startDate, endDate) {
        const client = window.SupabaseManager.getClient();
        if (!client) return [];

        let query = client
            .from('mess_choices')
            .select('*')
            .eq('student_roll', studentRoll);

        if (startDate) query = query.gte('meal_date', startDate);
        if (endDate) query = query.lte('meal_date', endDate);

        const { data, error } = await query;
        if (error) return [];
        return data || [];
    }

    async function recordMessAttendance({ mealDate, mealType, studentRoll }) {
        const loc = await window.LocationService.assertInsideHostel();
        const coords = loc.coords || await window.LocationService.getCurrentCoordinates();

        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not active.');

        const { data, error } = await client.rpc('record_mess_attendance', {
            p_meal_date: mealDate,
            p_meal_type: mealType,
            p_student_roll: studentRoll,
            p_lat: coords.lat,
            p_lng: coords.lng,
            p_accuracy: coords.accuracy || 30.0
        });

        if (error) throw new Error(error.message.replace(/^.*DUPLICATE_MEAL_ATTENDANCE:\s*/, ''));
        return data;
    }

    async function getMessHeadcount(mealDate, mealType) {
        const client = window.SupabaseManager.getClient();
        if (!client) return { veg: 0, non_veg: 0, skip: 0, attended: 0 };

        const { data: choices } = await client
            .from('mess_choices')
            .select('diet_choice')
            .eq('meal_date', mealDate)
            .eq('meal_type', mealType);

        const { count: attendedCount } = await client
            .from('mess_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('meal_date', mealDate)
            .eq('meal_type', mealType);

        let veg = 0, non_veg = 0, skip = 0;
        (choices || []).forEach(c => {
            if (c.diet_choice === 'veg') veg++;
            else if (c.diet_choice === 'non_veg') non_veg++;
            else if (c.diet_choice === 'skip') skip++;
        });

        return {
            veg,
            non_veg,
            skip,
            totalSelected: veg + non_veg,
            attended: attendedCount || 0
        };
    }

    // ==========================================
    // 3. MORNING ATTENDANCE & REMINDERS
    // ==========================================
    async function recordMorningAttendance({ studentRoll, studentName, roomNo }) {
        const loc = await window.LocationService.assertInsideHostel();
        const coords = loc.coords || await window.LocationService.getCurrentCoordinates();

        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not active.');

        const { data, error } = await client.rpc('record_morning_attendance', {
            p_student_roll: studentRoll,
            p_student_name: studentName,
            p_room_no: roomNo || 'Unassigned',
            p_lat: coords.lat,
            p_lng: coords.lng,
            p_accuracy: coords.accuracy || 30.0
        });

        if (error) throw new Error(error.message.replace(/^.*WINDOW_NOT_OPEN:\s*/, ''));
        return data;
    }

    async function getMorningAttendanceLogs(dateFilter = null) {
        const client = window.SupabaseManager.getClient();
        if (!client) return [];

        let query = client
            .from('morning_attendance')
            .select('*')
            .order('checkin_time', { ascending: false });

        if (dateFilter) {
            query = query.eq('attendance_date', dateFilter);
        }

        const { data, error } = await query;
        if (error) return [];
        return data || [];
    }

    // ==========================================
    // 4. SPORTS FACILITIES & EQUIPMENT
    // ==========================================
    async function getSportsFacilities() {
        const client = window.SupabaseManager.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('sports_facilities')
            .select('*')
            .eq('is_active', true)
            .order('id');

        if (error) return [];
        return data || [];
    }

    async function getSportsEquipment() {
        const client = window.SupabaseManager.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('sports_equipment')
            .select('*, sports_facilities(name)')
            .order('id');

        if (error) return [];
        return data || [];
    }

    async function bookSportsFacility({ facilityId, studentRoll, studentName, bookingDate, startTime, endTime, teamName, playersCount }) {
        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not active.');

        let coords = null;
        try {
            coords = await window.LocationService.getCurrentCoordinates();
        } catch (e) {}

        const { data, error } = await client.rpc('book_sports_facility', {
            p_facility_id: Number(facilityId),
            p_student_roll: studentRoll,
            p_student_name: studentName,
            p_booking_date: bookingDate,
            p_start_time: startTime,
            p_end_time: endTime,
            p_team_name: teamName || 'Hostel Team',
            p_players_count: Number(playersCount) || 1,
            p_lat: coords?.lat || null,
            p_lng: coords?.lng || null
        });

        if (error) throw new Error(error.message.replace(/^.*SPORTS_SLOT_CONFLICT:\s*/, ''));
        return data;
    }

    async function getSportsBookings(facilityId, bookingDate) {
        const client = window.SupabaseManager.getClient();
        if (!client) return [];

        let query = client
            .from('sports_bookings')
            .select('*, sports_facilities(name)')
            .eq('status', 'confirmed')
            .order('start_time');

        if (facilityId && facilityId !== 'all') {
            query = query.eq('facility_id', Number(facilityId));
        }
        if (bookingDate) {
            query = query.eq('booking_date', bookingDate);
        }

        const { data, error } = await query;
        if (error) return [];
        return data || [];
    }

    // ==========================================
    // 5. LABORATORY MANAGEMENT
    // ==========================================
    async function getLabFacilities() {
        const client = window.SupabaseManager.getClient();
        if (!client) return [];

        const { data, error } = await client
            .from('lab_facilities')
            .select('*')
            .eq('is_active', true)
            .order('id');

        if (error) return [];
        return data || [];
    }

    async function checkinLab({ labId, studentRoll, studentName, purpose }) {
        await window.LocationService.assertInsideHostel();

        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not active.');

        const user = window.AuthService.getUser();

        const { data, error } = await client
            .from('lab_attendance')
            .insert({
                lab_id: Number(labId),
                student_id: user?.id || null,
                student_roll: studentRoll,
                student_name: studentName,
                purpose: purpose || 'Study / Project Work'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async function getLabAttendanceLogs(labId = null) {
        const client = window.SupabaseManager.getClient();
        if (!client) return [];

        let query = client
            .from('lab_attendance')
            .select('*, lab_facilities(name)')
            .order('entry_time', { ascending: false })
            .limit(50);

        if (labId && labId !== 'all') {
            query = query.eq('lab_id', Number(labId));
        }

        const { data, error } = await query;
        if (error) return [];
        return data || [];
    }

    // ==========================================
    // 6. LEAVE APPLICATIONS & COMPLAINTS
    // ==========================================
    async function submitLeaveApplication({ startDate, endDate, reason, destination, parentPhone, studentName, studentRoll, roomNo }) {
        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not active.');

        const user = window.AuthService.getUser();

        const { data, error } = await client
            .from('leave_applications')
            .insert({
                student_id: user?.id || null,
                student_name: studentName,
                student_roll: studentRoll,
                room_no: roomNo || 'Unassigned',
                parent_phone: parentPhone,
                start_date: startDate,
                end_date: endDate,
                reason: reason,
                destination: destination,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async function getLeaveApplications(studentRoll = null, statusFilter = null) {
        const client = window.SupabaseManager.getClient();
        if (!client) return [];

        let query = client
            .from('leave_applications')
            .select('*')
            .order('created_at', { ascending: false });

        if (studentRoll) query = query.eq('student_roll', studentRoll);
        if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter);

        const { data, error } = await query;
        if (error) return [];
        return data || [];
    }

    async function reviewLeaveApplication(leaveId, status, comments = '') {
        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not active.');

        const user = window.AuthService.getUser();

        const { data, error } = await client
            .from('leave_applications')
            .update({
                status: status,
                reviewer_comments: comments,
                reviewed_by: user?.id || null
            })
            .eq('id', leaveId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async function submitComplaint({ category, title, description, roomNo, studentName, studentRoll, photoUrl = null }) {
        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not active.');

        const user = window.AuthService.getUser();

        const { data, error } = await client
            .from('hostel_complaints')
            .insert({
                student_id: user?.id || null,
                student_name: studentName,
                student_roll: studentRoll,
                room_no: roomNo || 'Unassigned',
                category: category,
                title: title,
                description: description,
                photo_url: photoUrl,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async function getComplaints(studentRoll = null, statusFilter = null) {
        const client = window.SupabaseManager.getClient();
        if (!client) return [];

        let query = client
            .from('hostel_complaints')
            .select('*')
            .order('created_at', { ascending: false });

        if (studentRoll) query = query.eq('student_roll', studentRoll);
        if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter);

        const { data, error } = await query;
        if (error) return [];
        return data || [];
    }

    async function updateComplaintStatus(complaintId, status, resolutionNotes = '', assignedTo = '') {
        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not active.');

        const updates = {
            status: status,
            resolution_notes: resolutionNotes
        };
        if (assignedTo) updates.assigned_to = assignedTo;
        if (status === 'resolved') updates.resolved_at = new Date().toISOString();

        const { data, error } = await client
            .from('hostel_complaints')
            .update(updates)
            .eq('id', complaintId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ==========================================
    // 7. EMERGENCY DIRECTORY & HOSTEL SETTINGS
    // ==========================================
    async function getEmergencyContacts() {
        const settings = await window.LocationService.refreshSettings();
        return settings.emergency_contacts || [
            { name: "Hostel Warden Office", phone: "7447642019", role: "Warden In-Charge" },
            { name: "Security Main Gate", phone: "9404673711", role: "Campus Security" },
            { name: "Campus Medical Officer", phone: "108", role: "Ambulance / Emergency" },
            { name: "Hostel Rector", phone: "9168154088", role: "Chief Rector" }
        ];
    }

    async function updateHostelSettings(newSettings) {
        const client = window.SupabaseManager.getClient();
        if (!client) throw new Error('Database connection not active.');

        const { data, error } = await client
            .from('hostel_settings')
            .update({
                ...newSettings,
                updated_at: new Date().toISOString(),
                updated_by: window.AuthService.getUser()?.email || 'admin'
            })
            .eq('id', 1)
            .select()
            .single();

        if (error) throw error;
        await window.LocationService.refreshSettings();
        return data;
    }

    return {
        recordGateAction,
        getStudentGateLogs,
        getAllGateLogs,
        getWeeklyMessMenu,
        selectMealDiet,
        getStudentMealChoices,
        recordMessAttendance,
        getMessHeadcount,
        recordMorningAttendance,
        getMorningAttendanceLogs,
        getSportsFacilities,
        getSportsEquipment,
        bookSportsFacility,
        getSportsBookings,
        getLabFacilities,
        checkinLab,
        getLabAttendanceLogs,
        submitLeaveApplication,
        getLeaveApplications,
        reviewLeaveApplication,
        submitComplaint,
        getComplaints,
        updateComplaintStatus,
        getEmergencyContacts,
        updateHostelSettings
    };
})();

window.HostelService = HostelService;
