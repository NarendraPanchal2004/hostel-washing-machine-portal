/**
 * Hostel Washing Machine Booking Portal - Booking Service
 * 
 * Handles:
 * - 4 Machine listings
 * - 7-day rolling window dates (Today + 6 days)
 * - 75-minute slots calculation & status check
 * - Overlap detection and server-side RPC / Exclusion constraint handling
 * - Privacy protection (stripping student personal info for public views)
 */

const BookingService = (function () {
    const SLOT_DURATION_MINUTES = 75;

    // Default 4 Washing Machines specification (All 9.0 Kg capacity)
    const DEFAULT_MACHINES = [
        {
            id: 1,
            name: 'Machine 1 (Bay 1)',
            model: 'LG Commercial AI Direct Drive 9.0 Kg',
            capacity_kg: 9.0,
            status: 'available',
            active_from_date: null,
            location: 'Laundry Hall (Ground Floor, Bay 1)',
            photo_url: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80',
            instructions: 'Heavy 9 Kg Load. Best for bedsheets, jeans, and daily laundry. Quick: 15m, Normal: 45m, Heavy: 75m.'
        },
        {
            id: 2,
            name: 'Machine 2 (Bay 2)',
            model: 'Samsung Inverter Eco Drum 9.0 Kg',
            capacity_kg: 9.0,
            status: 'available',
            active_from_date: null,
            location: 'Laundry Hall (Ground Floor, Bay 2)',
            photo_url: 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=800&q=80',
            instructions: 'Heavy 9 Kg Load. High-efficiency wash with tangle-free drum. Great for sportswear and bulk wash.'
        },
        {
            id: 3,
            name: 'Machine 3 (Bay 3)',
            model: 'Bosch Serie 6 VarioDrum 9.0 Kg',
            capacity_kg: 9.0,
            status: 'available',
            active_from_date: null,
            location: 'Laundry Hall (Ground Floor, Bay 3)',
            photo_url: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=800&q=80',
            instructions: 'Heavy 9 Kg Load. Ultra-quiet brushless motor with anti-vibration walls for quiet evening washes.'
        },
        {
            id: 4,
            name: 'Machine 4 (Bay 4)',
            model: 'IFB Senator Heavy Steam Pro 9.0 Kg',
            capacity_kg: 9.0,
            status: 'available',
            active_from_date: null,
            location: 'Laundry Hall (Ground Floor, Bay 4)',
            photo_url: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
            instructions: 'Heavy 9 Kg Load. Steam allergy care. Perfect for winter blankets, heavy curtains, and hoodies.'
        }
    ];

    // Standard 75-minute operational slots (06:30 AM to 00:00 AM)
    const STANDARD_SLOT_STARTS = [
        '06:30', '07:45', '09:00', '10:15', '11:30',
        '12:45', '14:00', '15:15', '16:30', '17:45',
        '19:00', '20:15', '21:30', '22:45'
    ];

    /**
     * Get list of allowed booking dates: Today + next 6 days (7 rolling days)
     */
    function getBookingDateRange() {
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);

            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
            const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            dates.push({
                dateStr,
                dateObj: d,
                isToday: i === 0,
                isTomorrow: i === 1,
                label: i === 0 ? `Today (${monthDay})` : i === 1 ? `Tomorrow (${monthDay})` : `${weekday}, ${monthDay}`,
                shortLabel: i === 0 ? 'Today' : weekday,
                subLabel: monthDay
            });
        }
        return dates;
    }

    /**
     * Generate standard 75-min slots for a given date
     */
    function generateStandardSlotsForDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            dateStr = `${yyyy}-${mm}-${dd}`;
        }

        const slots = [];
        const now = new Date();
        const [year, month, day] = dateStr.split('-').map(Number);

        STANDARD_SLOT_STARTS.forEach((startStr, index) => {
            const [hours, mins] = startStr.split(':').map(Number);
            const startObj = new Date(year, (month || 1) - 1, day || 1, hours, mins, 0, 0);
            const endObj = new Date(startObj.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

            const endHours = String(endObj.getHours()).padStart(2, '0');
            const endMins = String(endObj.getMinutes()).padStart(2, '0');
            const endStr = `${endHours}:${endMins}`;

            const isPast = startObj < now;

            slots.push({
                slotIndex: index + 1,
                startTime: startStr,
                endTime: endStr,
                startISO: startObj.toISOString(),
                endISO: endObj.toISOString(),
                label: `${formatTime12h(startStr)} - ${formatTime12h(endStr)}`,
                isPast,
                durationMinutes: SLOT_DURATION_MINUTES
            });
        });

        return slots;
    }

    function formatTime12h(time24) {
        const [h, m] = time24.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    /**
     * Fetch all 4 machines from Supabase (or fallback defaults)
     */
    async function getMachines() {
        const fallback = getFallbackMachines();
        const client = window.SupabaseManager.getClient();
        if (!client) {
            return fallback;
        }

        try {
            const { data, error } = await client
                .from('machines')
                .select('*')
                .order('id', { ascending: true });

            if (error || !data || data.length === 0) {
                return fallback;
            }

            // Remote database is primary source of truth for all devices across hostel
            const merged = data.map(rm => {
                const fb = fallback.find(f => Number(f.id) === Number(rm.id)) || {};
                return { ...fb, ...rm };
            });

            // Cache to local storage for instant offline loading
            try {
                localStorage.setItem('HOSTELWASH_LOCAL_MACHINES', JSON.stringify(merged));
            } catch (e) {}

            return merged;
        } catch (e) {
            console.error('getMachines error:', e);
            return fallback;
        }
    }

    /**
     * Get slot availability for a machine on a given date
     * Ensures student privacy: doesn't return student roll, phone, or email to students
     */
    async function getMachineSlotAvailability(machineId, dateStr, currentMachineInfo = null) {
        const standardSlots = generateStandardSlotsForDate(dateStr);
        const client = window.SupabaseManager.getClient();

        let bookings = [];

        if (client) {
            try {
                // Try Privacy-Preserving RPC first
                const { data: rpcData, error: rpcError } = await client
                    .rpc('get_public_machine_slots', { p_date: dateStr });

                if (!rpcError && Array.isArray(rpcData)) {
                    bookings = rpcData.filter(b => b.machine_id === Number(machineId));
                } else {
                    // Fallback to direct select of non-sensitive columns
                    const { data: directData, error: directError } = await client
                        .from('bookings')
                        .select('id, machine_id, booking_date, start_time, end_time, status')
                        .eq('machine_id', machineId)
                        .eq('booking_date', dateStr)
                        .neq('status', 'cancelled');

                    if (!directError && directData) {
                        bookings = directData;
                    } else {
                        bookings = getLocalBookings(machineId, dateStr);
                    }
                }
            } catch (e) {
                console.warn('Could not query remote bookings, checking local storage:', e);
                bookings = getLocalBookings(machineId, dateStr);
            }
        } else {
            bookings = getLocalBookings(machineId, dateStr);
        }

        // Check machine active status for date from live machine info
        let machineInfo = currentMachineInfo;
        if (!machineInfo) {
            const fallbackMachines = getFallbackMachines();
            machineInfo = fallbackMachines.find(m => Number(m.id) === Number(machineId));
        }

        const isNotYetActive = machineInfo && machineInfo.active_from_date && dateStr < machineInfo.active_from_date;
        const isHardOffline = machineInfo && (machineInfo.status === 'maintenance' || machineInfo.status === 'offline');

        // Map over standard slots to determine availability
        const enrichedSlots = standardSlots.map(slot => {
            const slotStartMs = new Date(slot.startISO).getTime();
            const slotEndMs = new Date(slot.endISO).getTime();

            // Check if any confirmed/in_progress booking overlaps
            const matchedBooking = bookings.find(b => {
                if (b.status === 'cancelled') return false;
                const bStartMs = new Date(b.start_time).getTime();
                const bEndMs = new Date(b.end_time).getTime();
                // Overlap condition: bStart < slotEnd AND bEnd > slotStart
                return bStartMs < slotEndMs && bEndMs > slotStartMs;
            });

            let status = 'available';
            if (isNotYetActive) {
                status = 'offline';
            } else if (isHardOffline) {
                status = machineInfo.status;
            } else if (matchedBooking) {
                status = 'booked';
            } else if (slot.isPast) {
                status = 'past';
            }

            return {
                ...slot,
                status,
                isAvailable: status === 'available',
                bookingId: matchedBooking ? matchedBooking.id : null
            };
        });

        return enrichedSlots;
    }

    /**
     * Book a 75-minute slot with server-side validation & exclusion protection
     */
    async function bookWashingSlot({
        machineId,
        studentName,
        studentRoll,
        studentPhone,
        studentEmail,
        dateStr,
        startTimeISO
    }) {
        const client = window.SupabaseManager.getClient();
        const startObj = new Date(startTimeISO);
        const endObj = new Date(startObj.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

        // 1. Client-side sanity checks
        if (!studentName || !studentRoll || !studentPhone) {
            throw new Error('Please fill in your name, roll number, and phone number.');
        }

        if (studentPhone.replace(/\D/g, '').length < 10) {
            throw new Error('Please enter a valid 10-digit phone number.');
        }

        // 2. Validate rolling 7-day range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const bookingDate = new Date(`${dateStr}T00:00:00`);
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + 30);

        if (bookingDate < today) {
            throw new Error('You cannot book slots for past dates.');
        }

        if (bookingDate > maxDate) {
            throw new Error('Bookings are restricted to the next 30 days.');
        }

        // 3. Check machine operational status and schedule
        let machineInfo = null;
        try {
            if (client) {
                const { data } = await client.from('machines').select('id, status, active_from_date').eq('id', Number(machineId)).single();
                if (data) machineInfo = data;
            }
        } catch (e) {}

        if (!machineInfo) {
            const fallbackMachines = getFallbackMachines();
            machineInfo = fallbackMachines.find(m => Number(m.id) === Number(machineId));
        }

        if (machineInfo && machineInfo.active_from_date && dateStr < machineInfo.active_from_date) {
            throw new Error(`Machine ${machineId} is not operational on ${dateStr}. Scheduled to start on ${machineInfo.active_from_date}.`);
        }
        if (machineInfo && (machineInfo.status === 'maintenance' || machineInfo.status === 'offline')) {
            throw new Error(`Machine ${machineId} is currently ${machineInfo.status.toUpperCase()}. Bookings are disabled.`);
        }

        // 3. Remote Booking via Supabase
        if (client) {
            try {
                // Try Atomic Server-Side RPC
                const { data: rpcData, error: rpcError } = await client.rpc('book_washing_machine', {
                    p_machine_id: Number(machineId),
                    p_student_name: studentName.trim(),
                    p_student_roll: studentRoll.trim(),
                    p_student_phone: studentPhone.trim(),
                    p_student_email: (studentEmail || '').trim(),
                    p_start_time: startObj.toISOString()
                });

                if (rpcError) {
                    // Check if error is overlapping violation
                    handleSupabaseBookingError(rpcError);
                }

                if (rpcData && rpcData.success) {
                    try {
                        const saved = localStorage.getItem('HOSTELWASH_LOCAL_BOOKINGS');
                        const list = saved ? JSON.parse(saved) : [];
                        list.push({
                            id: rpcData.booking_id,
                            machine_id: Number(machineId),
                            student_name: studentName.trim(),
                            student_roll: studentRoll.trim(),
                            student_phone: studentPhone.trim(),
                            student_email: (studentEmail || '').trim(),
                            booking_date: dateStr,
                            start_time: startObj.toISOString(),
                            end_time: endObj.toISOString(),
                            status: 'confirmed',
                            reference_code: rpcData.reference_code,
                            created_at: new Date().toISOString()
                        });
                        localStorage.setItem('HOSTELWASH_LOCAL_BOOKINGS', JSON.stringify(list));
                    } catch (e) {}
                    return rpcData;
                }
            } catch (rpcErr) {
                // If RPC failed due to overlapping violation, bubble up immediately
                if (rpcErr.message && rpcErr.message.includes('SLOT_OVERLAP')) {
                    throw rpcErr;
                }

                console.warn('RPC book_washing_machine failed or not installed, trying direct insert:', rpcErr);

                // Fallback: Direct table INSERT protected by PostgreSQL Exclusion Constraint
                const refCode = `WM${machineId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

                const { data: insertData, error: insertError } = await client
                    .from('bookings')
                    .insert([{
                        machine_id: Number(machineId),
                        student_name: studentName.trim(),
                        student_roll: studentRoll.trim(),
                        student_phone: studentPhone.trim(),
                        student_email: (studentEmail || '').trim(),
                        booking_date: dateStr,
                        start_time: startObj.toISOString(),
                        end_time: endObj.toISOString(),
                        status: 'confirmed',
                        reference_code: refCode
                    }])
                    .select()
                    .single();

                if (insertError) {
                    const msg = insertError.message || '';
                    if (msg.includes('PGRST205') || msg.includes('bookings') || msg.includes('schema cache')) {
                        console.warn('Supabase table public.bookings not created yet. Gracefully saving booking locally.');
                        return bookLocalFallback({
                            machineId,
                            studentName,
                            studentRoll,
                            studentPhone,
                            studentEmail,
                            dateStr,
                            startISO: startObj.toISOString(),
                            endISO: endObj.toISOString()
                        });
                    }
                    handleSupabaseBookingError(insertError);
                }

                try {
                    const saved = localStorage.getItem('HOSTELWASH_LOCAL_BOOKINGS');
                    const list = saved ? JSON.parse(saved) : [];
                    list.push(insertData);
                    localStorage.setItem('HOSTELWASH_LOCAL_BOOKINGS', JSON.stringify(list));
                } catch (e) {}

                return {
                    success: true,
                    booking_id: insertData.id,
                    reference_code: refCode,
                    machine_id: Number(machineId),
                    student_name: studentName.trim(),
                    booking_date: dateStr,
                    start_time: startObj.toISOString(),
                    end_time: endObj.toISOString(),
                    duration_minutes: 75,
                    message: 'Slot successfully booked for 75 minutes!'
                };
            }
        }

        // 4. Local fallback storage (when offline or before configuring Supabase)
        return bookLocalFallback({
            machineId,
            studentName,
            studentRoll,
            studentPhone,
            studentEmail,
            dateStr,
            startISO: startObj.toISOString(),
            endISO: endObj.toISOString()
        });
    }

    function handleSupabaseBookingError(error) {
        console.error('Supabase booking error:', error);
        const msg = error.message || '';

        if (
            msg.includes('prevent_overlapping_machine_bookings') ||
            msg.includes('exclusion_violation') ||
            msg.includes('SLOT_OVERLAP') ||
            msg.includes('23P01')
        ) {
            throw new Error('SLOT CONFLICT: This machine has already been booked by another student for an overlapping 75-minute period. Please choose another available slot.');
        }

        if (msg.includes('check_exact_75_minutes')) {
            throw new Error('DURATION ERROR: Booking slot duration must be exactly 75 minutes.');
        }

        if (msg.includes('WINDOW_LIMIT_EXCEEDED') || msg.includes('PAST_DATE_ERROR')) {
            throw new Error('DATE WINDOW ERROR: Bookings are only permitted for today and the next 6 days.');
        }

        if (msg.includes('MACHINE_MAINTENANCE') || msg.includes('MACHINE_OFFLINE')) {
            throw new Error(msg);
        }

        throw new Error(msg || 'An unexpected error occurred while saving your booking.');
    }

    /**
     * Local Fallback / Offline Demo Handlers
     */
    function getFallbackMachines() {
        try {
            const saved = localStorage.getItem('HOSTELWASH_LOCAL_MACHINES');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return DEFAULT_MACHINES;
    }

    function getLocalBookings(machineId, dateStr) {
        try {
            const saved = localStorage.getItem('HOSTELWASH_LOCAL_BOOKINGS');
            if (saved) {
                const all = JSON.parse(saved);
                return all.filter(b => b.machine_id === Number(machineId) && b.booking_date === dateStr);
            }
        } catch (e) {}
        return [];
    }

    function bookLocalFallback({ machineId, studentName, studentRoll, studentPhone, studentEmail, dateStr, startISO, endISO }) {
        let all = [];
        try {
            const saved = localStorage.getItem('HOSTELWASH_LOCAL_BOOKINGS');
            if (saved) all = JSON.parse(saved);
        } catch (e) {}

        const startMs = new Date(startISO).getTime();
        const endMs = new Date(endISO).getTime();

        // Check local overlap
        const overlap = all.find(b => {
            if (b.machine_id !== Number(machineId) || b.status === 'cancelled') return false;
            const bStart = new Date(b.start_time).getTime();
            const bEnd = new Date(b.end_time).getTime();
            return bStart < endMs && bEnd > startMs;
        });

        if (overlap) {
            throw new Error('SLOT CONFLICT: This machine is already booked for this slot.');
        }

        const refCode = `WM${machineId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const newBooking = {
            id: 'local-' + Date.now(),
            machine_id: Number(machineId),
            student_name: studentName.trim(),
            student_roll: studentRoll.trim(),
            student_phone: studentPhone.trim(),
            student_email: (studentEmail || '').trim(),
            booking_date: dateStr,
            start_time: startISO,
            end_time: endISO,
            status: 'confirmed',
            reference_code: refCode,
            created_at: new Date().toISOString()
        };

        all.push(newBooking);
        localStorage.setItem('HOSTELWASH_LOCAL_BOOKINGS', JSON.stringify(all));

        return {
            success: true,
            booking_id: newBooking.id,
            reference_code: refCode,
            machine_id: Number(machineId),
            student_name: studentName.trim(),
            booking_date: dateStr,
            start_time: startISO,
            end_time: endISO,
            duration_minutes: 75,
            message: 'Slot booked locally (Connect Supabase for shared cloud sync)!'
        };
    }

    /**
     * Compute current active wash status and remaining minutes
     */
    async function getMachineActiveCycle(machineId) {
        const client = window.SupabaseManager.getClient();
        const now = new Date();
        const nowISO = now.toISOString();

        let activeBooking = null;

        if (client) {
            try {
                const { data, error } = await client
                    .from('bookings')
                    .select('id, machine_id, start_time, end_time, status')
                    .eq('machine_id', machineId)
                    .neq('status', 'cancelled')
                    .lte('start_time', nowISO)
                    .gte('end_time', nowISO)
                    .maybeSingle();

                if (!error && data) {
                    activeBooking = data;
                }
            } catch (e) {
                console.warn('Active cycle query failed:', e);
            }
        }

        if (activeBooking) {
            const endMs = new Date(activeBooking.end_time).getTime();
            const remainingMins = Math.max(1, Math.ceil((endMs - now.getTime()) / 60000));
            return {
                isActive: true,
                remainingMinutes: remainingMins,
                endTime: activeBooking.end_time,
                bookingId: activeBooking.id
            };
        }

        return { isActive: false, remainingMinutes: 0 };
    }

    /**
     * Fetch all bookings for a given date across all 4 machines in ONE single request
     */
    async function getAllBookingsForDate(dateStr) {
        const client = window.SupabaseManager.getClient();
        if (client) {
            try {
                const { data, error } = await client
                    .rpc('get_public_machine_slots', { p_date: dateStr });
                if (!error && Array.isArray(data)) {
                    return data;
                }
            } catch (e) {
                console.warn('RPC get_public_machine_slots fallback:', e);
            }

            try {
                const { data, error } = await client
                    .from('bookings')
                    .select('id, machine_id, booking_date, start_time, end_time, status')
                    .eq('booking_date', dateStr)
                    .neq('status', 'cancelled');
                if (!error && Array.isArray(data)) {
                    return data;
                }
            } catch (e) {}
        }

        // Local storage fallback
        try {
            const saved = localStorage.getItem('HOSTELWASH_LOCAL_BOOKINGS');
            if (saved) {
                const all = JSON.parse(saved);
                return all.filter(b => b.booking_date === dateStr && b.status !== 'cancelled');
            }
        } catch (e) {}
        return [];
    }

    /**
     * Compute active wash cycles for all 4 machines in ONE single request
     */
    async function getAllActiveCycles() {
        const client = window.SupabaseManager.getClient();
        const now = new Date();
        const nowISO = now.toISOString();
        const activeCycles = { 1: { isActive: false }, 2: { isActive: false }, 3: { isActive: false }, 4: { isActive: false } };

        if (client) {
            try {
                const { data, error } = await client
                    .from('bookings')
                    .select('id, machine_id, start_time, end_time, status')
                    .neq('status', 'cancelled')
                    .lte('start_time', nowISO)
                    .gte('end_time', nowISO);

                if (!error && Array.isArray(data)) {
                    data.forEach(b => {
                        const endMs = new Date(b.end_time).getTime();
                        const remainingMins = Math.max(1, Math.ceil((endMs - now.getTime()) / 60000));
                        activeCycles[b.machine_id] = {
                            isActive: true,
                            remainingMinutes: remainingMins,
                            endTime: b.end_time,
                            bookingId: b.id
                        };
                    });
                }
            } catch (e) {}
        }
        return activeCycles;
    }

    return {
        SLOT_DURATION_MINUTES,
        STANDARD_SLOT_STARTS,
        getBookingDateRange,
        generateStandardSlotsForDate,
        getMachines,
        getMachineSlotAvailability,
        getAllBookingsForDate,
        getAllActiveCycles,
        bookWashingSlot,
        getMachineActiveCycle
    };
})();

// Export globally
window.BookingService = BookingService;
