/**
 * Hostel Washing Machine Booking Portal - Main Controller (script.js)
 * 
 * Orchestrates:
 * - 4 Machine live cards & status badges
 * - 7-day rolling window dates & selection
 * - 75-minute slot calculations & booking validation
 * - Overlap error handling & feedback
 * - Realtime Supabase synchronization
 * - QR code URL detection (?machine=X)
 * - Admin authentication, machine status toggles, photo uploads, & PDF reports
 */

(function () {
    'use strict';

    // Application State
    const state = {
        selectedDateStr: '',
        selectedDateObj: null,
        machines: [],
        currentBookingMachineId: null,
        selectedSlot: null,
        countdownIntervals: []
    };

    // DOM Elements Cache
    const elements = {};

    function cacheDomElements() {
        elements.themeToggle = document.getElementById('theme-toggle');
        elements.sunIcon = document.getElementById('sun-icon');
        elements.moonIcon = document.getElementById('moon-icon');
        elements.dbStatusPill = document.getElementById('db-status-pill');
        elements.dbStatusDot = document.getElementById('db-status-dot');
        elements.dbStatusText = document.getElementById('db-status-text');
        elements.btnShowAllQr = document.getElementById('btn-show-all-qr');
        elements.btnAdminAuth = document.getElementById('btn-admin-auth');
        elements.adminBtnText = document.getElementById('admin-btn-text');
        elements.datePillsBar = document.getElementById('date-pills-bar');
        elements.machinesContainer = document.getElementById('machines-container');
        elements.kpiAvailable = document.getElementById('kpi-available-count');
        elements.kpiInUse = document.getElementById('kpi-inuse-count');
        elements.kpiTodayBookings = document.getElementById('kpi-today-bookings');

        // Modals
        elements.bookingModal = document.getElementById('booking-modal');
        elements.passModal = document.getElementById('pass-modal');
        elements.modesModal = document.getElementById('modes-modal');
        elements.qrModal = document.getElementById('qr-modal');
        elements.adminLoginModal = document.getElementById('admin-login-modal');
        elements.adminDashboardModal = document.getElementById('admin-dashboard-modal');
        elements.setupModal = document.getElementById('setup-modal');
        elements.toastContainer = document.getElementById('toast-container');

        // Booking Modal Fields
        elements.bmMachineName = document.getElementById('bm-machine-name');
        elements.bmMachineId = document.getElementById('bm-machine-id');
        elements.bmDate = document.getElementById('bm-date');
        elements.bmSlotsGrid = document.getElementById('bm-slots-grid');
        elements.bmSelectedStartISO = document.getElementById('bm-selected-start-iso');
        elements.bmSelectedEndISO = document.getElementById('bm-selected-end-iso');
        elements.bmSlotSummaryText = document.getElementById('bm-slot-summary-text');
        elements.bmStudentName = document.getElementById('bm-student-name');
        elements.bmStudentRoll = document.getElementById('bm-student-roll');
        elements.bmStudentPhone = document.getElementById('bm-student-phone');
        elements.bmStudentEmail = document.getElementById('bm-student-email');
        elements.btnConfirmBooking = document.getElementById('btn-confirm-booking');

        // Admin Fields
        elements.btnSubmitAdminLogin = document.getElementById('btn-submit-admin-login');
        elements.adminEmailInput = document.getElementById('admin-email-input');
        elements.adminPasswordInput = document.getElementById('admin-password-input');
        elements.adminLoginError = document.getElementById('admin-login-error');
        elements.btnAdminLogout = document.getElementById('btn-admin-logout');
        elements.adminMachinesList = document.getElementById('admin-machines-list');
        elements.adminBookingsTbody = document.getElementById('admin-bookings-tbody');
        elements.adminBookingsDateFilter = document.getElementById('admin-bookings-date-filter');
        elements.adminBookingsMachineFilter = document.getElementById('admin-bookings-machine-filter');
        elements.adminBookingsSearch = document.getElementById('admin-bookings-search');
        elements.btnDownloadPdfReport = document.getElementById('btn-download-pdf-report');
        elements.pdfReportDate = document.getElementById('pdf-report-date');
        elements.pdfReportMachineFilter = document.getElementById('pdf-report-machine-filter');

        // Setup Modal Fields
        elements.setupSupabaseUrl = document.getElementById('setup-supabase-url');
        elements.setupSupabaseAnonKey = document.getElementById('setup-supabase-anon-key');
        elements.btnTestSupabaseConn = document.getElementById('btn-test-supabase-conn');
        elements.btnSaveSupabaseConn = document.getElementById('btn-save-supabase-conn');
        elements.setupTestResult = document.getElementById('setup-test-result');
    }

    /**
     * Application Bootstrapper
     */
    async function init() {
        console.log('Bootstrapping HostelWash application...');
        try { cacheDomElements(); } catch (e) { console.error('cacheDomElements failed:', e); }
        try { initTheme(); } catch (e) { console.error('initTheme failed:', e); }

        // 1. Immediately setup 7-Day Rolling Date Selector so pills render instantly
        try { initDateSelector(); } catch (e) { console.error('initDateSelector failed:', e); }

        // 2. Immediately Load & Render 4 Machines
        try { await reloadMachines(); } catch (e) { console.error('reloadMachines failed:', e); }

        // 3. Initialize Modals and UI Interactions
        try { initModalEvents(); } catch (e) { console.error('initModalEvents failed:', e); }
        try { initSetupModal(); } catch (e) { console.error('initSetupModal failed:', e); }
        try { initAdminAuth(); } catch (e) { console.error('initAdminAuth failed:', e); }

        // 4. Initialize Supabase Connection
        try {
            window.SupabaseManager.initClient();
            window.SupabaseManager.onStateChange(handleDbStateChange);
        } catch (e) {
            console.error('SupabaseManager init failed:', e);
        }

        // 5. Setup Realtime Listener
        try {
            window.SupabaseManager.subscribeRealtime(
                () => {
                    console.log('Realtime update detected, reloading machines...');
                    reloadMachines();
                },
                () => {
                    console.log('Realtime booking update detected, reloading machine slots...');
                    reloadMachines();
                    if (elements.adminDashboardModal && elements.adminDashboardModal.classList.contains('active')) {
                        loadAdminBookings();
                    }
                }
            );
        } catch (e) {
            console.error('Realtime subscription failed:', e);
        }

        // 6. Check if user arrived via QR Code scan (e.g. ?machine=2)
        try { handleQrScanUrl(); } catch (e) { console.error('handleQrScanUrl failed:', e); }

        // 7. Setup Live Countdown Timer Interval (runs every 30s)
        setInterval(updateActiveWashCountdowns, 30000);
        console.log('HostelWash application bootstrapped successfully.');
    }

    /**
     * Theme Toggle Management (Light / Dark)
     */
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcons(savedTheme);

        elements.themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            updateThemeIcons(next);
        });
    }

    function updateThemeIcons(theme) {
        if (theme === 'dark') {
            elements.sunIcon.style.display = 'none';
            elements.moonIcon.style.display = 'block';
        } else {
            elements.sunIcon.style.display = 'block';
            elements.moonIcon.style.display = 'none';
        }
    }

    /**
     * Database Connection State UI Handler
     */
    function handleDbStateChange(stateStatus, message) {
        if (!elements.dbStatusDot || !elements.dbStatusText) return;

        elements.dbStatusDot.className = 'status-dot';

        if (stateStatus === 'connected') {
            elements.dbStatusDot.classList.add('connected');
            elements.dbStatusText.textContent = 'Live Cloud Sync';
        } else if (stateStatus === 'connecting') {
            elements.dbStatusDot.classList.add('connecting');
            elements.dbStatusText.textContent = 'Connecting...';
        } else if (stateStatus === 'error') {
            elements.dbStatusDot.classList.add('error');
            elements.dbStatusText.textContent = 'Connection Issue (Click to Setup)';
        } else {
            elements.dbStatusText.textContent = 'Setup Supabase (Click)';
        }
    }

    /**
     * 7-Day Rolling Date Selector Bar
     */
    function initDateSelector() {
        const dateRange = window.BookingService.getBookingDateRange();
        elements.datePillsBar.innerHTML = '';

        // Default to today
        state.selectedDateStr = dateRange[0].dateStr;
        state.selectedDateObj = dateRange[0].dateObj;

        dateRange.forEach((item, index) => {
            const pill = document.createElement('div');
            pill.className = `date-pill ${index === 0 ? 'active' : ''}`;
            pill.dataset.date = item.dateStr;

            pill.innerHTML = `
                <span class="pill-weekday">${item.shortLabel}</span>
                <span class="pill-daynum">${item.subLabel}</span>
            `;

            pill.addEventListener('click', () => {
                document.querySelectorAll('.date-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                state.selectedDateStr = item.dateStr;
                state.selectedDateObj = item.dateObj;
                renderMachineCards();
            });

            elements.datePillsBar.appendChild(pill);
        });
    }

    /**
     * Reload & Render Machines
     */
    async function reloadMachines() {
        try {
            state.machines = await window.BookingService.getMachines();
            await renderMachineCards();
            updateKpiMetrics();
        } catch (err) {
            console.error('Failed to load machines:', err);
            showToast('Could not load machines.', 'error');
        }
    }

    async function renderMachineCards() {
        const container = elements.machinesContainer || document.getElementById('machines-container');
        if (!container) {
            console.error('machines-container DOM element not found');
            return;
        }
        container.innerHTML = '';

        if (!state.machines || state.machines.length === 0) {
            try {
                state.machines = await window.BookingService.getMachines();
            } catch (e) {
                console.warn('Could not fetch machines, falling back to defaults:', e);
            }
        }

        for (const machine of state.machines) {
            try {
                const card = document.createElement('article');
                card.className = `machine-card ${machine.status}`;
                card.id = `machine-card-${machine.id}`;

            // Fetch active 75-min cycle
            const activeCycle = await window.BookingService.getMachineActiveCycle(machine.id);

            // Fetch 75-min slots for selected date
            const slots = await window.BookingService.getMachineSlotAvailability(machine.id, state.selectedDateStr);

            // Compute available slots count
            const availableCount = slots.filter(s => s.status === 'available').length;

            const photoUrl = machine.photo_url || 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80';

            const statusBadgeMap = {
                available: '<span class="machine-badge-overlay badge-available">● Available</span>',
                in_use: '<span class="machine-badge-overlay badge-in_use">● In Use (75m Cycle)</span>',
                maintenance: '<span class="machine-badge-overlay badge-maintenance">⚠ Maintenance</span>',
                offline: '<span class="machine-badge-overlay badge-offline">○ Offline</span>'
            };

            card.innerHTML = `
                <div class="machine-photo-wrapper">
                    <img class="machine-photo-img" src="${photoUrl}" alt="${machine.name}" loading="lazy">
                    ${statusBadgeMap[machine.status] || statusBadgeMap.available}
                    <button class="machine-qr-trigger" title="Machine ${machine.id} QR Code" data-qr-machine="${machine.id}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                    </button>
                </div>

                <div class="machine-card-body">
                    <div class="machine-title-row">
                        <div>
                            <h3 class="machine-title">${machine.name}</h3>
                            <p class="machine-model">${machine.model}</p>
                        </div>
                    </div>

                    <div class="machine-specs-row">
                        <span class="spec-badge">⚖️ ${machine.capacity_kg} Kg Capacity</span>
                        <span class="spec-badge">⏱️ 75m Fixed Slot</span>
                        <span class="spec-badge">📍 Bay ${machine.id}</span>
                    </div>

                    ${activeCycle.isActive ? `
                        <div class="cycle-countdown-badge">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>Wash Cycle Running: <strong>${activeCycle.remainingMinutes}m</strong> remaining</span>
                        </div>
                    ` : ''}

                    <!-- 75-Min Slot Timeline Chips Preview -->
                    <div class="slots-preview-title">
                        <span>Slots for ${state.selectedDateStr}</span>
                        <span style="color: var(--available-color);">${availableCount} Available</span>
                    </div>
                    <div class="slots-chips-grid">
                        ${slots.map(s => `
                            <div class="slot-chip ${s.status}" title="${s.label} (${s.status.toUpperCase()})" data-slot-start="${s.startISO}">
                                ${s.startTime}
                            </div>
                        `).join('')}
                    </div>

                    <div class="machine-card-footer">
                        <button class="btn btn-secondary btn-modes-guide" data-machine-id="${machine.id}">
                            <span>Washing Modes</span>
                        </button>
                        <button class="btn btn-primary btn-book-slot" data-machine-id="${machine.id}" ${machine.status === 'offline' || machine.status === 'maintenance' ? 'disabled' : ''}>
                            <span>Book 75-Min Slot</span>
                        </button>
                    </div>
                </div>
            `;

                container.appendChild(card);
            } catch (err) {
                console.error(`Error rendering machine ${machine.id}:`, err);
            }
        }

        // Attach Card Button Listeners
        document.querySelectorAll('.btn-book-slot').forEach(btn => {
            btn.addEventListener('click', () => {
                const machineId = Number(btn.dataset.machineId);
                openBookingModal(machineId);
            });
        });

        document.querySelectorAll('.btn-modes-guide').forEach(btn => {
            btn.addEventListener('click', () => {
                const machineId = Number(btn.dataset.machineId);
                openModesModal(machineId);
            });
        });

        document.querySelectorAll('.machine-qr-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openQrModal();
            });
        });
    }

    /**
     * Update KPI Cards Summary
     */
    function updateKpiMetrics() {
        const available = state.machines.filter(m => m.status === 'available').length;
        const inUse = state.machines.filter(m => m.status === 'in_use').length;

        elements.kpiAvailable.textContent = `${available} / 4`;
        elements.kpiInUse.textContent = `${inUse}`;
    }

    /**
     * Open 75-Minute Booking Modal for a Machine
     */
    async function openBookingModal(machineId) {
        state.currentBookingMachineId = machineId;
        state.selectedSlot = null;

        const machine = state.machines.find(m => m.id === machineId);
        if (!machine) return;

        elements.bmMachineName.value = machine.name;
        elements.bmMachineId.value = machine.id;
        elements.bmDate.value = state.selectedDateStr;
        elements.bmSelectedStartISO.value = '';
        elements.bmSelectedEndISO.value = '';
        elements.bmSlotSummaryText.textContent = 'Please choose an available 75-minute slot:';
        elements.btnConfirmBooking.disabled = true;

        // Fetch slots
        elements.bmSlotsGrid.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-muted); padding: 10px;">Loading real-time slot availability...</p>';
        openModal(elements.bookingModal);

        const slots = await window.BookingService.getMachineSlotAvailability(machineId, state.selectedDateStr);
        elements.bmSlotsGrid.innerHTML = '';

        slots.forEach(slot => {
            const card = document.createElement('div');
            card.className = `slot-selection-card ${slot.status}`;
            card.dataset.startIso = slot.startISO;
            card.dataset.endIso = slot.endISO;

            card.innerHTML = `
                <span class="slot-time-text">${slot.label}</span>
                <span class="slot-status-text">${slot.status.toUpperCase()}</span>
            `;

            if (slot.status === 'available') {
                card.addEventListener('click', () => {
                    document.querySelectorAll('.slot-selection-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    state.selectedSlot = slot;
                    elements.bmSelectedStartISO.value = slot.startISO;
                    elements.bmSelectedEndISO.value = slot.endISO;
                    elements.bmSlotSummaryText.innerHTML = `Selected 75-min slot: <strong>${slot.label}</strong>`;
                    elements.btnConfirmBooking.disabled = false;
                });
            }

            elements.bmSlotsGrid.appendChild(card);
        });
    }

    /**
     * Confirm Booking Flow with Overlap Protection
     */
    async function handleBookingSubmission() {
        if (!state.selectedSlot || !elements.bmSelectedStartISO.value) {
            showToast('Please select an available 75-minute slot.', 'warning');
            return;
        }

        const studentName = elements.bmStudentName.value.trim();
        const studentRoll = elements.bmStudentRoll.value.trim();
        const studentPhone = elements.bmStudentPhone.value.trim();
        const studentEmail = elements.bmStudentEmail.value.trim();

        if (!studentName || !studentRoll || !studentPhone) {
            showToast('Please fill in your name, roll number, and phone number.', 'warning');
            return;
        }

        if (studentPhone.replace(/\D/g, '').length < 10) {
            showToast('Please enter a valid 10-digit mobile number.', 'warning');
            return;
        }

        elements.btnConfirmBooking.disabled = true;
        elements.btnConfirmBooking.innerHTML = '<span>Checking Database & Booking...</span>';

        try {
            const result = await window.BookingService.bookWashingSlot({
                machineId: state.currentBookingMachineId,
                studentName,
                studentRoll,
                studentPhone,
                studentEmail,
                dateStr: state.selectedDateStr,
                startTimeISO: elements.bmSelectedStartISO.value
            });

            closeModal(elements.bookingModal);
            showToast('Booking Confirmed! Pass generated.', 'success');

            // Open Digital Pass
            openPassModal(result);

            // Refresh cards
            await reloadMachines();

            // Clear inputs
            elements.bmStudentName.value = '';
            elements.bmStudentRoll.value = '';
            elements.bmStudentPhone.value = '';
            elements.bmStudentEmail.value = '';
        } catch (err) {
            console.error('Booking conflict or error:', err);
            // Friendly error message for overlap / constraints
            showToast(err.message, 'error');
            // Refresh slots to show newly taken slot
            openBookingModal(state.currentBookingMachineId);
        } finally {
            elements.btnConfirmBooking.disabled = false;
            elements.btnConfirmBooking.innerHTML = '<span>Confirm 75-Min Booking</span>';
        }
    }

    /**
     * Digital Pass Modal Display
     */
    function openPassModal(bookingData) {
        const passRef = document.getElementById('pass-ref-code');
        const passMachine = document.getElementById('pass-machine-title');
        const passStudent = document.getElementById('pass-student-name');
        const passDate = document.getElementById('pass-date');
        const passSlotTime = document.getElementById('pass-slot-time');

        passRef.textContent = bookingData.reference_code;
        passMachine.textContent = bookingData.machine_name || `Washing Machine ${bookingData.machine_id}`;
        passStudent.textContent = bookingData.student_name;
        passDate.textContent = bookingData.booking_date;

        const start = new Date(bookingData.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const end = new Date(bookingData.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        passSlotTime.textContent = `${start} - ${end} (75 Mins)`;

        openModal(elements.passModal);
    }

    /**
     * Washing Modes & Photo Guide Modal
     */
    function openModesModal(machineId) {
        const machine = state.machines.find(m => m.id === machineId);
        if (!machine) return;

        document.getElementById('modes-modal-title').textContent = `${machine.name} - Washing Modes`;
        document.getElementById('modes-modal-img').src = machine.photo_url || 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80';
        document.getElementById('modes-instructions-text').innerHTML = `
            <p><strong>Recommended Cycle Settings:</strong></p>
            <ul style="padding-left: 20px; margin: 8px 0;">
                <li><strong>Quick Wash (15 mins):</strong> Lightly soiled shirts, socks, gym wear.</li>
                <li><strong>Daily Cotton (45 mins):</strong> T-shirts, trousers, day-to-day casual wear.</li>
                <li><strong>Heavy Wash / Steam (75 mins):</strong> Bedsheets, blankets, heavy hoodies, jeans.</li>
            </ul>
            <p><strong>Hostel Machine Guidelines:</strong> ${machine.instructions || 'Clean drum lint filter after use.'}</p>
        `;

        openModal(elements.modesModal);
    }

    /**
     * 4 Machine QR Codes Modal
     */
    function openQrModal() {
        const container = document.getElementById('qr-all-cards-container');
        window.QRService.renderAllMachineQRCards(container, state.machines);
        openModal(elements.qrModal);
    }

    /**
     * Check if arrived via QR Code URL (e.g. ?machine=3)
     */
    function handleQrScanUrl() {
        const preselectedMachineId = window.QRService.getPreselectedMachineFromUrl();
        if (preselectedMachineId) {
            console.log(`Arrived via QR code for Machine ${preselectedMachineId}`);
            showToast(`QR Code Scanned: Selected Machine ${preselectedMachineId}`, 'info');

            // Scroll to machine card and highlight it
            setTimeout(() => {
                const card = document.getElementById(`machine-card-${preselectedMachineId}`);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.style.outline = '3px solid var(--primary-color)';
                    setTimeout(() => card.style.outline = '', 3000);
                }
                openBookingModal(preselectedMachineId);
            }, 500);
        }
    }

    /**
     * Active Wash Cycle Timer Updates
     */
    async function updateActiveWashCountdowns() {
        if (!state.machines || state.machines.length === 0) return;
        for (const machine of state.machines) {
            const activeCycle = await window.BookingService.getMachineActiveCycle(machine.id);
            const card = document.getElementById(`machine-card-${machine.id}`);
            if (card) {
                let badge = card.querySelector('.cycle-countdown-badge');
                if (activeCycle.isActive) {
                    if (badge) {
                        badge.querySelector('strong').textContent = `${activeCycle.remainingMinutes}m`;
                    } else {
                        // Re-render
                        renderMachineCards();
                        break;
                    }
                } else if (badge) {
                    renderMachineCards();
                    break;
                }
            }
        }
    }

    /**
     * Admin Authentication & Operations
     */
    function initAdminAuth() {
        window.AdminService.initAuth();

        window.AdminService.onAuthStateChange((user) => {
            if (user) {
                elements.adminBtnText.textContent = 'Admin Portal';
                elements.btnAdminAuth.classList.add('btn-primary');
                elements.btnAdminAuth.classList.remove('btn-outline');
            } else {
                elements.adminBtnText.textContent = 'Admin Login';
                elements.btnAdminAuth.classList.remove('btn-primary');
                elements.btnAdminAuth.classList.add('btn-outline');
            }
        });

        elements.btnAdminAuth.addEventListener('click', () => {
            if (window.AdminService.isAuthenticated()) {
                openAdminDashboard();
            } else {
                elements.adminLoginError.style.display = 'none';
                openModal(elements.adminLoginModal);
            }
        });

        elements.btnSubmitAdminLogin.addEventListener('click', handleAdminLogin);

        elements.btnAdminLogout.addEventListener('click', async () => {
            await window.AdminService.logout();
            closeModal(elements.adminDashboardModal);
            showToast('Admin logged out successfully.', 'info');
        });

        // Admin Tab Switching
        document.querySelectorAll('.admin-tab-btn').forEach(tabBtn => {
            tabBtn.addEventListener('click', () => {
                document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');

                tabBtn.classList.add('active');
                const targetContent = document.getElementById(tabBtn.dataset.tab);
                if (targetContent) targetContent.style.display = 'block';

                if (tabBtn.dataset.tab === 'tab-manage-bookings') {
                    loadAdminBookings();
                }
            });
        });

        // Admin Bookings Filters
        elements.adminBookingsDateFilter.value = state.selectedDateStr;
        elements.pdfReportDate.value = state.selectedDateStr;

        elements.adminBookingsDateFilter.addEventListener('change', loadAdminBookings);
        elements.adminBookingsMachineFilter.addEventListener('change', loadAdminBookings);
        elements.adminBookingsSearch.addEventListener('input', debounce(loadAdminBookings, 300));

        // PDF Report Download Trigger
        elements.btnDownloadPdfReport.addEventListener('click', async () => {
            const reportDate = elements.pdfReportDate.value;
            const machineFilter = elements.pdfReportMachineFilter.value;
            if (!reportDate) {
                showToast('Please select a date for the PDF report.', 'warning');
                return;
            }

            try {
                showToast('Generating official PDF report...', 'info');
                await window.AdminService.downloadDateWisePdfReport(reportDate, machineFilter);
                showToast('PDF Report downloaded successfully!', 'success');
            } catch (err) {
                showToast(err.message || 'Failed to generate PDF report.', 'error');
            }
        });
    }

    async function handleAdminLogin() {
        const email = elements.adminEmailInput.value.trim();
        const password = elements.adminPasswordInput.value;

        if (!email || !password) {
            elements.adminLoginError.textContent = 'Please enter email and password.';
            elements.adminLoginError.style.display = 'block';
            return;
        }

        elements.btnSubmitAdminLogin.disabled = true;
        elements.btnSubmitAdminLogin.innerHTML = '<span>Signing In...</span>';

        try {
            await window.AdminService.login(email, password);
            closeModal(elements.adminLoginModal);
            showToast('Admin authenticated successfully.', 'success');
            openAdminDashboard();
        } catch (err) {
            elements.adminLoginError.textContent = err.message || 'Login failed.';
            elements.adminLoginError.style.display = 'block';
        } finally {
            elements.btnSubmitAdminLogin.disabled = false;
            elements.btnSubmitAdminLogin.innerHTML = '<span>Log In as Admin</span>';
        }
    }

    function openAdminDashboard() {
        openModal(elements.adminDashboardModal);
        renderAdminMachineControls();
        loadAdminBookings();
    }

    function renderAdminMachineControls() {
        elements.adminMachinesList.innerHTML = '';

        state.machines.forEach(machine => {
            const row = document.createElement('div');
            row.className = 'kpi-card';
            row.style.display = 'flex';
            row.style.flexDirection = 'column';
            row.style.gap = '10px';

            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div>
                        <strong style="font-size: 1rem;">${machine.name}</strong>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">${machine.model} (${machine.capacity_kg} Kg)</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="font-size: 0.82rem; font-weight: 600;">Status:</label>
                        <select class="form-select admin-status-select" data-machine-id="${machine.id}" style="width: 140px; padding: 6px 10px;">
                            <option value="available" ${machine.status === 'available' ? 'selected' : ''}>Available</option>
                            <option value="in_use" ${machine.status === 'in_use' ? 'selected' : ''}>In Use</option>
                            <option value="maintenance" ${machine.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                            <option value="offline" ${machine.status === 'offline' ? 'selected' : ''}>Offline</option>
                        </select>
                    </div>
                </div>

                <!-- Photo Upload Field for Washing Modes -->
                <div style="border-top: 1px solid var(--border-color); padding-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                    <div style="font-size: 0.82rem; color: var(--text-secondary);">
                        📷 Mode Guide Photo: <a href="${machine.photo_url || '#'}" target="_blank" style="color: var(--primary-color);">View Current Photo</a>
                    </div>
                    <label class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; cursor: pointer;">
                        <span>Upload New Guide Photo</span>
                        <input type="file" class="admin-photo-input" data-machine-id="${machine.id}" accept="image/*" style="display: none;">
                    </label>
                </div>
            `;

            elements.adminMachinesList.appendChild(row);
        });

        // Status change handlers
        document.querySelectorAll('.admin-status-select').forEach(sel => {
            sel.addEventListener('change', async () => {
                const machineId = Number(sel.dataset.machineId);
                const newStatus = sel.value;
                try {
                    await window.AdminService.updateMachineStatus(machineId, newStatus);
                    showToast(`Machine ${machineId} status updated to ${newStatus}.`, 'success');
                    reloadMachines();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });

        // Photo upload handlers
        document.querySelectorAll('.admin-photo-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const machineId = Number(input.dataset.machineId);
                try {
                    showToast('Uploading mode photo to Supabase Storage...', 'info');
                    const publicUrl = await window.AdminService.uploadWashingModePhoto(machineId, file);
                    showToast('Mode photo uploaded and updated!', 'success');
                    reloadMachines();
                    renderAdminMachineControls();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });
    }

    async function loadAdminBookings() {
        const dateFilter = elements.adminBookingsDateFilter.value;
        const machineFilter = elements.adminBookingsMachineFilter.value;
        const searchStr = elements.adminBookingsSearch.value;

        elements.adminBookingsTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 16px;">Loading bookings...</td></tr>';

        try {
            const bookings = await window.AdminService.getAllBookings({
                dateFilter,
                machineFilter,
                searchStr
            });

            elements.adminBookingsTbody.innerHTML = '';

            if (bookings.length === 0) {
                elements.adminBookingsTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px; color: var(--text-muted);">No bookings found matching filters.</td></tr>';
                return;
            }

            bookings.forEach(b => {
                const start = new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const end = new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const machineName = b.machines?.name || `Machine ${b.machine_id}`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${b.reference_code}</strong></td>
                    <td>${machineName}</td>
                    <td>${start} - ${end}</td>
                    <td>${b.student_name}</td>
                    <td>${b.student_roll}</td>
                    <td>${b.student_phone}</td>
                    <td><span class="spec-badge" style="text-transform: uppercase;">${b.status}</span></td>
                    <td>
                        ${b.status === 'confirmed' ? `
                            <button class="btn btn-danger btn-cancel-booking" data-booking-id="${b.id}" style="padding: 4px 10px; font-size: 0.75rem;">
                                Cancel
                            </button>
                        ` : `<span style="font-size: 0.78rem; color: var(--text-muted);">-</span>`}
                    </td>
                `;

                elements.adminBookingsTbody.appendChild(tr);
            });

            // Attach Cancel Handlers
            document.querySelectorAll('.btn-cancel-booking').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const bookingId = btn.dataset.bookingId;
                    if (confirm('Are you sure you want to cancel this booking? This will immediately free up the 75-min slot for other students.')) {
                        try {
                            await window.AdminService.cancelBooking(bookingId);
                            showToast('Booking cancelled. Slot is now available.', 'success');
                            loadAdminBookings();
                            reloadMachines();
                        } catch (err) {
                            showToast(err.message, 'error');
                        }
                    }
                });
            });
        } catch (err) {
            elements.adminBookingsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 16px; color: var(--busy-color);">${err.message}</td></tr>`;
        }
    }

    /**
     * Supabase Connection Setup Modal
     */
    function initSetupModal() {
        elements.dbStatusPill.addEventListener('click', () => {
            const config = window.AppConfig.getConfig();
            elements.setupSupabaseUrl.value = config.supabaseUrl || '';
            elements.setupSupabaseAnonKey.value = config.supabaseAnonKey || '';
            elements.setupTestResult.style.display = 'none';
            openModal(elements.setupModal);
        });

        elements.btnTestSupabaseConn.addEventListener('click', async () => {
            const url = elements.setupSupabaseUrl.value.trim();
            const key = elements.setupSupabaseAnonKey.value.trim();

            if (!url || !key) {
                elements.setupTestResult.style.display = 'block';
                elements.setupTestResult.style.backgroundColor = 'var(--busy-light)';
                elements.setupTestResult.style.color = 'var(--busy-color)';
                elements.setupTestResult.textContent = 'Please enter both Supabase URL and Anon Key.';
                return;
            }

            elements.btnTestSupabaseConn.disabled = true;
            elements.btnTestSupabaseConn.textContent = 'Testing...';

            try {
                const tempClient = window.supabase.createClient(url, key);
                const { data, error } = await tempClient.from('machines').select('id').limit(1);

                elements.setupTestResult.style.display = 'block';
                if (error) {
                    elements.setupTestResult.style.backgroundColor = 'var(--warning-light)';
                    elements.setupTestResult.style.color = 'var(--warning-color)';
                    elements.setupTestResult.textContent = `Connected to Supabase, but machines table returned: ${error.message}. (Did you run the schema.sql script?)`;
                } else {
                    elements.setupTestResult.style.backgroundColor = 'var(--available-light)';
                    elements.setupTestResult.style.color = 'var(--available-color)';
                    elements.setupTestResult.textContent = `✓ Success! Connected to database. Found ${data ? data.length : 0} record(s).`;
                }
            } catch (err) {
                elements.setupTestResult.style.display = 'block';
                elements.setupTestResult.style.backgroundColor = 'var(--busy-light)';
                elements.setupTestResult.style.color = 'var(--busy-color)';
                elements.setupTestResult.textContent = `Connection failed: ${err.message}`;
            } finally {
                elements.btnTestSupabaseConn.disabled = false;
                elements.btnTestSupabaseConn.textContent = 'Test Connection';
            }
        });

        elements.btnSaveSupabaseConn.addEventListener('click', () => {
            const url = elements.setupSupabaseUrl.value.trim();
            const key = elements.setupSupabaseAnonKey.value.trim();

            if (!url || !key) {
                showToast('Please enter both Supabase URL and Anon Key.', 'warning');
                return;
            }

            window.AppConfig.saveConfig(url, key);
            window.SupabaseManager.initClient();
            closeModal(elements.setupModal);
            showToast('Supabase configuration saved! Reloading application...', 'success');
            setTimeout(() => window.location.reload(), 1000);
        });
    }

    /**
     * Modal Generic Management
     */
    function initModalEvents() {
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.close;
                const modal = document.getElementById(targetId);
                if (modal) closeModal(modal);
            });
        });

        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) closeModal(backdrop);
            });
        });

        elements.btnShowAllQr.addEventListener('click', openQrModal);
        elements.btnConfirmBooking.addEventListener('click', handleBookingSubmission);
    }

    function openModal(modal) {
        if (!modal) return;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Toast Notifications Helper
     */
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.innerHTML = `
            <span style="font-weight: 800; font-size: 1.1rem;">${icons[type] || 'ℹ'}</span>
            <div style="flex: 1; font-size: 0.86rem; font-weight: 500;">${message}</div>
        `;

        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 4500);
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Initialize application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
