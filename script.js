/**
 * Hostel Management System & Washing Machine Portal - Main Controller (script.js)
 * 
 * Orchestrates:
 * - Module Navigation (Washing Machines, Gate, Mess, Sports, Labs, Attendance, Leave, Notices)
 * - Mandatory Hostel Geofence Location Physical Verification
 * - Student Authentication & Digital Resident ID Pass
 * - 4 Machine live cards & 75-minute slots (Preserved 100%)
 * - Gate Entry/Exit anti-replay QR logging
 * - Mess Weekly Menu, Veg/Non-Veg Diet Selection & QR Attendance
 * - Sports Court Bookings & Equipment Desk
 * - Morning Attendance GPS Check-in & Wake-Up Alarm Reminder
 * - Leave Applications & Maintenance Complaints
 * - Realtime Supabase synchronization
 * - Admin Multi-Role Control Center (Wardens, Security, Mess Staff, Lab Staff, Super Admin)
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
        countdownIntervals: [],
        currentPassData: null,
        activeModule: 'section-laundry',
        qrScanner: null
    };

    // DOM Elements Cache
    const elements = {};

    function cacheDomElements() {
        // Theme & Header
        elements.themeToggle = document.getElementById('theme-toggle');
        elements.sunIcon = document.getElementById('sun-icon');
        elements.moonIcon = document.getElementById('moon-icon');
        elements.geofenceStatusPill = document.getElementById('geofence-status-pill');
        elements.geofenceAlertBanner = document.getElementById('geofence-alert-banner');
        elements.geofenceAlertDetail = document.getElementById('geofence-alert-detail');
        elements.btnRecheckGeofence = document.getElementById('btn-recheck-geofence');
        elements.btnEmergencyContacts = document.getElementById('btn-emergency-contacts');
        elements.btnOpenScanner = document.getElementById('btn-open-scanner');
        elements.btnStudentAuth = document.getElementById('btn-student-auth');
        elements.studentBtnText = document.getElementById('student-btn-text');
        elements.btnShowAllQr = document.getElementById('btn-show-all-qr');
        elements.btnAdminAuth = document.getElementById('btn-admin-auth');
        elements.adminBtnText = document.getElementById('admin-btn-text');

        // Navigation Pills
        elements.moduleNavPills = document.querySelectorAll('.module-pill-btn');
        elements.moduleSections = document.querySelectorAll('.hostel-module-section');

        // Washing Machine Section Elements (Preserved)
        elements.datePillsBar = document.getElementById('date-pills-bar');
        elements.bookingCalendarInput = document.getElementById('booking-calendar-input');
        elements.machinesContainer = document.getElementById('machines-container');
        elements.kpiAvailable = document.getElementById('kpi-available-count');
        elements.kpiInUse = document.getElementById('kpi-inuse-count');
        elements.kpiTodayBookings = document.getElementById('kpi-today-bookings');
        elements.dateSchedulePill = document.getElementById('date-schedule-pill');
        elements.hostelNoticeBoard = document.getElementById('hostel-notice-board');
        elements.noticeCard = document.getElementById('notice-card');
        elements.noticeDateTime = document.getElementById('notice-date-time');
        elements.noticeHeadline = document.getElementById('notice-headline');
        elements.noticeMessage = document.getElementById('notice-message');
        elements.noticeSigned = document.getElementById('notice-signed');

        // Modals
        elements.bookingModal = document.getElementById('booking-modal');
        elements.bookingSuccessModal = document.getElementById('booking-success-modal');
        elements.allQrModal = document.getElementById('all-qr-modal');
        elements.studentAuthModal = document.getElementById('student-auth-modal');
        elements.qrScannerModal = document.getElementById('qr-scanner-modal');
        elements.emergencyModal = document.getElementById('emergency-modal');
        elements.leaveModal = document.getElementById('leave-modal');
        elements.complaintModal = document.getElementById('complaint-modal');
        elements.sportsBookingModal = document.getElementById('sports-booking-modal');
        elements.adminLoginModal = document.getElementById('admin-login-modal');
        elements.adminDashboardModal = document.getElementById('admin-dashboard-modal');
        elements.setupModal = document.getElementById('setup-modal');
        elements.toastContainer = document.getElementById('toast-container');

        // Laundry Booking Modal Fields
        elements.bmMachineName = document.getElementById('bm-machine-name');
        elements.bmMachineId = document.getElementById('bm-machine-id');
        elements.bmDate = document.getElementById('bm-date');
        elements.bmSlotsGrid = document.getElementById('bm-slots-grid');
        elements.bmSelectedStartISO = document.getElementById('bm-selected-start-iso');
        elements.bmSelectedEndISO = document.getElementById('bm-selected-end-iso');
        elements.bmStudentName = document.getElementById('bm-student-name');
        elements.bmStudentRoll = document.getElementById('bm-student-roll');
        elements.bmStudentPhone = document.getElementById('bm-student-phone');
        elements.bmStudentEmail = document.getElementById('bm-student-email');
        elements.bmScheduleBadge = document.getElementById('bm-schedule-badge');
        elements.bmErrorBox = document.getElementById('bm-error-box');
        elements.btnConfirmBooking = document.getElementById('btn-confirm-booking');
        elements.btnSaveTicketGallery = document.getElementById('btn-save-ticket-gallery');

        // Booking Success Modal
        elements.bsmMachineTitle = document.getElementById('bsm-machine-title');
        elements.bsmReferenceCode = document.getElementById('bsm-reference-code');
        elements.bsmQrCode = document.getElementById('bsm-qr-code');
        elements.bsmDate = document.getElementById('bsm-date');
        elements.bsmTimeSlot = document.getElementById('bsm-time-slot');
        elements.bsmStudentName = document.getElementById('bsm-student-name');
        elements.bsmStudentRoll = document.getElementById('bsm-student-roll');

        // Student Digital Pass
        elements.idCardName = document.getElementById('id-card-name');
        elements.idCardRoll = document.getElementById('id-card-roll');
        elements.idCardRoom = document.getElementById('id-card-room');
        elements.idCardBlock = document.getElementById('id-card-block');
        elements.idCardPhone = document.getElementById('id-card-phone');
        elements.idCardQrBox = document.getElementById('id-card-qr-box');
        elements.btnGateEntry = document.getElementById('btn-gate-entry');
        elements.btnGateExit = document.getElementById('btn-gate-exit');
        elements.studentGateLogsTbody = document.getElementById('student-gate-logs-tbody');
        elements.btnRefreshGateLogs = document.getElementById('btn-refresh-gate-logs');

        // Mess Elements
        elements.messTodayDayBadge = document.getElementById('mess-today-day-badge');
        elements.todayLunchMenu = document.getElementById('today-lunch-menu');
        elements.todayDinnerMenu = document.getElementById('today-dinner-menu');
        elements.btnMessCheckin = document.getElementById('btn-mess-checkin');
        elements.weeklyMessMenuTbody = document.getElementById('weekly-mess-menu-tbody');

        // Sports & Labs Elements
        elements.tabBtnSports = document.getElementById('tab-btn-sports');
        elements.tabBtnLabs = document.getElementById('tab-btn-labs');
        elements.subSportsContent = document.getElementById('sub-sports-content');
        elements.subLabsContent = document.getElementById('sub-labs-content');
        elements.sportsFacilitiesContainer = document.getElementById('sports-facilities-container');
        elements.sportsEquipmentTbody = document.getElementById('sports-equipment-tbody');
        elements.labsFacilitiesContainer = document.getElementById('labs-facilities-container');
        elements.formLabComplaint = document.getElementById('form-lab-complaint');

        // Daily Attendance & Leave
        elements.btnMorningCheckin = document.getElementById('btn-morning-checkin');
        elements.morningAttStatusText = document.getElementById('morning-att-status-text');
        elements.wakeupAlarmTime = document.getElementById('wakeup-alarm-time');
        elements.wakeupAlarmToggle = document.getElementById('wakeup-alarm-toggle');
        elements.btnOpenLeaveModal = document.getElementById('btn-open-leave-modal');
        elements.studentLeaveTbody = document.getElementById('student-leave-tbody');
        elements.formLeaveApplication = document.getElementById('form-leave-application');

        // Complaints & Emergency Directory
        elements.btnOpenComplaintModal = document.getElementById('btn-open-complaint-modal');
        elements.studentComplaintsTbody = document.getElementById('student-complaints-tbody');
        elements.formComplaintSubmission = document.getElementById('form-complaint-submission');
        elements.emergencyDirectoryGrid = document.getElementById('emergency-directory-grid');
        elements.modalEmergencyGrid = document.getElementById('modal-emergency-grid');

        // Admin Modal Fields
        elements.btnSubmitAdminLogin = document.getElementById('btn-submit-admin-login');
        elements.adminEmailInput = document.getElementById('admin-email-input');
        elements.adminPasswordInput = document.getElementById('admin-password-input');
        elements.adminLoginError = document.getElementById('admin-login-error');
        elements.btnAdminLogout = document.getElementById('btn-admin-logout');
        elements.adminMachinesList = document.getElementById('admin-machines-list');
        elements.adminBookingsTbody = document.getElementById('admin-bookings-tbody');
        elements.adminBookingsDateFilter = document.getElementById('admin-bookings-date-filter');
        elements.btnAdminClearDate = document.getElementById('btn-admin-clear-date');
        elements.adminBookingsMachineFilter = document.getElementById('admin-bookings-machine-filter');
        elements.adminBookingsSearch = document.getElementById('admin-bookings-search');
        elements.btnDownloadPdfReport = document.getElementById('btn-download-pdf-report');
        elements.pdfReportDate = document.getElementById('pdf-report-date');
        elements.pdfReportMachineFilter = document.getElementById('pdf-report-machine-filter');
        elements.adminAuditLogsTbody = document.getElementById('admin-audit-logs-tbody');
        elements.btnRefreshAuditLogs = document.getElementById('btn-refresh-audit-logs');
        elements.adminScheduleBadge = document.getElementById('admin-schedule-badge');
        elements.adminSlotsDatePicker = document.getElementById('admin-slots-date-picker');
        elements.adminSlotsMachineFilter = document.getElementById('admin-slots-machine-filter');
        elements.adminSlotsGridContainer = document.getElementById('admin-slots-grid-container');
        elements.btnRefreshAdminSlots = document.getElementById('btn-refresh-admin-slots');
        elements.adminNoticeTitle = document.getElementById('admin-notice-title');
        elements.adminNoticeContent = document.getElementById('admin-notice-content');
        elements.adminNoticePriority = document.getElementById('admin-notice-priority');
        elements.adminNoticeActive = document.getElementById('admin-notice-active');
        elements.btnSaveNotice = document.getElementById('btn-save-notice');
        elements.btnClearNotice = document.getElementById('btn-clear-notice');

        // Admin Extra Tabs
        elements.adminGateLogsTbody = document.getElementById('admin-gate-logs-tbody');
        elements.btnRefreshAdminGate = document.getElementById('btn-refresh-admin-gate');
        elements.adminMessDate = document.getElementById('admin-mess-date');
        elements.adminMessMeal = document.getElementById('admin-mess-meal');
        elements.btnCalcMessHeadcount = document.getElementById('btn-calc-mess-headcount');
        elements.adminMessVegCount = document.getElementById('admin-mess-veg-count');
        elements.adminMessNonvegCount = document.getElementById('admin-mess-nonveg-count');
        elements.adminMessSkipCount = document.getElementById('admin-mess-skip-count');
        elements.adminMessAttendedCount = document.getElementById('admin-mess-attended-count');
        elements.adminLeaveTbody = document.getElementById('admin-leave-tbody');
        elements.btnRefreshAdminLeave = document.getElementById('btn-refresh-admin-leave');
        elements.adminComplaintsTbody = document.getElementById('admin-complaints-tbody');
        elements.btnRefreshAdminComplaints = document.getElementById('btn-refresh-admin-complaints');
        elements.formGeofenceSettings = document.getElementById('form-geofence-settings');
        elements.cfgHostelLat = document.getElementById('cfg-hostel-lat');
        elements.cfgHostelLng = document.getElementById('cfg-hostel-lng');
        elements.cfgHostelRadius = document.getElementById('cfg-hostel-radius');
        elements.cfgGeofenceEnforced = document.getElementById('cfg-geofence-enforced');
        elements.btnUseCurrentGps = document.getElementById('btn-use-current-gps');

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
        console.log('Bootstrapping HostelMate Integrated Management System...');
        try { cacheDomElements(); } catch (e) { console.error('cacheDomElements failed:', e); }
        try { initTheme(); } catch (e) { console.error('initTheme failed:', e); }

        // Service Worker registration for PWA & Offline
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').catch(err => {
                    console.log('ServiceWorker registration error:', err);
                });
            });
        }

        // 1. Immediately setup 7-Day Rolling Date Selector
        try { initDateSelector(); } catch (e) { console.error('initDateSelector failed:', e); }

        // 2. Immediately render Notice Board
        try { initNoticeBoard(); } catch (e) { console.error('initNoticeBoard failed:', e); }

        // 3. Immediately Load & Render 4 Washing Machines
        try { await reloadMachines(); } catch (e) { console.error('reloadMachines failed:', e); }

        // 4. Initialize Modals and Core Module Events
        try { initModalEvents(); } catch (e) { console.error('initModalEvents failed:', e); }
        try { initSetupModal(); } catch (e) { console.error('initSetupModal failed:', e); }
        try { initAdminAuth(); } catch (e) { console.error('initAdminAuth failed:', e); }
        try { initModuleNavigation(); } catch (e) { console.error('initModuleNavigation failed:', e); }
        try { initGeofenceLocation(); } catch (e) { console.error('initGeofenceLocation failed:', e); }
        try { initStudentAuth(); } catch (e) { console.error('initStudentAuth failed:', e); }
        try { initGateModule(); } catch (e) { console.error('initGateModule failed:', e); }
        try { initMessModule(); } catch (e) { console.error('initMessModule failed:', e); }
        try { initSportsLabModule(); } catch (e) { console.error('initSportsLabModule failed:', e); }
        try { initDailyModule(); } catch (e) { console.error('initDailyModule failed:', e); }
        try { initNoticesAndComplaintsModule(); } catch (e) { console.error('initNoticesAndComplaintsModule failed:', e); }
        try { initUniversalQRScanner(); } catch (e) { console.error('initUniversalQRScanner failed:', e); }
        try { initEnhancedAdminDashboard(); } catch (e) { console.error('initEnhancedAdminDashboard failed:', e); }

        // 5. Initialize Supabase Connection
        try {
            window.SupabaseManager.initClient();
            window.SupabaseManager.onStateChange(handleDbStateChange);
        } catch (e) {
            console.error('SupabaseManager init failed:', e);
        }

        // 6. Realtime Subscriptions
        try {
            window.SupabaseManager.subscribeRealtime(
                () => reloadMachines(),
                () => {
                    reloadMachines();
                    if (elements.adminDashboardModal && elements.adminDashboardModal.classList.contains('active')) {
                        loadAdminBookings();
                    }
                },
                () => renderNoticeBoard()
            );
        } catch (e) {
            console.warn('Realtime subscription issue:', e);
        }

        // 7. Check URL params for QR deep-link (?machine=X)
        try { handleUrlParameters(); } catch (e) { console.error('handleUrlParameters failed:', e); }
    }

    // =========================================================================
    // MODULE NAVIGATION (TABS SWITCHER)
    // =========================================================================
    function initModuleNavigation() {
        document.querySelectorAll('.module-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetModule = btn.dataset.module;
                if (!targetModule) return;

                document.querySelectorAll('.module-pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.hostel-module-section').forEach(sec => {
                    sec.classList.remove('active');
                });

                const targetSec = document.getElementById(targetModule);
                if (targetSec) targetSec.classList.add('active');
                state.activeModule = targetModule;

                // Refresh specific module data on tab activation
                if (targetModule === 'section-gate') loadStudentGateLogs();
                else if (targetModule === 'section-mess') loadMessModule();
                else if (targetModule === 'section-sports-lab') loadSportsModule();
                else if (targetModule === 'section-daily') loadDailyModule();
                else if (targetModule === 'section-notices') loadNoticesAndComplaintsModule();
            });
        });
    }

    // =========================================================================
    // GEOFENCE LOCATION & PHYSICAL VERIFICATION
    // =========================================================================
    async function initGeofenceLocation() {
        window.LocationService.onLocationChange((status, data) => {
            if (!elements.geofenceStatusPill) return;

            if (status === 'checking') {
                elements.geofenceStatusPill.className = 'geofence-pill checking';
                elements.geofenceStatusPill.innerHTML = '📍 Checking GPS...';
                if (elements.geofenceAlertBanner) elements.geofenceAlertBanner.style.display = 'none';
            } else if (status === 'verified') {
                elements.geofenceStatusPill.className = 'geofence-pill inside';
                elements.geofenceStatusPill.innerHTML = `🟢 Inside Hostel (${data.distance}m)`;
                if (elements.geofenceAlertBanner) elements.geofenceAlertBanner.style.display = 'none';
            } else {
                elements.geofenceStatusPill.className = 'geofence-pill outside';
                elements.geofenceStatusPill.innerHTML = '🔴 Outside Hostel';
                if (elements.geofenceAlertBanner) {
                    elements.geofenceAlertBanner.style.display = 'flex';
                    if (elements.geofenceAlertDetail && data?.message) {
                        elements.geofenceAlertDetail.textContent = data.message;
                    }
                }
            }
        });

        if (elements.btnRecheckGeofence) {
            elements.btnRecheckGeofence.addEventListener('click', async () => {
                showToast('Rechecking GPS position with high accuracy...', 'info');
                await window.LocationService.verifyLocation(true);
            });
        }

        if (elements.geofenceStatusPill) {
            elements.geofenceStatusPill.addEventListener('click', async () => {
                showToast('Checking location...', 'info');
                await window.LocationService.verifyLocation(true);
            });
        }

        // Run initial verification smoothly
        setTimeout(() => window.LocationService.verifyLocation(), 1200);
    }

    // =========================================================================
    // STUDENT AUTHENTICATION & DIGITAL RESIDENT ID PASS
    // =========================================================================
    function initStudentAuth() {
        window.AuthService.init();

        window.AuthService.onAuthStateChange((user, profile) => {
            updateStudentUI(user, profile);
        });

        if (elements.btnStudentAuth) {
            elements.btnStudentAuth.addEventListener('click', () => {
                if (window.AuthService.isAuthenticated()) {
                    // Show profile actions / logout prompt
                    const user = window.AuthService.getUser();
                    const profile = window.AuthService.getProfile();
                    if (confirm(`Logged in as ${profile?.full_name || user.email} (${profile?.student_roll || 'Student'}). Do you want to Sign Out?`)) {
                        window.AuthService.logout();
                        showToast('Signed out of student account.', 'info');
                    }
                } else {
                    openModal(elements.studentAuthModal);
                }
            });
        }

        const btnTabLogin = document.getElementById('btn-tab-student-login');
        const btnTabReg = document.getElementById('btn-tab-student-register');
        const formLogin = document.getElementById('form-student-login');
        const formReg = document.getElementById('form-student-register');

        if (btnTabLogin && btnTabReg && formLogin && formReg) {
            btnTabLogin.addEventListener('click', () => {
                btnTabLogin.classList.add('active');
                btnTabReg.classList.remove('active');
                formLogin.style.display = 'flex';
                formReg.style.display = 'none';
            });

            btnTabReg.addEventListener('click', () => {
                btnTabReg.classList.add('active');
                btnTabLogin.classList.remove('active');
                formReg.style.display = 'flex';
                formLogin.style.display = 'none';
            });

            formLogin.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('student-login-id').value.trim();
                const pass = document.getElementById('student-login-password').value;
                const errBox = document.getElementById('student-login-error');
                errBox.style.display = 'none';

                try {
                    showToast('Signing in...', 'info');
                    await window.AuthService.login(id, pass);
                    closeModal(elements.studentAuthModal);
                    showToast('Signed in successfully! Welcome to HostelMate.', 'success');
                } catch (err) {
                    errBox.style.display = 'block';
                    errBox.textContent = err.message;
                }
            });

            formReg.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('reg-student-name').value;
                const roll = document.getElementById('reg-student-roll').value;
                const room = document.getElementById('reg-student-room').value;
                const phone = document.getElementById('reg-student-phone').value;
                const block = document.getElementById('reg-student-block').value;
                const email = document.getElementById('reg-student-email').value;
                const pass = document.getElementById('reg-student-password').value;
                const errBox = document.getElementById('student-register-error');
                errBox.style.display = 'none';

                try {
                    showToast('Creating resident account...', 'info');
                    await window.AuthService.registerStudent({
                        fullName: name,
                        rollNo: roll,
                        roomNo: room,
                        phone: phone,
                        hostelBlock: block,
                        email: email,
                        password: pass
                    });
                    closeModal(elements.studentAuthModal);
                    showToast('Account registered successfully! Welcome to HostelMate.', 'success');
                } catch (err) {
                    errBox.style.display = 'block';
                    errBox.textContent = err.message;
                }
            });
        }
    }

    function updateStudentUI(user, profile) {
        if (user && profile) {
            if (elements.studentBtnText) {
                elements.studentBtnText.textContent = profile.full_name.split(' ')[0] || 'Profile';
            }
            if (elements.idCardName) elements.idCardName.textContent = profile.full_name;
            if (elements.idCardRoll) elements.idCardRoll.textContent = profile.student_roll || 'STU-001';
            if (elements.idCardRoom) elements.idCardRoom.textContent = profile.room_no || 'Room 101';
            if (elements.idCardBlock) elements.idCardBlock.textContent = profile.hostel_block || 'A Block';
            if (elements.idCardPhone) elements.idCardPhone.textContent = profile.phone || 'N/A';

            // Auto-fill laundry booking form fields
            if (elements.bmStudentName) elements.bmStudentName.value = profile.full_name;
            if (elements.bmStudentRoll) elements.bmStudentRoll.value = profile.student_roll || '';
            if (elements.bmStudentPhone) elements.bmStudentPhone.value = profile.phone || '';
            if (elements.bmStudentEmail) elements.bmStudentEmail.value = profile.email || '';

            // Generate Student Digital ID Barcode/QR
            if (elements.idCardQrBox && window.QRCode) {
                elements.idCardQrBox.innerHTML = '';
                new window.QRCode(elements.idCardQrBox, {
                    text: `HOSTEL_ID:${profile.student_roll || user.id}`,
                    width: 44,
                    height: 44,
                    colorDark: '#1e1b4b',
                    colorLight: '#ffffff'
                });
            }
        } else {
            if (elements.studentBtnText) elements.studentBtnText.textContent = 'Student Login';
            if (elements.idCardName) elements.idCardName.textContent = 'Guest Resident';
            if (elements.idCardRoll) elements.idCardRoll.textContent = 'Please Log In';
        }
    }

    // =========================================================================
    // GATE ENTRY & EXIT MODULE
    // =========================================================================
    function initGateModule() {
        if (elements.btnGateEntry) {
            elements.btnGateEntry.addEventListener('click', () => handleGateAction('entry'));
        }
        if (elements.btnGateExit) {
            elements.btnGateExit.addEventListener('click', () => handleGateAction('exit'));
        }
        if (elements.btnRefreshGateLogs) {
            elements.btnRefreshGateLogs.addEventListener('click', loadStudentGateLogs);
        }
    }

    async function handleGateAction(action) {
        const profile = window.AuthService.getProfile();
        const roll = profile?.student_roll || prompt('Enter your Student Roll Number (विद्यार्थी हजेरी क्रमांक):');
        if (!roll) return;
        const name = profile?.full_name || 'Hostel Student';

        try {
            showToast(`Verifying hostel GPS location for Gate ${action}...`, 'info');
            const res = await window.HostelService.recordGateAction({
                action: action,
                studentRoll: roll,
                studentName: name,
                gateName: 'Main Campus Gate'
            });

            showToast(`Gate ${action.toUpperCase()} recorded successfully! (${res.message})`, 'success');
            loadStudentGateLogs();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async function loadStudentGateLogs() {
        if (!elements.studentGateLogsTbody) return;
        const profile = window.AuthService.getProfile();
        const roll = profile?.student_roll || null;

        elements.studentGateLogsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 14px;">Loading gate activity...</td></tr>';

        const logs = await window.HostelService.getStudentGateLogs(roll);
        elements.studentGateLogsTbody.innerHTML = '';

        if (logs.length === 0) {
            elements.studentGateLogsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 14px; color: var(--text-muted);">No gate logs recorded yet.</td></tr>';
            return;
        }

        logs.forEach(log => {
            const tr = document.createElement('tr');
            const timeStr = new Date(log.timestamp).toLocaleString();
            const isEntry = log.action === 'entry';
            tr.innerHTML = `
                <td><span class="spec-badge" style="background: ${isEntry ? '#ecfdf5' : '#fef2f2'}; color: ${isEntry ? '#10b981' : '#ef4444'}; font-weight: 700;">${isEntry ? '🟢 ENTRY' : '🔴 EXIT'}</span></td>
                <td>${timeStr}</td>
                <td>${log.gate_name}</td>
                <td><span style="font-weight: 600; color: #10b981;">${log.status}</span></td>
                <td>${log.distance_meters ? Math.round(log.distance_meters) + 'm' : 'Inside'}</td>
            `;
            elements.studentGateLogsTbody.appendChild(tr);
        });
    }

    // =========================================================================
    // MESS MANAGEMENT MODULE
    // =========================================================================
    function initMessModule() {
        document.querySelectorAll('.diet-toggle-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const mealType = btn.dataset.meal;
                const dietChoice = btn.dataset.diet;
                const container = btn.closest('.mess-diet-selector');
                const profile = window.AuthService.getProfile();
                const roll = profile?.student_roll || prompt('Enter Student Roll No for Mess Selection:');
                if (!roll) return;

                const todayStr = new Date().toISOString().split('T')[0];

                try {
                    showToast('Updating meal diet preference...', 'info');
                    await window.HostelService.selectMealDiet({
                        mealDate: todayStr,
                        mealType: mealType,
                        dietChoice: dietChoice,
                        studentRoll: roll
                    });

                    container.querySelectorAll('.diet-toggle-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    showToast(`Preference set to ${dietChoice.toUpperCase()} for ${mealType.toUpperCase()}!`, 'success');
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });

        if (elements.btnMessCheckin) {
            elements.btnMessCheckin.addEventListener('click', async () => {
                const profile = window.AuthService.getProfile();
                const roll = profile?.student_roll || prompt('Enter Student Roll No for Mess Entry:');
                if (!roll) return;

                const hour = new Date().getHours();
                const mealType = (hour < 15) ? 'lunch' : 'dinner';
                const todayStr = new Date().toISOString().split('T')[0];

                try {
                    showToast(`Verifying presence at Mess counter for ${mealType}...`, 'info');
                    const res = await window.HostelService.recordMessAttendance({
                        mealDate: todayStr,
                        mealType: mealType,
                        studentRoll: roll
                    });
                    showToast(`Mess attendance recorded! (${res.diet_served.toUpperCase()} meal served)`, 'success');
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        }
    }

    async function loadMessModule() {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayDay = days[new Date().getDay()];

        if (elements.messTodayDayBadge) {
            elements.messTodayDayBadge.textContent = `Today: ${todayDay} • Special Meals on Wed & Sun`;
        }

        const menus = await window.HostelService.getWeeklyMessMenu();
        const todayMenu = menus.find(m => m.day_of_week === todayDay);

        if (todayMenu) {
            if (elements.todayLunchMenu) elements.todayLunchMenu.textContent = todayMenu.lunch_menu;
            if (elements.todayDinnerMenu) {
                elements.todayDinnerMenu.textContent = todayMenu.dinner_menu + (todayMenu.special_dish ? ` ⭐ Special: ${todayMenu.special_dish}` : '');
            }
        }

        if (elements.weeklyMessMenuTbody) {
            elements.weeklyMessMenuTbody.innerHTML = '';
            menus.forEach(m => {
                const isToday = m.day_of_week === todayDay;
                const tr = document.createElement('tr');
                if (isToday) tr.style.backgroundColor = 'var(--primary-light)';
                tr.innerHTML = `
                    <td><strong>${m.day_of_week}</strong> ${isToday ? '👈 Today' : ''}</td>
                    <td>${m.breakfast_menu}</td>
                    <td>${m.lunch_menu}</td>
                    <td>${m.dinner_menu}</td>
                    <td>${m.special_dish ? `<span class="spec-badge" style="background: #fef3c7; color: #b45309; font-weight: 700;">⭐ ${m.special_dish}</span>` : '-'}</td>
                `;
                elements.weeklyMessMenuTbody.appendChild(tr);
            });
        }
    }

    // =========================================================================
    // SPORTS & LABORATORY MODULE
    // =========================================================================
    function initSportsLabModule() {
        if (elements.tabBtnSports && elements.tabBtnLabs) {
            elements.tabBtnSports.addEventListener('click', () => {
                elements.tabBtnSports.classList.add('active');
                elements.tabBtnLabs.classList.remove('active');
                elements.subSportsContent.style.display = 'block';
                elements.subLabsContent.style.display = 'none';
            });

            elements.tabBtnLabs.addEventListener('click', () => {
                elements.tabBtnLabs.classList.add('active');
                elements.tabBtnSports.classList.remove('active');
                elements.subLabsContent.style.display = 'block';
                elements.subSportsContent.style.display = 'none';
                loadLabs();
            });
        }

        const formSports = document.getElementById('form-sports-facility-booking');
        if (formSports) {
            formSports.addEventListener('submit', async (e) => {
                e.preventDefault();
                const facId = document.getElementById('sb-facility-id').value;
                const date = document.getElementById('sb-date').value;
                const players = document.getElementById('sb-players').value;
                const startT = document.getElementById('sb-start-time').value;
                const endT = document.getElementById('sb-end-time').value;
                const team = document.getElementById('sb-team-name').value;

                const profile = window.AuthService.getProfile();
                const roll = profile?.student_roll || prompt('Enter Student Roll No for Sports Booking:');
                if (!roll) return;
                const name = profile?.full_name || 'Hostel Student';

                const startISO = `${date}T${startT}:00.000Z`;
                const endISO = `${date}T${endT}:00.000Z`;

                try {
                    showToast('Validating sports slot availability...', 'info');
                    await window.HostelService.bookSportsFacility({
                        facilityId: facId,
                        studentRoll: roll,
                        studentName: name,
                        bookingDate: date,
                        startTime: startISO,
                        endTime: endISO,
                        teamName: team,
                        playersCount: players
                    });
                    closeModal(elements.sportsBookingModal);
                    showToast('Sports facility slot booked successfully!', 'success');
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        }

        if (elements.formLabComplaint) {
            elements.formLabComplaint.addEventListener('submit', async (e) => {
                e.preventDefault();
                const labId = document.getElementById('lab-complaint-lab-id').value;
                const equip = document.getElementById('lab-complaint-equip').value;
                const desc = document.getElementById('lab-complaint-desc').value;

                try {
                    const client = window.SupabaseManager.getClient();
                    await client.from('lab_complaints').insert({
                        lab_id: Number(labId),
                        equipment_or_pc: equip,
                        issue_description: desc,
                        reporter_name: window.AuthService.getProfile()?.full_name || 'Student'
                    });
                    elements.formLabComplaint.reset();
                    showToast('Lab issue reported to laboratory supervisor!', 'success');
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        }
    }

    async function loadSportsModule() {
        const facilities = await window.HostelService.getSportsFacilities();
        if (elements.sportsFacilitiesContainer) {
            elements.sportsFacilitiesContainer.innerHTML = '';
            facilities.forEach(f => {
                const card = document.createElement('div');
                card.className = 'facility-card';
                card.innerHTML = `
                    <div>
                        <span class="spec-badge" style="text-transform: uppercase;">${f.sport_type}</span>
                        <h4 style="font-size: 1.1rem; font-weight: 800; margin: 8px 0 4px 0;">${f.name}</h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">${f.rules || 'Standard rules apply.'}</p>
                        <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 6px;">
                            ⏰ ${f.open_time} - ${f.close_time} • Max ${f.capacity} Players
                        </p>
                    </div>
                    <button type="button" class="btn btn-primary btn-book-sport" data-id="${f.id}" data-name="${f.name}" style="margin-top: 10px; width: 100%;">
                        Book Court / Ground
                    </button>
                `;
                elements.sportsFacilitiesContainer.appendChild(card);
            });

            elements.sportsFacilitiesContainer.querySelectorAll('.btn-book-sport').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('sb-facility-id').value = btn.dataset.id;
                    document.getElementById('sb-facility-name').value = btn.dataset.name;
                    document.getElementById('sb-date').value = state.selectedDateStr || new Date().toISOString().split('T')[0];
                    openModal(elements.sportsBookingModal);
                });
            });
        }

        const equip = await window.HostelService.getSportsEquipment();
        if (elements.sportsEquipmentTbody) {
            elements.sportsEquipmentTbody.innerHTML = '';
            equip.forEach(eq => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${eq.name}</strong></td>
                    <td><span class="spec-badge">${eq.sport_type}</span></td>
                    <td>${eq.total_qty}</td>
                    <td><span style="font-weight: 700; color: ${eq.available_qty > 0 ? '#10b981' : '#ef4444'};">${eq.available_qty}</span></td>
                    <td>
                        <button type="button" class="btn btn-secondary btn-loan-equipment" data-id="${eq.id}" style="padding: 4px 10px; font-size: 0.75rem;">
                            Issue
                        </button>
                    </td>
                `;
                elements.sportsEquipmentTbody.appendChild(tr);
            });
        }
    }

    async function loadLabs() {
        const labs = await window.HostelService.getLabFacilities();
        if (elements.labsFacilitiesContainer) {
            elements.labsFacilitiesContainer.innerHTML = '';
            labs.forEach(lab => {
                const card = document.createElement('div');
                card.className = 'facility-card';
                card.innerHTML = `
                    <div>
                        <span class="spec-badge">${lab.department}</span>
                        <h4 style="font-size: 1.1rem; font-weight: 800; margin: 8px 0 4px 0;">${lab.name}</h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">Capacity: ${lab.capacity} Workstations</p>
                        <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">Hours: ${lab.open_hours}</p>
                    </div>
                    <button type="button" class="btn btn-primary btn-checkin-lab" data-id="${lab.id}" data-name="${lab.name}" style="margin-top: 10px; width: 100%;">
                        Lab QR Check-In
                    </button>
                `;
                elements.labsFacilitiesContainer.appendChild(card);
            });

            elements.labsFacilitiesContainer.querySelectorAll('.btn-checkin-lab').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const profile = window.AuthService.getProfile();
                    const roll = profile?.student_roll || prompt('Enter Student Roll No:');
                    if (!roll) return;
                    try {
                        showToast('Verifying presence in Laboratory...', 'info');
                        await window.HostelService.checkinLab({
                            labId: btn.dataset.id,
                            studentRoll: roll,
                            studentName: profile?.full_name || 'Student',
                            purpose: 'Programming / Practical'
                        });
                        showToast(`Checked in to ${btn.dataset.name}!`, 'success');
                    } catch (err) {
                        showToast(err.message, 'error');
                    }
                });
            });
        }
    }

    // =========================================================================
    // DAILY ATTENDANCE, WAKE-UP ALARM & LEAVE APPLICATIONS
    // =========================================================================
    function initDailyModule() {
        if (elements.btnMorningCheckin) {
            elements.btnMorningCheckin.addEventListener('click', async () => {
                const profile = window.AuthService.getProfile();
                const roll = profile?.student_roll || prompt('Enter Student Roll No for Morning Check-in:');
                if (!roll) return;
                const name = profile?.full_name || 'Resident Student';
                const room = profile?.room_no || '302';

                try {
                    showToast('Verifying hostel GPS location for Morning Attendance...', 'info');
                    const res = await window.HostelService.recordMorningAttendance({
                        studentRoll: roll,
                        studentName: name,
                        roomNo: room
                    });
                    showToast(`Morning attendance recorded! Status: ${res.status.toUpperCase()}`, 'success');
                    if (elements.morningAttStatusText) elements.morningAttStatusText.textContent = `✓ Checked In (${res.status.toUpperCase()})`;
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        }

        // Wake-Up Alarm Reminder with Audio Tone
        if (elements.wakeupAlarmToggle) {
            elements.wakeupAlarmToggle.addEventListener('change', () => {
                if (elements.wakeupAlarmToggle.checked) {
                    const timeVal = elements.wakeupAlarmTime.value;
                    showToast(`Wake-up alarm reminder set for ${timeVal}! Keep app tab active.`, 'success');
                    scheduleWakeupAlarm(timeVal);
                } else {
                    showToast('Wake-up alarm reminder disabled.', 'info');
                }
            });
        }

        if (elements.btnOpenLeaveModal) {
            elements.btnOpenLeaveModal.addEventListener('click', () => {
                openModal(elements.leaveModal);
            });
        }

        if (elements.formLeaveApplication) {
            elements.formLeaveApplication.addEventListener('submit', async (e) => {
                e.preventDefault();
                const start = document.getElementById('leave-start-date').value;
                const end = document.getElementById('leave-end-date').value;
                const dest = document.getElementById('leave-destination').value;
                const phone = document.getElementById('leave-parent-phone').value;
                const reason = document.getElementById('leave-reason').value;

                const profile = window.AuthService.getProfile();
                const roll = profile?.student_roll || prompt('Enter Student Roll No:');
                if (!roll) return;
                const name = profile?.full_name || 'Resident Student';
                const room = profile?.room_no || '302';

                try {
                    showToast('Submitting leave application to Warden...', 'info');
                    await window.HostelService.submitLeaveApplication({
                        startDate: start,
                        endDate: end,
                        destination: dest,
                        parentPhone: phone,
                        reason: reason,
                        studentName: name,
                        studentRoll: roll,
                        roomNo: room
                    });
                    closeModal(elements.leaveModal);
                    showToast('Leave application submitted successfully!', 'success');
                    loadStudentLeave();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        }
    }

    function scheduleWakeupAlarm(alarmTimeStr) {
        const interval = setInterval(() => {
            if (!elements.wakeupAlarmToggle || !elements.wakeupAlarmToggle.checked) {
                clearInterval(interval);
                return;
            }
            const now = new Date();
            const curH = String(now.getHours()).padStart(2, '0');
            const curM = String(now.getMinutes()).padStart(2, '0');
            const curTime = `${curH}:${curM}`;

            if (curTime === alarmTimeStr && now.getSeconds() < 3) {
                playAlarmTone();
                alert('⏰ WAKE-UP ALARM! Good morning! Time for Hostel Morning Check-In.');
                clearInterval(interval);
                elements.wakeupAlarmToggle.checked = false;
            }
        }, 3000);
    }

    function playAlarmTone() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.2);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 1.5);
        } catch (e) {}
    }

    async function loadDailyModule() {
        loadStudentLeave();
    }

    async function loadStudentLeave() {
        if (!elements.studentLeaveTbody) return;
        const profile = window.AuthService.getProfile();
        const roll = profile?.student_roll || null;

        const leaves = await window.HostelService.getLeaveApplications(roll);
        elements.studentLeaveTbody.innerHTML = '';

        if (leaves.length === 0) {
            elements.studentLeaveTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 14px; color: var(--text-muted);">No leave applications found.</td></tr>';
            return;
        }

        leaves.forEach(l => {
            const tr = document.createElement('tr');
            let statusColor = '#f59e0b';
            if (l.status === 'approved') statusColor = '#10b981';
            else if (l.status === 'rejected') statusColor = '#ef4444';

            tr.innerHTML = `
                <td><strong>${l.start_date}</strong> to <strong>${l.end_date}</strong></td>
                <td>${l.destination}</td>
                <td>${l.reason}</td>
                <td>${l.parent_phone}</td>
                <td><span class="spec-badge" style="color: ${statusColor}; font-weight: 800; text-transform: uppercase;">${l.status}</span></td>
                <td>${l.reviewer_comments || '-'}</td>
            `;
            elements.studentLeaveTbody.appendChild(tr);
        });
    }

    // =========================================================================
    // NOTICES, COMPLAINTS & EMERGENCY DIRECTORY MODULE
    // =========================================================================
    function initNoticesAndComplaintsModule() {
        if (elements.btnOpenComplaintModal) {
            elements.btnOpenComplaintModal.addEventListener('click', () => {
                openModal(elements.complaintModal);
            });
        }

        if (elements.formComplaintSubmission) {
            elements.formComplaintSubmission.addEventListener('submit', async (e) => {
                e.preventDefault();
                const cat = document.getElementById('complaint-category').value;
                const room = document.getElementById('complaint-room').value;
                const title = document.getElementById('complaint-title').value;
                const desc = document.getElementById('complaint-description').value;

                const profile = window.AuthService.getProfile();
                const roll = profile?.student_roll || '302';
                const name = profile?.full_name || 'Resident';

                try {
                    showToast('Submitting maintenance complaint...', 'info');
                    await window.HostelService.submitComplaint({
                        category: cat,
                        title: title,
                        description: desc,
                        roomNo: room,
                        studentName: name,
                        studentRoll: roll
                    });
                    closeModal(elements.complaintModal);
                    showToast('Complaint lodged successfully! In-charge notified.', 'success');
                    loadStudentComplaints();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        }

        if (elements.btnEmergencyContacts) {
            elements.btnEmergencyContacts.addEventListener('click', () => {
                loadEmergencyDirectory(elements.modalEmergencyGrid);
                openModal(elements.emergencyModal);
            });
        }
    }

    async function loadNoticesAndComplaintsModule() {
        loadStudentComplaints();
        loadEmergencyDirectory(elements.emergencyDirectoryGrid);
    }

    async function loadStudentComplaints() {
        if (!elements.studentComplaintsTbody) return;
        const profile = window.AuthService.getProfile();
        const roll = profile?.student_roll || null;

        const list = await window.HostelService.getComplaints(roll);
        elements.studentComplaintsTbody.innerHTML = '';

        if (list.length === 0) {
            elements.studentComplaintsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 14px; color: var(--text-muted);">No complaints lodged yet.</td></tr>';
            return;
        }

        list.forEach(c => {
            const tr = document.createElement('tr');
            let col = '#f59e0b';
            if (c.status === 'resolved') col = '#10b981';
            tr.innerHTML = `
                <td><span class="spec-badge">${c.category}</span></td>
                <td><strong>${c.title}</strong></td>
                <td>Room ${c.room_no}</td>
                <td>${new Date(c.created_at).toLocaleDateString()}</td>
                <td><span class="spec-badge" style="color: ${col}; font-weight: 800; text-transform: uppercase;">${c.status}</span></td>
                <td>${c.resolution_notes || '-'}</td>
            `;
            elements.studentComplaintsTbody.appendChild(tr);
        });
    }

    async function loadEmergencyDirectory(targetContainer) {
        if (!targetContainer) return;
        const contacts = await window.HostelService.getEmergencyContacts();
        targetContainer.innerHTML = '';

        contacts.forEach(cnt => {
            const card = document.createElement('div');
            card.className = 'emergency-card';
            card.innerHTML = `
                <div>
                    <h4 style="font-size: 0.96rem; font-weight: 800; margin-bottom: 2px;">${cnt.name}</h4>
                    <span style="font-size: 0.78rem; color: var(--text-muted);">${cnt.role}</span>
                </div>
                <a href="tel:${cnt.phone}" class="emergency-call-btn">
                    📞 ${cnt.phone}
                </a>
            `;
            targetContainer.appendChild(card);
        });
    }

    // =========================================================================
    // UNIVERSAL CAMERA QR SCANNER
    // =========================================================================
    function initUniversalQRScanner() {
        if (elements.btnOpenScanner) {
            elements.btnOpenScanner.addEventListener('click', () => {
                openModal(elements.qrScannerModal);
                startCameraQRScanner();
            });
        }
    }

    function startCameraQRScanner() {
        const readerElement = document.getElementById('interactive-qr-reader');
        const statusElement = document.getElementById('qr-scanner-status');
        if (!readerElement || !window.Html5Qrcode) return;

        if (state.qrScanner) {
            try { state.qrScanner.stop(); } catch (e) {}
        }

        state.qrScanner = new window.Html5Qrcode('interactive-qr-reader');
        statusElement.textContent = 'Requesting camera permission...';

        state.qrScanner.start(
            { facingMode: 'environment' },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
                console.log('Scanned QR:', decodedText);
                statusElement.textContent = `Scanned: ${decodedText}`;
                closeModal(elements.qrScannerModal);
                state.qrScanner.stop().catch(() => {});
                handleScannedQRContent(decodedText);
            },
            () => {}
        ).catch(err => {
            statusElement.textContent = `Camera error: ${err.message || err}`;
        });
    }

    function handleScannedQRContent(text) {
        // 1. Washing Machine QR (?machine=X)
        if (text.includes('machine=')) {
            const urlObj = new URL(text, window.location.href);
            const mId = urlObj.searchParams.get('machine');
            if (mId) {
                showToast(`Washing Machine ${mId} identified! Opening booking dialog...`, 'success');
                openBookingModal(Number(mId));
                return;
            }
        }

        // 2. Gate QR
        if (text.toLowerCase().includes('gate_entry')) {
            handleGateAction('entry');
            return;
        }
        if (text.toLowerCase().includes('gate_exit')) {
            handleGateAction('exit');
            return;
        }

        // 3. Mess QR
        if (text.toLowerCase().includes('mess')) {
            elements.btnMessCheckin.click();
            return;
        }

        showToast(`QR Content recognized: ${text}`, 'info');
    }

    // =========================================================================
    // ENHANCED ADMIN & STAFF DASHBOARD TABS
    // =========================================================================
    function initEnhancedAdminDashboard() {
        // Tab click delegation
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
                const target = document.getElementById(btn.dataset.tab);
                if (target) target.style.display = 'block';

                if (btn.dataset.tab === 'tab-gate-admin') loadAdminGateLogs();
                else if (btn.dataset.tab === 'tab-mess-admin') loadAdminMessHeadcount();
                else if (btn.dataset.tab === 'tab-leave-admin') loadAdminLeaveReview();
                else if (btn.dataset.tab === 'tab-complaints-admin') loadAdminComplaints();
                else if (btn.dataset.tab === 'tab-geofence-admin') loadAdminGeofenceSettings();
            });
        });

        if (elements.btnRefreshAdminGate) elements.btnRefreshAdminGate.addEventListener('click', loadAdminGateLogs);
        if (elements.btnCalcMessHeadcount) elements.btnCalcMessHeadcount.addEventListener('click', loadAdminMessHeadcount);
        if (elements.btnRefreshAdminLeave) elements.btnRefreshAdminLeave.addEventListener('click', loadAdminLeaveReview);
        if (elements.btnRefreshAdminComplaints) elements.btnRefreshAdminComplaints.addEventListener('click', loadAdminComplaints);

        // Geofence settings form
        if (elements.formGeofenceSettings) {
            elements.formGeofenceSettings.addEventListener('submit', async (e) => {
                e.preventDefault();
                const lat = parseFloat(elements.cfgHostelLat.value);
                const lng = parseFloat(elements.cfgHostelLng.value);
                const radius = parseInt(elements.cfgHostelRadius.value, 10);
                const enforced = elements.cfgGeofenceEnforced.checked;

                try {
                    showToast('Updating hostel geofence settings on server...', 'info');
                    await window.HostelService.updateHostelSettings({
                        latitude: lat,
                        longitude: lng,
                        geofence_radius_meters: radius,
                        geofence_enforced: enforced
                    });
                    showToast('Geofence configuration updated successfully!', 'success');
                    window.LocationService.verifyLocation(true);
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        }

        if (elements.btnUseCurrentGps) {
            elements.btnUseCurrentGps.addEventListener('click', async () => {
                try {
                    showToast('Reading device GPS coordinates...', 'info');
                    const coords = await window.LocationService.getCurrentCoordinates();
                    elements.cfgHostelLat.value = coords.lat.toFixed(6);
                    elements.cfgHostelLng.value = coords.lng.toFixed(6);
                    showToast(`Coordinates set to ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`, 'success');
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        }
    }

    async function loadAdminGateLogs() {
        if (!elements.adminGateLogsTbody) return;
        elements.adminGateLogsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 14px;">Loading gate activity...</td></tr>';

        const logs = await window.HostelService.getAllGateLogs();
        elements.adminGateLogsTbody.innerHTML = '';

        if (logs.length === 0) {
            elements.adminGateLogsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 14px; color: var(--text-muted);">No campus gate scans recorded.</td></tr>';
            return;
        }

        logs.forEach(l => {
            const tr = document.createElement('tr');
            const isEntry = l.action === 'entry';
            tr.innerHTML = `
                <td><span class="spec-badge" style="background: ${isEntry ? '#ecfdf5' : '#fef2f2'}; color: ${isEntry ? '#10b981' : '#ef4444'}; font-weight: 700;">${isEntry ? '🟢 ENTRY' : '🔴 EXIT'}</span></td>
                <td><strong>${l.student_name}</strong></td>
                <td>${l.student_roll}</td>
                <td>${new Date(l.timestamp).toLocaleString()}</td>
                <td>${l.gate_name}</td>
                <td>${l.distance_meters ? Math.round(l.distance_meters) + 'm' : 'Inside'}</td>
                <td><span style="font-weight: 700; color: #10b981;">${l.status}</span></td>
            `;
            elements.adminGateLogsTbody.appendChild(tr);
        });
    }

    async function loadAdminMessHeadcount() {
        const date = elements.adminMessDate.value || new Date().toISOString().split('T')[0];
        const meal = elements.adminMessMeal.value || 'lunch';

        const counts = await window.HostelService.getMessHeadcount(date, meal);
        if (elements.adminMessVegCount) elements.adminMessVegCount.textContent = counts.veg;
        if (elements.adminMessNonvegCount) elements.adminMessNonvegCount.textContent = counts.non_veg;
        if (elements.adminMessSkipCount) elements.adminMessSkipCount.textContent = counts.skip;
        if (elements.adminMessAttendedCount) elements.adminMessAttendedCount.textContent = counts.attended;
    }

    async function loadAdminLeaveReview() {
        if (!elements.adminLeaveTbody) return;
        elements.adminLeaveTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 14px;">Loading applications...</td></tr>';

        const leaves = await window.HostelService.getLeaveApplications();
        elements.adminLeaveTbody.innerHTML = '';

        if (leaves.length === 0) {
            elements.adminLeaveTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 14px; color: var(--text-muted);">No leave applications pending.</td></tr>';
            return;
        }

        leaves.forEach(l => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${l.student_name}</strong></td>
                <td>${l.student_roll} (Rm ${l.room_no})</td>
                <td>${l.start_date} to ${l.end_date}</td>
                <td>${l.destination}</td>
                <td><a href="tel:${l.parent_phone}">${l.parent_phone}</a></td>
                <td>${l.reason}</td>
                <td><span class="spec-badge" style="font-weight: 700;">${l.status.toUpperCase()}</span></td>
                <td>
                    ${l.status === 'pending' ? `
                        <div style="display: flex; gap: 4px;">
                            <button type="button" class="btn btn-primary btn-approve-leave" data-id="${l.id}" style="padding: 4px 8px; font-size: 0.72rem; background: #10b981;">✓ Approve</button>
                            <button type="button" class="btn btn-danger btn-reject-leave" data-id="${l.id}" style="padding: 4px 8px; font-size: 0.72rem;">✕ Reject</button>
                        </div>
                    ` : `<span style="font-size: 0.75rem; color: var(--text-muted);">${l.status}</span>`}
                </td>
            `;
            elements.adminLeaveTbody.appendChild(tr);
        });

        elements.adminLeaveTbody.querySelectorAll('.btn-approve-leave').forEach(b => {
            b.addEventListener('click', async () => {
                await window.HostelService.reviewLeaveApplication(b.dataset.id, 'approved', 'Approved by Warden');
                showToast('Leave application approved!', 'success');
                loadAdminLeaveReview();
            });
        });

        elements.adminLeaveTbody.querySelectorAll('.btn-reject-leave').forEach(b => {
            b.addEventListener('click', async () => {
                const reason = prompt('Rejection reason:');
                if (reason) {
                    await window.HostelService.reviewLeaveApplication(b.dataset.id, 'rejected', reason);
                    showToast('Leave rejected.', 'warning');
                    loadAdminLeaveReview();
                }
            });
        });
    }

    async function loadAdminComplaints() {
        if (!elements.adminComplaintsTbody) return;
        elements.adminComplaintsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 14px;">Loading complaints...</td></tr>';

        const complaints = await window.HostelService.getComplaints();
        elements.adminComplaintsTbody.innerHTML = '';

        if (complaints.length === 0) {
            elements.adminComplaintsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 14px; color: var(--text-muted);">No complaints recorded.</td></tr>';
            return;
        }

        complaints.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="spec-badge">${c.category}</span></td>
                <td><strong>${c.student_name}</strong> (Rm ${c.room_no})</td>
                <td><strong>${c.title}</strong><div style="font-size: 0.76rem; color: var(--text-muted);">${c.description}</div></td>
                <td>${new Date(c.created_at).toLocaleDateString()}</td>
                <td><span class="spec-badge" style="font-weight: 700;">${c.status.toUpperCase()}</span></td>
                <td>
                    ${c.status !== 'resolved' ? `
                        <button type="button" class="btn btn-primary btn-resolve-complaint" data-id="${c.id}" style="padding: 4px 8px; font-size: 0.72rem; background: #10b981;">
                            ✓ Mark Resolved
                        </button>
                    ` : `<span style="font-size: 0.75rem; color: #10b981;">✓ Resolved</span>`}
                </td>
            `;
            elements.adminComplaintsTbody.appendChild(tr);
        });

        elements.adminComplaintsTbody.querySelectorAll('.btn-resolve-complaint').forEach(b => {
            b.addEventListener('click', async () => {
                await window.HostelService.updateComplaintStatus(b.dataset.id, 'resolved', 'Fixed by Maintenance Team');
                showToast('Complaint marked as resolved!', 'success');
                loadAdminComplaints();
            });
        });
    }

    async function loadAdminGeofenceSettings() {
        const settings = await window.LocationService.refreshSettings();
        if (elements.cfgHostelLat) elements.cfgHostelLat.value = settings.latitude;
        if (elements.cfgHostelLng) elements.cfgHostelLng.value = settings.longitude;
        if (elements.cfgHostelRadius) elements.cfgHostelRadius.value = settings.geofence_radius_meters;
        if (elements.cfgGeofenceEnforced) elements.cfgGeofenceEnforced.checked = settings.geofence_enforced;
    }

    // =========================================================================
    // WASHING MACHINE PORTAL CONTROLLER (PRESERVED 100%)
    // =========================================================================

    function initTheme() {
        const savedTheme = localStorage.getItem('HOSTELWASH_THEME') || 'light';
        setTheme(savedTheme);

        elements.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
        });
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('HOSTELWASH_THEME', theme);

        if (theme === 'dark') {
            elements.sunIcon.style.display = 'none';
            elements.moonIcon.style.display = 'block';
        } else {
            elements.sunIcon.style.display = 'block';
            elements.moonIcon.style.display = 'none';
        }
    }

    function initDateSelector() {
        const days = window.BookingService.getRollingSevenDays();
        state.selectedDateStr = days[0].dateStr;
        state.selectedDateObj = days[0].dateObj;

        renderDatePills(days, state.selectedDateStr);

        elements.bookingCalendarInput.min = days[0].dateStr;
        elements.bookingCalendarInput.max = days[days.length - 1].dateStr;
        elements.bookingCalendarInput.value = state.selectedDateStr;

        elements.bookingCalendarInput.addEventListener('change', (e) => {
            const chosen = e.target.value;
            if (chosen) {
                selectDate(chosen);
            }
        });
    }

    function renderDatePills(daysList, activeDateStr) {
        elements.datePillsBar.innerHTML = '';

        daysList.forEach(day => {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `date-pill ${day.dateStr === activeDateStr ? 'active' : ''}`;
            pill.dataset.date = day.dateStr;

            pill.innerHTML = `
                <span class="day-name pill-weekday">${day.isToday ? 'Today' : (day.shortLabel || day.dayName)}</span>
                <span class="date-num pill-daynum">${day.subLabel || day.formattedDate}</span>
            `;

            pill.addEventListener('click', () => {
                selectDate(day.dateStr);
            });

            elements.datePillsBar.appendChild(pill);
        });

        updateScheduleBadge(activeDateStr);
    }

    function selectDate(dateStr) {
        state.selectedDateStr = dateStr;
        state.selectedDateObj = new Date(dateStr + 'T00:00:00');

        document.querySelectorAll('.date-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.date === dateStr);
        });

        elements.bookingCalendarInput.value = dateStr;
        updateScheduleBadge(dateStr);
        reloadMachines();
    }

    function updateScheduleBadge(dateStr) {
        const isExt = window.BookingService.isExtendedSchedule(dateStr);
        const sched = window.BookingService.getScheduleDetails(dateStr);
        if (elements.dateSchedulePill) {
            elements.dateSchedulePill.textContent = `${sched.label} (${sched.start} to ${sched.end})`;
            elements.dateSchedulePill.style.background = isExt ? '#eef2ff' : 'var(--badge-bg)';
            elements.dateSchedulePill.style.color = isExt ? 'var(--primary-color)' : 'var(--text-secondary)';
        }
    }

    async function reloadMachines() {
        try {
            const machines = await window.BookingService.getMachinesWithStatus(state.selectedDateStr);
            state.machines = machines;
            renderMachineCards(machines);
            updateKPIs(machines);
        } catch (err) {
            console.error('Error reloading machines:', err);
            showToast('Failed to refresh machine status: ' + err.message, 'error');
        }
    }

    function renderMachineCards(machines) {
        elements.machinesContainer.innerHTML = '';
        state.countdownIntervals.forEach(id => clearInterval(id));
        state.countdownIntervals = [];

        machines.forEach(machine => {
            const card = document.createElement('div');
            card.className = `machine-card ${machine.status}`;
            card.id = `machine-card-${machine.id}`;

            const statusBadges = {
                available: '<span class="status-badge available"><span class="status-dot"></span> Available</span>',
                busy: '<span class="status-badge busy"><span class="status-dot"></span> In Use</span>',
                maintenance: '<span class="status-badge maintenance"><span class="status-dot"></span> Maintenance</span>',
                offline: '<span class="status-badge offline"><span class="status-dot"></span> Offline</span>'
            };

            const photoHtml = machine.photo_url 
                ? `<div class="machine-photo-wrap" style="margin-bottom: 12px; height: 140px; border-radius: var(--radius-md); overflow: hidden; background: #e2e8f0;">
                       <img src="${machine.photo_url}" alt="${machine.name}" style="width: 100%; height: 100%; object-fit: cover;">
                   </div>`
                : '';

            card.innerHTML = `
                <div class="machine-card-header">
                    <div>
                        <span class="machine-bay">MACHINE ${machine.id} • BAY ${machine.id}</span>
                        <h3 class="machine-title">${machine.name}</h3>
                        <p class="machine-model">${machine.model || 'Heavy Duty Industrial Drum'}</p>
                    </div>
                    ${statusBadges[machine.status] || statusBadges.available}
                </div>

                ${photoHtml}

                <div class="machine-specs">
                    <span class="spec-badge">⚖️ ${machine.capacity_kg || 9.0} Kg Heavy Drum</span>
                    <span class="spec-badge">⏱️ 75-Min Slot</span>
                    <span class="spec-badge">⚡ Quick Spin 1400 RPM</span>
                </div>

                <div class="machine-card-body">
                    <div class="slots-info">
                        <strong>${machine.slots ? machine.slots.length : 14} Fixed 75-Min Slots Available</strong>
                        <div class="slots-visual-strip" id="strip-machine-${machine.id}"></div>
                    </div>
                </div>

                <div class="machine-card-footer">
                    <button type="button" class="btn btn-secondary btn-machine-qr" data-machine-id="${machine.id}">
                        <span>📱 QR Code</span>
                    </button>
                    <button type="button" class="btn btn-primary btn-book-machine" data-machine-id="${machine.id}" ${machine.status === 'maintenance' || machine.status === 'offline' ? 'disabled' : ''}>
                        <span>Book 75-Min Slot</span>
                    </button>
                </div>
            `;

            elements.machinesContainer.appendChild(card);
            renderMiniSlotsStrip(machine);
        });

        // Attach Card Button Handlers
        document.querySelectorAll('.btn-book-machine').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const machineId = Number(e.currentTarget.dataset.machineId);
                openBookingModal(machineId);
            });
        });

        document.querySelectorAll('.btn-machine-qr').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const machineId = Number(e.currentTarget.dataset.machineId);
                openSingleMachineQR(machineId);
            });
        });
    }

    function renderMiniSlotsStrip(machine) {
        const stripContainer = document.getElementById(`strip-machine-${machine.id}`);
        if (!stripContainer || !machine.slots) return;

        stripContainer.innerHTML = '';
        machine.slots.forEach(slot => {
            const pip = document.createElement('div');
            pip.className = `slot-pip ${slot.status}`;
            pip.title = `${slot.displayTime} - ${slot.status.toUpperCase()}`;
            stripContainer.appendChild(pip);
        });
    }

    function updateKPIs(machines) {
        let avail = 0;
        let busy = 0;
        let todayBookings = 0;

        machines.forEach(m => {
            if (m.status === 'available') avail++;
            if (m.status === 'busy') busy++;
            if (m.slots) {
                m.slots.forEach(s => {
                    if (s.status === 'busy') todayBookings++;
                });
            }
        });

        if (elements.kpiAvailable) elements.kpiAvailable.textContent = `${avail} / ${machines.length}`;
        if (elements.kpiInUse) elements.kpiInUse.textContent = busy;
        if (elements.kpiTodayBookings) elements.kpiTodayBookings.textContent = todayBookings;
    }

    async function openBookingModal(machineId) {
        state.currentBookingMachineId = machineId;
        const machine = state.machines.find(m => m.id === machineId);

        elements.bmMachineId.value = machineId;
        elements.bmMachineName.value = machine ? `${machine.name} (${machine.capacity_kg || 9.0} Kg)` : `Machine ${machineId}`;
        elements.bmDate.value = state.selectedDateStr;

        const sched = window.BookingService.getScheduleDetails(state.selectedDateStr);
        if (elements.bmScheduleBadge) {
            elements.bmScheduleBadge.textContent = `${sched.label}: ${sched.start} - ${sched.end}`;
        }

        elements.bmSlotsGrid.innerHTML = '<div style="padding: 16px; text-align: center;">Loading 75-minute slots...</div>';
        elements.bmErrorBox.style.display = 'none';
        elements.bmSelectedStartISO.value = '';
        elements.bmSelectedEndISO.value = '';
        state.selectedSlot = null;
        if (elements.btnConfirmBooking) elements.btnConfirmBooking.disabled = true;

        openModal(elements.bookingModal);

        try {
            const slots = await window.BookingService.getSlotsForMachineDate(machineId, state.selectedDateStr);
            renderBookingSlotsGrid(slots);
        } catch (err) {
            elements.bmSlotsGrid.innerHTML = `<div style="color: var(--busy-color); padding: 12px;">Failed to load slots: ${err.message}</div>`;
        }
    }

    function renderBookingSlotsGrid(slots) {
        elements.bmSlotsGrid.innerHTML = '';

        if (!slots || slots.length === 0) {
            elements.bmSlotsGrid.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted);">No slots available for this date.</div>';
            return;
        }

        slots.forEach((slot, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            const isBusy = (slot.status === 'busy' || slot.status === 'booked');
            const isDisabled = (slot.status === 'disabled' || slot.status === 'offline' || slot.status === 'maintenance' || slot.status === 'past');
            btn.className = `slot-selection-card slot-button ${slot.status}`;
            btn.disabled = Boolean(isBusy || isDisabled);

            let statusLabel = slot.status.toUpperCase();
            if (slot.status === 'disabled' && slot.blockReason) {
                btn.title = 'Admin Notice: ' + slot.blockReason;
            }

            btn.innerHTML = `
                <span class="slot-time-text slot-time-range">${slot.displayTime || slot.label}</span>
                <span class="slot-status-text slot-status-label">${statusLabel}</span>
            `;

            if (!isBusy && !isDisabled) {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.slot-selection-card, .slot-button').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    state.selectedSlot = slot;
                    elements.bmSelectedStartISO.value = slot.startISO;
                    elements.bmSelectedEndISO.value = slot.endISO;
                    if (elements.btnConfirmBooking) elements.btnConfirmBooking.disabled = false;
                });
            }

            elements.bmSlotsGrid.appendChild(btn);
        });
    }

    async function handleBookingSubmission() {
        const machineId = state.currentBookingMachineId;
        const studentName = elements.bmStudentName.value.trim();
        const studentRoll = elements.bmStudentRoll.value.trim();
        const studentPhone = elements.bmStudentPhone.value.trim();
        const studentEmail = elements.bmStudentEmail.value.trim();
        const startISO = elements.bmSelectedStartISO.value;
        const endISO = elements.bmSelectedEndISO.value;

        elements.bmErrorBox.style.display = 'none';

        if (!startISO || !endISO) {
            showBookingError('Please click and select an available 75-minute slot from the grid above.');
            return;
        }
        if (!studentName) {
            showBookingError('Please enter Student Full Name.');
            return;
        }
        if (!studentRoll) {
            showBookingError('Please enter Student Roll Number or Room Number.');
            return;
        }
        if (!studentPhone) {
            showBookingError('Please enter Student 10-digit Phone Number.');
            return;
        }

        elements.btnConfirmBooking.disabled = true;
        elements.btnConfirmBooking.innerHTML = '<span>Verifying & Booking...</span>';

        try {
            const booking = await window.BookingService.createBooking({
                machineId: machineId,
                bookingDate: state.selectedDateStr,
                startTimeISO: startISO,
                endTimeISO: endISO,
                studentName: studentName,
                studentRoll: studentRoll,
                studentPhone: studentPhone,
                studentEmail: studentEmail
            });

            closeModal(elements.bookingModal);
            openBookingSuccessModal(booking);
            showToast('Booking successfully confirmed in PostgreSQL!', 'success');
            reloadMachines();
        } catch (err) {
            showBookingError(err.message || 'Booking conflict or server error. Please select another slot.');
        } finally {
            elements.btnConfirmBooking.disabled = false;
            elements.btnConfirmBooking.innerHTML = '<span>Confirm 75-Min Booking</span>';
        }
    }

    function showBookingError(msg) {
        elements.bmErrorBox.style.display = 'block';
        elements.bmErrorBox.textContent = msg;
    }

    function openBookingSuccessModal(booking) {
        const machine = state.machines.find(m => m.id === booking.machine_id);
        const machineName = machine ? machine.name : `Machine ${booking.machine_id}`;

        const startT = new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endT = new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        elements.bsmMachineTitle.textContent = machineName;
        elements.bsmReferenceCode.textContent = booking.reference_code;
        elements.bsmDate.textContent = booking.booking_date;
        elements.bsmTimeSlot.textContent = `${startT} - ${endT} (75 Min)`;
        elements.bsmStudentName.textContent = booking.student_name;
        elements.bsmStudentRoll.textContent = booking.student_roll;

        state.currentPassData = {
            machineName: machineName,
            referenceCode: booking.reference_code,
            date: booking.booking_date,
            timeSlot: `${startT} - ${endT}`,
            studentName: booking.student_name,
            studentRoll: booking.student_roll,
            studentPhone: booking.student_phone
        };

        if (elements.bsmQrCode && window.QRCode) {
            elements.bsmQrCode.innerHTML = '';
            new window.QRCode(elements.bsmQrCode, {
                text: `HOSTEL_WASH_PASS:${booking.reference_code}:${booking.booking_date}:${booking.machine_id}`,
                width: 130,
                height: 130,
                colorDark: '#0f172a',
                colorLight: '#ffffff'
            });
        }

        openModal(elements.bookingSuccessModal);
    }

    function saveTicketToGallery(pass) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 1000;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 800, 1000);

            // Pass card background
            ctx.fillStyle = '#ffffff';
            roundRect(ctx, 40, 40, 720, 920, 24);
            ctx.fill();

            // Header stripe
            ctx.fillStyle = '#4f46e5';
            roundRect(ctx, 40, 40, 720, 180, 24);
            ctx.fill();
            ctx.fillRect(40, 160, 720, 60);

            // Header Text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px Plus Jakarta Sans, Arial';
            ctx.textAlign = 'center';
            ctx.fillText('OFFICIAL LAUNDRY PASS', 400, 95);
            ctx.font = '18px Plus Jakarta Sans, Arial';
            ctx.fillText(pass.machineName + ' • 75-MIN SLOT', 400, 130);
            ctx.font = 'bold 24px monospace';
            ctx.fillText('REF: ' + pass.referenceCode, 400, 175);

            // Details
            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'left';
            ctx.font = 'bold 22px Plus Jakarta Sans, Arial';
            ctx.fillText('Student Details:', 80, 260);

            ctx.font = '18px Plus Jakarta Sans, Arial';
            ctx.fillStyle = '#475569';
            ctx.fillText('Name: ' + pass.studentName, 80, 300);
            ctx.fillText('Roll / Room: ' + pass.studentRoll, 80, 335);
            ctx.fillText('Contact: ' + (pass.studentPhone || 'N/A'), 80, 370);
            ctx.fillText('Date: ' + pass.date, 80, 405);
            ctx.fillText('Time Slot: ' + pass.timeSlot, 80, 440);

            // Instructions
            ctx.fillStyle = '#1e1b4b';
            ctx.font = 'bold 20px Plus Jakarta Sans, Arial';
            ctx.fillText('Hostel Laundry Rules:', 80, 520);
            ctx.font = '16px Plus Jakarta Sans, Arial';
            ctx.fillStyle = '#64748b';
            ctx.fillText('• Arrive strictly on time. Slots are fixed 75 minutes.', 80, 555);
            ctx.fillText('• Empty pockets and use detergent dispenser correctly.', 80, 585);
            ctx.fillText('• Keep machine door open after cycle completes.', 80, 615);

            // Footer
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'center';
            ctx.font = '14px Plus Jakarta Sans, Arial';
            ctx.fillText('Hostel Washing Machine Portal • Verified by Supabase PostgreSQL', 400, 900);

            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `LaundryPass_${pass.referenceCode}.png`;
            link.href = imgData;
            link.click();
            showToast('Laundry pass saved to device gallery!', 'success');
        } catch (e) {
            console.error('Save pass error:', e);
            showToast('Could not save image: ' + e.message, 'error');
        }
    }

    function roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    function openQrModal() {
        if (window.QRService) {
            const container = document.getElementById('all-qr-container');
            window.QRService.renderAllMachineQRCards(container, state.machines);
        }
        openModal(elements.allQrModal);
    }

    function openSingleMachineQR(machineId) {
        openQrModal();
    }

    function initNoticeBoard() {
        renderNoticeBoard();
        if (elements.btnSaveNotice) {
            elements.btnSaveNotice.addEventListener('click', async () => {
                const title = elements.adminNoticeTitle.value.trim();
                const content = elements.adminNoticeContent.value.trim();
                const priority = elements.adminNoticePriority.value;
                const isActive = elements.adminNoticeActive.checked;

                if (!content) {
                    showToast('Please enter notice content.', 'warning');
                    return;
                }

                try {
                    showToast('Publishing notice to all students...', 'info');
                    const client = window.SupabaseManager.getClient();
                    await client.from('hostel_notices').upsert({
                        id: 1,
                        title: title,
                        content: content,
                        priority: priority,
                        is_active: isActive,
                        updated_at: new Date().toISOString()
                    });
                    showToast('Notice published successfully with Live Sync!', 'success');
                    renderNoticeBoard();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        }
    }

    async function renderNoticeBoard() {
        if (!elements.hostelNoticeBoard) return;
        try {
            const client = window.SupabaseManager.getClient();
            if (!client) return;

            const { data } = await client.from('hostel_notices').select('*').eq('id', 1).maybeSingle();
            if (data && data.is_active && data.content) {
                elements.hostelNoticeBoard.style.display = 'block';
                if (elements.noticeHeadline) elements.noticeHeadline.textContent = data.title;
                if (elements.noticeMessage) elements.noticeMessage.textContent = data.content;
                if (elements.noticeDateTime) elements.noticeDateTime.textContent = new Date(data.updated_at).toLocaleString();
                if (elements.adminNoticeTitle) elements.adminNoticeTitle.value = data.title;
                if (elements.adminNoticeContent) elements.adminNoticeContent.value = data.content;
            } else {
                elements.hostelNoticeBoard.style.display = 'none';
            }
        } catch (e) {}
    }

    function initAdminAuth() {
        if (elements.btnAdminAuth) {
            elements.btnAdminAuth.addEventListener('click', () => {
                if (window.AdminService.isAuthenticated()) {
                    openModal(elements.adminDashboardModal);
                    loadAdminBookings();
                } else {
                    openModal(elements.adminLoginModal);
                }
            });
        }

        if (elements.btnSubmitAdminLogin) {
            elements.btnSubmitAdminLogin.addEventListener('click', async () => {
                const id = elements.adminEmailInput.value.trim();
                const pass = elements.adminPasswordInput.value;
                elements.adminLoginError.style.display = 'none';

                try {
                    elements.btnSubmitAdminLogin.disabled = true;
                    elements.btnSubmitAdminLogin.textContent = 'Logging in...';
                    await window.AdminService.login(id, pass);
                    closeModal(elements.adminLoginModal);
                    openModal(elements.adminDashboardModal);
                    showToast('Admin authenticated successfully!', 'success');
                    loadAdminBookings();
                } catch (err) {
                    elements.adminLoginError.style.display = 'block';
                    elements.adminLoginError.textContent = err.message;
                } finally {
                    elements.btnSubmitAdminLogin.disabled = false;
                    elements.btnSubmitAdminLogin.textContent = 'Log In as Admin';
                }
            });
        }

        if (elements.btnAdminLogout) {
            elements.btnAdminLogout.addEventListener('click', async () => {
                await window.AdminService.logout();
                closeModal(elements.adminDashboardModal);
                showToast('Admin signed out.', 'info');
            });
        }

        if (elements.adminBookingsDateFilter) {
            elements.adminBookingsDateFilter.addEventListener('change', loadAdminBookings);
        }
        if (elements.btnAdminClearDate) {
            elements.btnAdminClearDate.addEventListener('click', () => {
                elements.adminBookingsDateFilter.value = '';
                loadAdminBookings();
            });
        }
        if (elements.adminBookingsMachineFilter) {
            elements.adminBookingsMachineFilter.addEventListener('change', loadAdminBookings);
        }
        if (elements.adminBookingsSearch) {
            elements.adminBookingsSearch.addEventListener('input', debounce(loadAdminBookings, 300));
        }

        if (elements.btnDownloadPdfReport) {
            elements.btnDownloadPdfReport.addEventListener('click', async () => {
                const dateVal = elements.pdfReportDate.value;
                const mFilter = elements.pdfReportMachineFilter.value;
                if (!dateVal) {
                    showToast('Please select a date for PDF report.', 'warning');
                    return;
                }
                showToast('Generating PDF audit report...', 'info');
                await window.AdminService.downloadDateWisePdfReport(dateVal, mFilter);
            });
        }

        if (elements.btnRefreshAuditLogs) {
            elements.btnRefreshAuditLogs.addEventListener('click', loadAdminAuditLogs);
        }

        if (elements.btnRefreshAdminSlots) {
            elements.btnRefreshAdminSlots.addEventListener('click', loadAdminSlotControls);
        }
    }

    async function loadAdminBookings() {
        if (!elements.adminBookingsTbody) return;
        const dateFilter = elements.adminBookingsDateFilter.value;
        const machineFilter = elements.adminBookingsMachineFilter.value;
        const searchStr = elements.adminBookingsSearch.value;

        elements.adminBookingsTbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 14px;">Loading bookings...</td></tr>';

        try {
            const bookings = await window.AdminService.getAllBookings({
                dateFilter,
                machineFilter,
                searchStr
            });

            elements.adminBookingsTbody.innerHTML = '';
            if (bookings.length === 0) {
                elements.adminBookingsTbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 14px; color: var(--text-muted);">No bookings found matching filters.</td></tr>';
                return;
            }

            bookings.forEach(b => {
                const start = new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const end = new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const machineName = b.machines?.name || `Machine ${b.machine_id}`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${b.reference_code}</strong></td>
                    <td><span style="font-size: 0.82rem; font-weight: 600; color: var(--primary);">${b.booking_date || ''}</span></td>
                    <td>${machineName}</td>
                    <td>${start} - ${end}</td>
                    <td>${b.student_name}</td>
                    <td>${b.student_roll}</td>
                    <td><a href="tel:${b.student_phone}">${b.student_phone}</a></td>
                    <td><span class="spec-badge">${b.status}</span></td>
                    <td>
                        ${b.status === 'confirmed' ? `
                            <button type="button" class="btn btn-danger btn-cancel-b" data-id="${b.id}" style="padding: 4px 8px; font-size: 0.72rem;">Cancel</button>
                        ` : '-'}
                    </td>
                `;
                elements.adminBookingsTbody.appendChild(tr);
            });

            elements.adminBookingsTbody.querySelectorAll('.btn-cancel-b').forEach(b => {
                b.addEventListener('click', async () => {
                    if (confirm('Cancel this student laundry booking?')) {
                        await window.AdminService.cancelBooking(b.dataset.id);
                        showToast('Booking cancelled.', 'success');
                        loadAdminBookings();
                        reloadMachines();
                    }
                });
            });
        } catch (err) {
            elements.adminBookingsTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--busy-color);">${err.message}</td></tr>`;
        }
    }

    async function loadAdminSlotControls() {
        if (!elements.adminSlotsGridContainer) return;
        const chosenDate = elements.adminSlotsDatePicker.value || state.selectedDateStr;
        const mFilter = elements.adminSlotsMachineFilter.value;

        elements.adminSlotsGridContainer.innerHTML = '<div style="padding: 16px;">Loading operational slots...</div>';

        try {
            const mId = mFilter === 'all' ? 1 : Number(mFilter);
            const slots = await window.BookingService.getSlotsForMachineDate(mId, chosenDate);
            elements.adminSlotsGridContainer.innerHTML = '';

            slots.forEach(s => {
                const item = document.createElement('div');
                item.style.cssText = 'background: var(--bg-card); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;';
                item.innerHTML = `
                    <div>
                        <strong>${s.displayTime}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${s.status.toUpperCase()}</div>
                    </div>
                    <button type="button" class="btn btn-secondary btn-toggle-slot" data-time="${s.displayTime}" style="padding: 4px 8px; font-size: 0.72rem;">
                        ${s.status === 'disabled' ? 'Enable' : 'Disable'}
                    </button>
                `;
                elements.adminSlotsGridContainer.appendChild(item);
            });
        } catch (e) {
            elements.adminSlotsGridContainer.innerHTML = `<div style="color: var(--busy-color);">${e.message}</div>`;
        }
    }

    async function loadAdminAuditLogs() {
        if (!elements.adminAuditLogsTbody) return;
        elements.adminAuditLogsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 14px;">Loading audit logs...</td></tr>';
        try {
            const client = window.SupabaseManager.getClient();
            const { data } = await client.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(40);
            elements.adminAuditLogsTbody.innerHTML = '';
            (data || []).forEach(log => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(log.created_at).toLocaleString()}</td>
                    <td><strong>${log.action}</strong></td>
                    <td>${log.target_id || '-'}</td>
                    <td>${log.performed_by}</td>
                    <td style="font-size: 0.75rem; max-width: 200px; word-break: break-all;">${JSON.stringify(log.details)}</td>
                `;
                elements.adminAuditLogsTbody.appendChild(tr);
            });
        } catch (e) {
            elements.adminAuditLogsTbody.innerHTML = `<tr><td colspan="5" style="color: var(--busy-color);">${e.message}</td></tr>`;
        }
    }

    function initSetupModal() {
        if (elements.btnTestSupabaseConn) {
            elements.btnTestSupabaseConn.addEventListener('click', async () => {
                const url = elements.setupSupabaseUrl.value.trim();
                const key = elements.setupSupabaseAnonKey.value.trim();
                try {
                    const temp = window.supabase.createClient(url, key);
                    const { error } = await temp.from('machines').select('id').limit(1);
                    if (error) throw error;
                    elements.setupTestResult.style.display = 'block';
                    elements.setupTestResult.style.background = '#ecfdf5';
                    elements.setupTestResult.style.color = '#10b981';
                    elements.setupTestResult.textContent = '✓ Connected successfully!';
                } catch (err) {
                    elements.setupTestResult.style.display = 'block';
                    elements.setupTestResult.style.background = '#fef2f2';
                    elements.setupTestResult.style.color = '#ef4444';
                    elements.setupTestResult.textContent = 'Connection failed: ' + err.message;
                }
            });
        }

        if (elements.btnSaveSupabaseConn) {
            elements.btnSaveSupabaseConn.addEventListener('click', () => {
                const url = elements.setupSupabaseUrl.value.trim();
                const key = elements.setupSupabaseAnonKey.value.trim();
                window.AppConfig.saveConfig(url, key);
                closeModal(elements.setupModal);
                showToast('Configuration saved! Reloading...', 'success');
                setTimeout(() => window.location.reload(), 800);
            });
        }
    }

    function handleDbStateChange(state, msg) {
        console.log('Database state changed:', state, msg);
    }

    function handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const machineParam = urlParams.get('machine');
        if (machineParam) {
            const mId = Number(machineParam);
            if (mId >= 1 && mId <= 4) {
                setTimeout(() => openBookingModal(mId), 600);
            }
        }
    }

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

        if (elements.btnSaveTicketGallery) {
            elements.btnSaveTicketGallery.addEventListener('click', () => {
                if (state.currentPassData) {
                    saveTicketToGallery(state.currentPassData);
                }
            });
        }
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

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<div style="font-size: 0.86rem; font-weight: 600;">${message}</div>`;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
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
