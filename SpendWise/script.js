/**
 * SpendWise – Student Expense Tracking & Budget Management Web Application
 * Complete Vanilla JavaScript Implementation
 * Web Technology College Project
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. STATE MANAGEMENT & LOCAL STORAGE KEYS
    // ==========================================
    const STORAGE_KEY_TRANSACTIONS = 'spendwise_transactions';
    const STORAGE_KEY_BUDGET = 'spendwise_monthly_budget';
    const STORAGE_KEY_THEME = 'spendwise_theme_preference';
    const STORAGE_KEY_USERS = 'spendwise_registered_users';
    const STORAGE_KEY_ACTIVE_USER = 'spendwise_active_user';

    // Application state variables
    let transactions = [];
    let monthlyBudget = 5000;
    let editingTransactionId = null;
    let pendingDeleteId = null;

    // Authentication state variables
    let registeredUsers = [];
    let currentUser = null;
    let pendingRegistration = null;
    let generatedOtp = null;
    let otpTimerInterval = null;
    let otpSecondsRemaining = 60;

    // Default Demo Users
    const DEFAULT_USERS = [
        {
            id: 'usr-1',
            name: 'Nikita G.',
            email: 'nikita@spendwise.com',
            password: 'password123'
        }
    ];

    // Category Color Mapping for Charts and Badges
    const CATEGORY_COLORS = {
        'Food': '#ef4444',
        'Travel': '#0ea5e9',
        'Education': '#6366f1',
        'Shopping': '#f59e0b',
        'Entertainment': '#a855f7',
        'Other': '#64748b'
    };

    // Sample / Demo Data for first-time visitors
    const SAMPLE_TRANSACTIONS = [
        {
            id: 'tx-sample-1',
            type: 'Income',
            title: 'Monthly Allowance',
            amount: 10000,
            category: 'Other',
            date: getFormattedCurrentDate(0),
            paymentMethod: 'Bank Transfer',
            notes: 'Monthly allowance received from parents'
        },
        {
            id: 'tx-sample-2',
            type: 'Expense',
            title: 'Lunch at Cafeteria',
            amount: 150,
            category: 'Food',
            date: getFormattedCurrentDate(0),
            paymentMethod: 'UPI',
            notes: 'Thali and juice'
        },
        {
            id: 'tx-sample-3',
            type: 'Expense',
            title: 'Bus Pass Renewal',
            amount: 100,
            category: 'Travel',
            date: getFormattedCurrentDate(-1),
            paymentMethod: 'Cash',
            notes: 'Monthly student bus pass'
        },
        {
            id: 'tx-sample-4',
            type: 'Expense',
            title: 'Web Tech Textbooks',
            amount: 800,
            category: 'Education',
            date: getFormattedCurrentDate(-2),
            paymentMethod: 'Card',
            notes: 'Reference book for Web Technology course'
        },
        {
            id: 'tx-sample-5',
            type: 'Expense',
            title: 'College Hoodie & Supplies',
            amount: 500,
            category: 'Shopping',
            date: getFormattedCurrentDate(-3),
            paymentMethod: 'UPI',
            notes: 'Stationery and department hoodie'
        }
    ];

    // ==========================================
    // 2. DOM ELEMENT REFERENCES
    // ==========================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // Summary displays
    const totalIncomeEl = document.getElementById('total-income-display');
    const totalExpenseEl = document.getElementById('total-expense-display');
    const availableBalanceEl = document.getElementById('available-balance-display');
    const balanceBadgeEl = document.getElementById('balance-status-badge');
    const monthlyBudgetEl = document.getElementById('monthly-budget-display');
    const budgetRemSubtextEl = document.getElementById('budget-rem-subtext');

    // Dashboard Overview elements
    const dashSpentAmountEl = document.getElementById('dash-spent-amount');
    const dashBudgetAmountEl = document.getElementById('dash-budget-amount');
    const dashBudgetProgressFill = document.getElementById('dash-budget-progress-fill');
    const dashBudgetPercentText = document.getElementById('dash-budget-percent-text');
    const dashBudgetRemainingText = document.getElementById('dash-budget-remaining-text');
    const budgetWarningAlert = document.getElementById('budget-warning-alert');
    const budgetWarningMessage = document.getElementById('budget-warning-message');

    const categoryQuickBarsEl = document.getElementById('category-quick-bars');
    const recentTransactionsListEl = document.getElementById('recent-transactions-list');
    const recentEmptyStateEl = document.getElementById('recent-empty-state');

    // Transaction Form elements
    const transactionForm = document.getElementById('transaction-form');
    const formSectionTitle = document.getElementById('form-section-title');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const formErrorBanner = document.getElementById('form-error-banner');
    const formErrorText = document.getElementById('form-error-text');
    const txIdInput = document.getElementById('tx-id');
    const txNameInput = document.getElementById('tx-name');
    const txAmountInput = document.getElementById('tx-amount');
    const txCategorySelect = document.getElementById('tx-category');
    const txDateInput = document.getElementById('tx-date');
    const txPaymentSelect = document.getElementById('tx-payment');
    const txNotesInput = document.getElementById('tx-notes');
    const btnResetForm = document.getElementById('btn-reset-form');
    const btnQuickAdd = document.getElementById('btn-quick-add');

    // Transaction History & Filters
    const transactionTableBody = document.getElementById('transaction-tbody');
    const tableEmptyState = document.getElementById('table-empty-state');
    const txCountBadge = document.getElementById('tx-count-badge');
    const searchTxName = document.getElementById('search-tx-name');
    const filterCategory = document.getElementById('filter-category');
    const filterType = document.getElementById('filter-type');
    const filterDate = document.getElementById('filter-date');
    const btnClearFilters = document.getElementById('btn-clear-filters');

    // Budget Tab elements
    const budgetSettingForm = document.getElementById('budget-setting-form');
    const inputMonthlyBudget = document.getElementById('input-monthly-budget');
    const bmBudgetAmount = document.getElementById('bm-budget-amount');
    const bmSpentAmount = document.getElementById('bm-spent-amount');
    const bmRemainingAmount = document.getElementById('bm-remaining-amount');
    const bmUsagePercent = document.getElementById('bm-usage-percent');
    const bmProgressLabel = document.getElementById('bm-progress-label');
    const bmProgressFill = document.getElementById('bm-progress-fill');
    const bmWarningBanner = document.getElementById('bm-warning-banner');
    const bmWarningText = document.getElementById('bm-warning-text');
    const budgetStatusPill = document.getElementById('budget-status-pill');
    const btnEditBudgetInline = document.getElementById('btn-edit-budget-inline');

    // Spending Analysis elements
    const categoryDonutChart = document.getElementById('category-donut-chart');
    const chartTotalExpense = document.getElementById('chart-total-expense');
    const categoryBreakdownList = document.getElementById('category-breakdown-list');
    const paymentMethodBreakdown = document.getElementById('payment-method-breakdown');

    // Action Buttons & Modals
    const btnExportCsv = document.getElementById('btn-export-csv');
    const btnResetData = document.getElementById('btn-reset-data');
    const modalDelete = document.getElementById('modal-delete');
    const deleteTxDetails = document.getElementById('delete-tx-details');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    const modalReset = document.getElementById('modal-reset');
    const btnConfirmReset = document.getElementById('btn-confirm-reset');
    const toastContainer = document.getElementById('toast-container');

    // Authentication DOM elements
    const authOverlay = document.getElementById('auth-overlay');
    const authErrorBanner = document.getElementById('auth-error-banner');
    const authErrorText = document.getElementById('auth-error-text');
    const viewLogin = document.getElementById('view-login');
    const viewRegister = document.getElementById('view-register');
    const viewOtp = document.getElementById('view-otp');
    const formLogin = document.getElementById('form-login');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const btnGotoRegister = document.getElementById('btn-goto-register');
    const formRegister = document.getElementById('form-register');
    const regNameInput = document.getElementById('reg-name');
    const regEmailInput = document.getElementById('reg-email');
    const regPasswordInput = document.getElementById('reg-password');
    const regConfirmPasswordInput = document.getElementById('reg-confirm-password');
    const btnGotoLogin = document.getElementById('btn-goto-login');
    const formVerifyOtp = document.getElementById('form-verify-otp');
    const otpInput = document.getElementById('otp-input');
    const otpDisplayEmail = document.getElementById('otp-display-email');
    const simulatedOtpCode = document.getElementById('simulated-otp-code');
    const otpTimerText = document.getElementById('otp-timer-text');
    const otpSecondsEl = document.getElementById('otp-seconds');
    const btnResendOtp = document.getElementById('btn-resend-otp');
    const btnBackToReg = document.getElementById('btn-back-to-reg');
    const userProfileBadge = document.getElementById('user-profile-badge');
    const headerUserAvatar = document.getElementById('header-user-avatar');
    const headerUserName = document.getElementById('header-user-name');
    const btnLogout = document.getElementById('btn-logout');
    const btnHeaderLogin = document.getElementById('btn-header-login');
    const btnCloseAuth = document.getElementById('btn-close-auth');
    const btnToggleDemoOtp = document.getElementById('btn-toggle-demo-otp');
    const vivaDemoBox = document.getElementById('viva-demo-box');

    // ==========================================
    // 3. INITIALIZATION & SETUP
    // ==========================================
    initApp();

    function initApp() {
        loadThemePreference();
        loadAuthData();
        loadDataFromLocalStorage();
        setupDefaultDates();
        attachEventListeners();
        attachAuthEventListeners();
        renderAllViews();
        checkAuthStatus();
    }

    // Load data from localStorage (or populate sample data if first run)
    function loadDataFromLocalStorage() {
        try {
            const storedTx = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
            if (storedTx !== null) {
                transactions = JSON.parse(storedTx) || [];
            } else {
                // Initialize with sample data on first visit
                transactions = [...SAMPLE_TRANSACTIONS];
                saveTransactionsToStorage();
            }

            const storedBudget = localStorage.getItem(STORAGE_KEY_BUDGET);
            if (storedBudget !== null) {
                monthlyBudget = parseFloat(storedBudget) || 5000;
            } else {
                monthlyBudget = 5000;
                localStorage.setItem(STORAGE_KEY_BUDGET, monthlyBudget.toString());
            }
        } catch (err) {
            console.error('Error loading data from localStorage:', err);
            transactions = [];
            monthlyBudget = 5000;
        }
    }

    function saveTransactionsToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
        } catch (err) {
            console.error('Error saving transactions to localStorage:', err);
            showToast('Failed to save data to browser storage', 'danger');
        }
    }

    function saveBudgetToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY_BUDGET, monthlyBudget.toString());
        } catch (err) {
            console.error('Error saving budget to localStorage:', err);
        }
    }

    function setupDefaultDates() {
        const todayStr = new Date().toISOString().split('T')[0];
        txDateInput.value = todayStr;
        inputMonthlyBudget.value = monthlyBudget;
    }

    // ==========================================
    // 3.1 AUTHENTICATION & EMAIL OTP LOGIC
    // ==========================================
    function loadAuthData() {
        try {
            const storedUsers = localStorage.getItem(STORAGE_KEY_USERS);
            if (storedUsers) {
                registeredUsers = JSON.parse(storedUsers) || [];
            } else {
                registeredUsers = [...DEFAULT_USERS];
                saveRegisteredUsers();
            }

            const storedActiveUser = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
            if (storedActiveUser) {
                currentUser = JSON.parse(storedActiveUser);
            } else {
                currentUser = null;
            }
        } catch (err) {
            console.error('Error loading auth data from localStorage:', err);
            registeredUsers = [...DEFAULT_USERS];
            currentUser = null;
        }
    }

    function saveRegisteredUsers() {
        try {
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(registeredUsers));
        } catch (err) {
            console.error('Error saving users to localStorage:', err);
        }
    }

    function checkAuthStatus() {
        if (currentUser && currentUser.email) {
            // User is logged in
            authOverlay.classList.add('hidden');
            userProfileBadge.classList.remove('hidden');
            if (btnHeaderLogin) btnHeaderLogin.classList.add('hidden');
            headerUserName.textContent = currentUser.name || 'Student';
            headerUserAvatar.textContent = (currentUser.name || 'S').charAt(0).toUpperCase();
        } else {
            // User is not logged in
            authOverlay.classList.remove('hidden');
            userProfileBadge.classList.add('hidden');
            if (btnHeaderLogin) btnHeaderLogin.classList.remove('hidden');
            switchAuthView('login');
        }
    }

    function switchAuthView(viewName) {
        hideAuthError();
        viewLogin.classList.add('hidden');
        viewRegister.classList.add('hidden');
        viewOtp.classList.add('hidden');

        if (viewName === 'login') {
            viewLogin.classList.remove('hidden');
        } else if (viewName === 'register') {
            viewRegister.classList.remove('hidden');
        } else if (viewName === 'otp') {
            viewOtp.classList.remove('hidden');
            otpInput.value = '';
            otpInput.focus();
        }
    }

    function showAuthError(msg) {
        authErrorText.textContent = msg;
        authErrorBanner.classList.remove('hidden');
    }

    function hideAuthError() {
        authErrorBanner.classList.add('hidden');
    }

    function generateSixDigitOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    function startOtpCountdown() {
        clearInterval(otpTimerInterval);
        otpSecondsRemaining = 60;
        otpSecondsEl.textContent = otpSecondsRemaining;
        otpTimerText.classList.remove('hidden');
        btnResendOtp.classList.add('hidden');

        otpTimerInterval = setInterval(() => {
            otpSecondsRemaining--;
            otpSecondsEl.textContent = otpSecondsRemaining;

            if (otpSecondsRemaining <= 0) {
                clearInterval(otpTimerInterval);
                otpTimerText.classList.add('hidden');
                btnResendOtp.classList.remove('hidden');
            }
        }, 1000);
    }

    // EmailJS Configuration for Sending Real Emails directly to recipient's mobile phone inbox
    // Free service: Sign up at https://www.emailjs.com/ and add your keys here if you want live email delivery!
    const EMAILJS_CONFIG = {
        SERVICE_ID: '',      // EmailJS Service ID (e.g. 'service_spendwise')
        TEMPLATE_ID: '',     // EmailJS Template ID (e.g. 'template_otp')
        PUBLIC_KEY: ''       // EmailJS Public Key (e.g. 'user_xxxxxxxxxxxx')
    };

    function sendEmailViaEmailJS(toEmail, toName, otpCode) {
        if (typeof emailjs !== 'undefined' && EMAILJS_CONFIG.PUBLIC_KEY) {
            emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, {
                to_email: toEmail,
                to_name: toName,
                otp_code: otpCode
            }, EMAILJS_CONFIG.PUBLIC_KEY)
            .then(() => {
                showToast(`Real email delivered to ${toEmail}! 📱`, 'success');
            })
            .catch((err) => {
                console.warn('[EmailJS] Notice:', err);
            });
        }
    }

    function loginUser(user) {
        currentUser = {
            id: user.id,
            name: user.name,
            email: user.email
        };
        localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(currentUser));
        checkAuthStatus();
        showToast(`Welcome back, ${currentUser.name}! 👋`, 'success');
    }

    function logoutUser() {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
        currentUser = null;
        checkAuthStatus();
        showToast('You have been logged out successfully.', 'info');
    }

    function attachAuthEventListeners() {
        // Toggle view links
        btnGotoRegister.addEventListener('click', () => switchAuthView('register'));
        btnGotoLogin.addEventListener('click', () => switchAuthView('login'));
        btnBackToReg.addEventListener('click', () => switchAuthView('register'));

        // Header Login button (when user is logged out or wants to open login modal)
        if (btnHeaderLogin) {
            btnHeaderLogin.addEventListener('click', () => {
                authOverlay.classList.remove('hidden');
                switchAuthView('login');
            });
        }

        // Close modal button
        if (btnCloseAuth) {
            btnCloseAuth.addEventListener('click', () => {
                authOverlay.classList.add('hidden');
            });
        }

        // Toggle Examiner/Viva offline demo OTP display
        if (btnToggleDemoOtp && vivaDemoBox) {
            btnToggleDemoOtp.addEventListener('click', () => {
                vivaDemoBox.classList.toggle('hidden');
            });
        }

        // Toggle password visibility
        document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const targetInput = document.getElementById(targetId);
                if (targetInput) {
                    if (targetInput.type === 'password') {
                        targetInput.type = 'text';
                        btn.textContent = '🔒';
                    } else {
                        targetInput.type = 'password';
                        btn.textContent = '👁️';
                    }
                }
            });
        });

        // 1. LOGIN SUBMIT
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            hideAuthError();

            const email = loginEmailInput.value.trim().toLowerCase();
            const password = loginPasswordInput.value;

            if (!email || !password) {
                showAuthError('Please enter both Email/User ID and password.');
                return;
            }

            const foundUser = registeredUsers.find(u => 
                (u.email.toLowerCase() === email || (u.name && u.name.toLowerCase() === email)) && 
                u.password === password
            );

            if (foundUser) {
                formLogin.reset();
                loginUser(foundUser);
            } else {
                showAuthError('Invalid email or password. Please check your credentials.');
            }
        });

        // 2. REGISTER / SEND OTP SUBMIT
        formRegister.addEventListener('submit', (e) => {
            e.preventDefault();
            hideAuthError();

            const name = regNameInput.value.trim();
            const email = regEmailInput.value.trim().toLowerCase();
            const password = regPasswordInput.value;
            const confirmPassword = regConfirmPasswordInput.value;

            if (!name) {
                showAuthError('Please enter your full name.');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                showAuthError('Please enter a valid email address.');
                return;
            }

            if (registeredUsers.some(u => u.email.toLowerCase() === email)) {
                showAuthError('An account with this email address already exists. Please log in.');
                return;
            }

            if (!password || password.length < 6) {
                showAuthError('Password must be at least 6 characters long.');
                return;
            }

            if (password !== confirmPassword) {
                showAuthError('Passwords do not match. Please re-enter.');
                return;
            }

            // Save pending registration
            pendingRegistration = {
                id: 'usr-' + Date.now(),
                name,
                email,
                password
            };

            // Generate OTP
            generatedOtp = generateSixDigitOtp();
            otpDisplayEmail.textContent = email;
            if (simulatedOtpCode) simulatedOtpCode.textContent = generatedOtp;

            // Log OTP to browser console for developer/student reference
            console.log('%c[SpendWise Security] 📩 Verification OTP for ' + email + ' is: ' + generatedOtp, 'background: #4f46e5; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 14px;');

            // Send real email via EmailJS (if configured)
            sendEmailViaEmailJS(email, name, generatedOtp);

            switchAuthView('otp');
            startOtpCountdown();

            showToast(`📩 OTP dispatched to ${email}! Please check your mobile/email inbox.`, 'info');
        });

        // 3. OTP VERIFY SUBMIT
        formVerifyOtp.addEventListener('submit', (e) => {
            e.preventDefault();
            hideAuthError();

            const enteredCode = otpInput.value.trim();

            if (!enteredCode || enteredCode.length !== 6) {
                showAuthError('Please enter the full 6-digit OTP code.');
                return;
            }

            if (enteredCode !== generatedOtp) {
                showAuthError('Incorrect OTP code. Please enter the valid code sent to your email.');
                return;
            }

            // OTP verified successfully! Create user
            if (pendingRegistration) {
                registeredUsers.push(pendingRegistration);
                saveRegisteredUsers();

                const newUser = pendingRegistration;
                pendingRegistration = null;
                generatedOtp = null;
                clearInterval(otpTimerInterval);

                formRegister.reset();
                formVerifyOtp.reset();

                loginUser(newUser);
                showToast('Registration successful! Welcome to SpendWise. 🎉', 'success');
            }
        });

        // 4. RESEND OTP
        btnResendOtp.addEventListener('click', () => {
            if (!pendingRegistration) return;

            generatedOtp = generateSixDigitOtp();
            if (simulatedOtpCode) simulatedOtpCode.textContent = generatedOtp;

            console.log('%c[SpendWise Security] 📩 Resent OTP for ' + pendingRegistration.email + ' is: ' + generatedOtp, 'background: #4f46e5; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 14px;');

            sendEmailViaEmailJS(pendingRegistration.email, pendingRegistration.name, generatedOtp);

            startOtpCountdown();
            hideAuthError();
            showToast(`New OTP code dispatched to ${pendingRegistration.email}!`, 'info');
        });

        // 5. LOGOUT BUTTON
        btnLogout.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out?')) {
                logoutUser();
            }
        });
    }

    // ==========================================
    // 4. THEME TOGGLE (LIGHT / DARK)
    // ==========================================
    function loadThemePreference() {
        const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcons(savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(STORAGE_KEY_THEME, newTheme);
        updateThemeIcons(newTheme);
        showToast(`Switched to ${newTheme} theme`, 'info');
    }

    function updateThemeIcons(theme) {
        if (theme === 'dark') {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        } else {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
    }

    // ==========================================
    // 5. NAVIGATION & TAB SWITCHING
    // ==========================================
    function switchTab(targetTabId) {
        navTabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === targetTabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        tabContents.forEach(content => {
            if (content.id === `tab-${targetTabId}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ==========================================
    // 6. CALCULATIONS & METRICS
    // ==========================================
    function calculateSummaryTotals() {
        let totalIncome = 0;
        let totalExpenses = 0;

        const currentMonthKey = getCurrentMonthKey();
        let monthlyExpenses = 0;

        transactions.forEach(tx => {
            const amount = parseFloat(tx.amount) || 0;
            if (tx.type === 'Income') {
                totalIncome += amount;
            } else if (tx.type === 'Expense') {
                totalExpenses += amount;
                
                // Monthly expenses calculation (matching current YYYY-MM)
                if (tx.date && tx.date.substring(0, 7) === currentMonthKey) {
                    monthlyExpenses += amount;
                }
            }
        });

        const availableBalance = totalIncome - totalExpenses;
        const remainingBudget = monthlyBudget - monthlyExpenses;
        const budgetUsagePercent = monthlyBudget > 0 ? (monthlyExpenses / monthlyBudget) * 100 : 0;

        return {
            totalIncome,
            totalExpenses,
            availableBalance,
            monthlyExpenses,
            remainingBudget,
            budgetUsagePercent
        };
    }

    // ==========================================
    // 7. UI RENDER FUNCTIONS
    // ==========================================
    function renderAllViews() {
        const metrics = calculateSummaryTotals();
        renderSummaryCards(metrics);
        renderDashboardOverview(metrics);
        renderTransactionHistoryTable();
        renderBudgetTab(metrics);
        renderSpendingAnalysis(metrics);
    }

    // Render 4 Summary Cards
    function renderSummaryCards(metrics) {
        totalIncomeEl.textContent = formatCurrency(metrics.totalIncome);
        totalExpenseEl.textContent = formatCurrency(metrics.totalExpenses);
        availableBalanceEl.textContent = formatCurrency(metrics.availableBalance);
        monthlyBudgetEl.textContent = formatCurrency(monthlyBudget);

        // Update balance status badge
        if (metrics.availableBalance >= 0) {
            balanceBadgeEl.textContent = 'Positive Balance';
            balanceBadgeEl.className = 'badge badge-success';
        } else {
            balanceBadgeEl.textContent = 'Negative Balance';
            balanceBadgeEl.className = 'badge badge-danger';
        }

        budgetRemSubtextEl.textContent = `Remaining: ${formatCurrency(metrics.remainingBudget)}`;
    }

    // Render Dashboard Overview Widget & Recent Transactions
    function renderDashboardOverview(metrics) {
        dashSpentAmountEl.textContent = formatCurrency(metrics.monthlyExpenses);
        dashBudgetAmountEl.textContent = formatCurrency(monthlyBudget);

        const clampedPercent = Math.min(Math.round(metrics.budgetUsagePercent), 100);
        dashBudgetProgressFill.style.width = `${clampedPercent}%`;
        dashBudgetPercentText.textContent = `${Math.round(metrics.budgetUsagePercent)}% Used`;
        dashBudgetRemainingText.textContent = `Remaining: ${formatCurrency(metrics.remainingBudget)}`;

        // Dynamic progress color & warnings
        dashBudgetProgressFill.className = 'progress-bar-fill';
        if (metrics.budgetUsagePercent >= 100) {
            dashBudgetProgressFill.classList.add('danger');
            budgetWarningAlert.classList.remove('hidden');
            budgetWarningMessage.textContent = `Alert: Monthly budget exceeded by ${formatCurrency(Math.abs(metrics.remainingBudget))}!`;
        } else if (metrics.budgetUsagePercent >= 90) {
            dashBudgetProgressFill.classList.add('warning');
            budgetWarningAlert.classList.remove('hidden');
            budgetWarningMessage.textContent = `Warning: You have used ${Math.round(metrics.budgetUsagePercent)}% of your monthly budget!`;
        } else {
            budgetWarningAlert.classList.add('hidden');
        }

        renderCategoryQuickBars(metrics.totalExpenses);
        renderRecentTransactionsList();
    }

    // Category Quick Bars on Dashboard
    function renderCategoryQuickBars(totalExpenses) {
        categoryQuickBarsEl.innerHTML = '';

        const categoryTotals = getCategoryExpenseTotals();
        const categories = ['Food', 'Travel', 'Education', 'Shopping', 'Entertainment', 'Other'];

        let hasExpenses = false;
        categories.forEach(cat => {
            const spent = categoryTotals[cat] || 0;
            if (spent > 0) hasExpenses = true;

            const percentage = totalExpenses > 0 ? (spent / totalExpenses) * 100 : 0;

            const barItem = document.createElement('div');
            barItem.className = 'cat-bar-item';
            barItem.innerHTML = `
                <div class="cat-bar-info">
                    <span class="cat-bar-name">${cat}</span>
                    <span class="cat-bar-amount">${formatCurrency(spent)} (${Math.round(percentage)}%)</span>
                </div>
                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${CATEGORY_COLORS[cat]};"></div>
                </div>
            `;
            categoryQuickBarsEl.appendChild(barItem);
        });

        if (!hasExpenses) {
            categoryQuickBarsEl.innerHTML = `<p class="card-subtext text-center py-2">No category expenses recorded yet.</p>`;
        }
    }

    // Recent Transactions List (Top 5)
    function renderRecentTransactionsList() {
        recentTransactionsListEl.innerHTML = '';

        const sortedTx = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        const recent5 = sortedTx.slice(0, 5);

        if (recent5.length === 0) {
            recentEmptyStateEl.classList.remove('hidden');
            return;
        }

        recentEmptyStateEl.classList.add('hidden');

        recent5.forEach(tx => {
            const li = document.createElement('li');
            li.className = 'recent-item';

            const isIncome = tx.type === 'Income';
            const sign = isIncome ? '+' : '-';
            const amountClass = isIncome ? 'income' : 'expense';

            li.innerHTML = `
                <div class="recent-left">
                    <span class="cat-badge cat-${tx.category}">${tx.category}</span>
                    <div class="recent-details">
                        <span class="recent-title">${escapeHTML(tx.title)}</span>
                        <span class="recent-sub">${formatDateDisplay(tx.date)} • ${tx.paymentMethod}</span>
                    </div>
                </div>
                <div class="recent-amount ${amountClass}">
                    ${sign}${formatCurrency(tx.amount)}
                </div>
            `;
            recentTransactionsListEl.appendChild(li);
        });
    }

    // Render Transaction History Table with Filters
    function renderTransactionHistoryTable() {
        transactionTableBody.innerHTML = '';

        const filtered = filterTransactionsList();
        txCountBadge.textContent = `${filtered.length} Transaction${filtered.length !== 1 ? 's' : ''}`;

        if (filtered.length === 0) {
            tableEmptyState.classList.remove('hidden');
            return;
        }

        tableEmptyState.classList.add('hidden');

        // Sort by date descending
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        filtered.forEach(tx => {
            const tr = document.createElement('tr');

            const isIncome = tx.type === 'Income';
            const typeBadgeClass = isIncome ? 'badge-success' : 'badge-danger';
            const amountColorClass = isIncome ? 'text-success' : 'text-danger';
            const sign = isIncome ? '+' : '-';

            tr.innerHTML = `
                <td><strong>${formatDateDisplay(tx.date)}</strong></td>
                <td>${escapeHTML(tx.title)}</td>
                <td><span class="cat-badge cat-${tx.category}">${tx.category}</span></td>
                <td><span class="badge ${typeBadgeClass}">${tx.type}</span></td>
                <td>${tx.paymentMethod || 'N/A'}</td>
                <td class="${amountColorClass}"><strong>${sign}${formatCurrency(tx.amount)}</strong></td>
                <td>${tx.notes ? escapeHTML(tx.notes) : '<span class="text-muted">-</span>'}</td>
                <td class="text-right">
                    <button class="btn btn-sm btn-outline btn-edit-tx" data-id="${tx.id}" title="Edit Transaction">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button class="btn btn-sm btn-danger-outline btn-delete-tx" data-id="${tx.id}" title="Delete Transaction">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        <span>Delete</span>
                    </button>
                </td>
            `;
            transactionTableBody.appendChild(tr);
        });
    }

    // Filter Logic
    function filterTransactionsList() {
        const searchText = searchTxName.value.trim().toLowerCase();
        const selectedCat = filterCategory.value;
        const selectedType = filterType.value;
        const selectedDate = filterDate.value;

        return transactions.filter(tx => {
            const matchesSearch = searchText === '' ||
                tx.title.toLowerCase().includes(searchText) ||
                (tx.notes && tx.notes.toLowerCase().includes(searchText));

            const matchesCategory = selectedCat === 'All' || tx.category === selectedCat;
            const matchesType = selectedType === 'All' || tx.type === selectedType;
            const matchesDate = !selectedDate || tx.date === selectedDate;

            return matchesSearch && matchesCategory && matchesType && matchesDate;
        });
    }

    // Render Budget Tab Section
    function renderBudgetTab(metrics) {
        bmBudgetAmount.textContent = formatCurrency(monthlyBudget);
        bmSpentAmount.textContent = formatCurrency(metrics.monthlyExpenses);
        bmRemainingAmount.textContent = formatCurrency(metrics.remainingBudget);
        bmUsagePercent.textContent = `${Math.round(metrics.budgetUsagePercent)}%`;

        const clampedPercent = Math.min(Math.round(metrics.budgetUsagePercent), 100);
        bmProgressFill.style.width = `${clampedPercent}%`;
        bmProgressLabel.textContent = `${Math.round(metrics.budgetUsagePercent)}% Spent`;

        bmProgressFill.className = 'progress-bar-fill';

        if (metrics.budgetUsagePercent >= 100) {
            bmProgressFill.classList.add('danger');
            bmWarningBanner.classList.remove('hidden');
            bmWarningText.textContent = `Budget Exceeded! You have spent ${formatCurrency(metrics.monthlyExpenses)}, which is over your target budget of ${formatCurrency(monthlyBudget)}.`;
            budgetStatusPill.textContent = 'Exceeded';
            budgetStatusPill.className = 'badge badge-danger';
        } else if (metrics.budgetUsagePercent >= 80) {
            bmProgressFill.classList.add('warning');
            bmWarningBanner.classList.remove('hidden');
            bmWarningText.textContent = `Warning: You have spent ${Math.round(metrics.budgetUsagePercent)}% of your monthly budget. Watch your upcoming expenses!`;
            budgetStatusPill.textContent = 'Near Limit';
            budgetStatusPill.className = 'badge badge-warning';
        } else {
            bmWarningBanner.classList.add('hidden');
            budgetStatusPill.textContent = 'On Track';
            budgetStatusPill.className = 'badge badge-success';
        }
    }

    // Render Spending Analysis Section
    function renderSpendingAnalysis(metrics) {
        chartTotalExpense.textContent = formatCurrency(metrics.totalExpenses);
        const categoryTotals = getCategoryExpenseTotals();

        // 1. Render SVG Donut Chart
        renderDonutChart(categoryTotals, metrics.totalExpenses);

        // 2. Render Category Detailed Progress Bars
        categoryBreakdownList.innerHTML = '';
        const categories = ['Food', 'Travel', 'Education', 'Shopping', 'Entertainment', 'Other'];

        let hasData = false;
        categories.forEach(cat => {
            const spent = categoryTotals[cat] || 0;
            if (spent > 0) hasData = true;

            const percent = metrics.totalExpenses > 0 ? (spent / metrics.totalExpenses) * 100 : 0;

            const div = document.createElement('div');
            div.className = 'cat-bar-item';
            div.innerHTML = `
                <div class="cat-bar-info">
                    <span class="cat-bar-name">
                        <span class="cat-badge cat-${cat}">${cat}</span>
                    </span>
                    <span class="cat-bar-amount">${formatCurrency(spent)} (${Math.round(percent)}%)</span>
                </div>
                <div class="progress-bar-track lg">
                    <div class="progress-bar-fill" style="width: ${percent}%; background-color: ${CATEGORY_COLORS[cat]};"></div>
                </div>
            `;
            categoryBreakdownList.appendChild(div);
        });

        if (!hasData) {
            categoryBreakdownList.innerHTML = '<p class="empty-state">No expense transactions recorded yet.</p>';
        }

        // 3. Payment Method Breakdown
        renderPaymentMethodBreakdown();
    }

    // SVG Donut Chart Generator
    function renderDonutChart(categoryTotals, totalExpense) {
        categoryDonutChart.innerHTML = '';

        if (totalExpense <= 0) {
            // Draw empty gray ring
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '100');
            circle.setAttribute('cy', '100');
            circle.setAttribute('r', '70');
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', '#cbd5e1');
            circle.setAttribute('stroke-width', '24');
            categoryDonutChart.appendChild(circle);
            return;
        }

        let startAngle = 0;
        const categories = ['Food', 'Travel', 'Education', 'Shopping', 'Entertainment', 'Other'];

        categories.forEach(cat => {
            const spent = categoryTotals[cat] || 0;
            if (spent <= 0) return;

            const sliceAngle = (spent / totalExpense) * 360;
            const endAngle = startAngle + sliceAngle;

            // Generate arc path
            const pathData = getDonutPath(100, 100, 70, startAngle, endAngle);
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', CATEGORY_COLORS[cat]);
            path.setAttribute('stroke-width', '24');

            categoryDonutChart.appendChild(path);
            startAngle = endAngle;
        });
    }

    // SVG Arc Path helper
    function getDonutPath(cx, cy, radius, startAngle, endAngle) {
        // Handle 360 degree full circle arc
        if (endAngle - startAngle >= 359.9) {
            endAngle = startAngle + 359.9;
        }

        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;

        const x1 = cx + radius * Math.cos(startRad);
        const y1 = cy + radius * Math.sin(startRad);
        const x2 = cx + radius * Math.cos(endRad);
        const y2 = cy + radius * Math.sin(endRad);

        const largeArcFlag = (endAngle - startAngle) <= 180 ? '0' : '1';

        return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
    }

    function renderPaymentMethodBreakdown() {
        paymentMethodBreakdown.innerHTML = '';
        const methods = ['Cash', 'UPI', 'Card', 'Bank Transfer'];
        const totals = { Cash: 0, UPI: 0, Card: 0, 'Bank Transfer': 0 };

        let totalAll = 0;
        transactions.forEach(tx => {
            const amt = parseFloat(tx.amount) || 0;
            const pm = tx.paymentMethod || 'Cash';
            if (totals.hasOwnProperty(pm)) {
                totals[pm] += amt;
                totalAll += amt;
            }
        });

        methods.forEach(pm => {
            const spent = totals[pm];
            const pct = totalAll > 0 ? (spent / totalAll) * 100 : 0;

            const item = document.createElement('div');
            item.className = 'payment-item';
            item.innerHTML = `
                <div>
                    <strong>${pm}</strong>
                    <div class="card-subtext">${Math.round(pct)}% of total movement</div>
                </div>
                <strong>${formatCurrency(spent)}</strong>
            `;
            paymentMethodBreakdown.appendChild(item);
        });
    }

    function getCategoryExpenseTotals() {
        const totals = {
            'Food': 0,
            'Travel': 0,
            'Education': 0,
            'Shopping': 0,
            'Entertainment': 0,
            'Other': 0
        };

        transactions.forEach(tx => {
            if (tx.type === 'Expense' && totals.hasOwnProperty(tx.category)) {
                totals[tx.category] += parseFloat(tx.amount) || 0;
            }
        });

        return totals;
    }

    // ==========================================
    // 8. FORM VALIDATION & TRANSACTION ACTIONS
    // ==========================================
    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Gather Form Data
        const typeEl = document.querySelector('input[name="tx-type"]:checked');
        const type = typeEl ? typeEl.value : '';
        const title = txNameInput.value.trim();
        const amount = parseFloat(txAmountInput.value);
        const category = txCategorySelect.value;
        const date = txDateInput.value;
        const paymentMethod = txPaymentSelect.value;
        const notes = txNotesInput.value.trim();

        // 2. Form Validation
        const validationError = validateTransactionForm(type, title, amount, category, date, paymentMethod);

        if (validationError) {
            formErrorText.textContent = validationError;
            formErrorBanner.classList.remove('hidden');
            window.scrollTo({ top: formErrorBanner.offsetTop - 100, behavior: 'smooth' });
            return;
        }

        formErrorBanner.classList.add('hidden');

        // 3. Save or Update Transaction
        if (editingTransactionId) {
            // Update existing
            const index = transactions.findIndex(t => t.id === editingTransactionId);
            if (index !== -1) {
                transactions[index] = {
                    id: editingTransactionId,
                    type,
                    title,
                    amount,
                    category,
                    date,
                    paymentMethod,
                    notes
                };
                showToast('Transaction updated successfully!', 'success');
            }
        } else {
            // Add new
            const newTx = {
                id: 'tx-' + Date.now(),
                type,
                title,
                amount,
                category,
                date,
                paymentMethod,
                notes
            };
            transactions.push(newTx);
            showToast('New transaction added successfully!', 'success');
        }

        // Save & Reset
        saveTransactionsToStorage();
        resetFormState();
        renderAllViews();

        // Switch back to dashboard overview or history
        switchTab('dashboard');
    });

    function validateTransactionForm(type, title, amount, category, date, paymentMethod) {
        if (!type) {
            return 'Please select a transaction type (Income or Expense).';
        }
        if (!title || title.length === 0) {
            return 'Transaction Name / Description cannot be empty.';
        }
        if (isNaN(amount) || amount <= 0) {
            return 'Amount must be a valid number greater than 0.';
        }
        if (!category) {
            return 'Please select a category.';
        }
        if (!date) {
            return 'Please select a valid date.';
        }
        if (!paymentMethod) {
            return 'Please select a payment method.';
        }
        return null;
    }

    function resetFormState() {
        editingTransactionId = null;
        txIdInput.value = '';
        transactionForm.reset();

        document.querySelector('input[name="tx-type"][value="Expense"]').checked = true;
        setupDefaultDates();

        formSectionTitle.textContent = 'Add New Transaction';
        btnCancelEdit.classList.add('hidden');
        formErrorBanner.classList.add('hidden');
    }

    // Edit Transaction Trigger
    function startEditTransaction(id) {
        const tx = transactions.find(t => t.id === id);
        if (!tx) return;

        editingTransactionId = id;
        txIdInput.value = tx.id;

        const typeRadio = document.querySelector(`input[name="tx-type"][value="${tx.type}"]`);
        if (typeRadio) typeRadio.checked = true;

        txNameInput.value = tx.title;
        txAmountInput.value = tx.amount;
        txCategorySelect.value = tx.category;
        txDateInput.value = tx.date;
        txPaymentSelect.value = tx.paymentMethod;
        txNotesInput.value = tx.notes || '';

        formSectionTitle.textContent = 'Edit Transaction';
        btnCancelEdit.classList.remove('hidden');
        formErrorBanner.classList.add('hidden');

        switchTab('add-transaction');
    }

    // Delete Transaction Confirmation & Execution
    function promptDeleteTransaction(id) {
        const tx = transactions.find(t => t.id === id);
        if (!tx) return;

        pendingDeleteId = id;
        deleteTxDetails.textContent = `"${tx.title}" - ${formatCurrency(tx.amount)} (${tx.category}) on ${formatDateDisplay(tx.date)}`;
        modalDelete.classList.remove('hidden');
    }

    function confirmDeleteTransaction() {
        if (!pendingDeleteId) return;

        transactions = transactions.filter(t => t.id !== pendingDeleteId);
        saveTransactionsToStorage();
        pendingDeleteId = null;
        modalDelete.classList.add('hidden');

        renderAllViews();
        showToast('Transaction deleted successfully', 'info');
    }

    // Budget Update Form Handler
    budgetSettingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = parseFloat(inputMonthlyBudget.value);
        if (isNaN(val) || val < 0) {
            showToast('Please enter a valid budget amount', 'danger');
            return;
        }

        monthlyBudget = val;
        saveBudgetToStorage();
        renderAllViews();
        showToast('Monthly budget updated successfully!', 'success');
    });

    // Reset All Data Handler
    function confirmResetAllData() {
        localStorage.removeItem(STORAGE_KEY_TRANSACTIONS);
        localStorage.removeItem(STORAGE_KEY_BUDGET);
        
        transactions = [];
        monthlyBudget = 5000;

        saveBudgetToStorage();
        saveTransactionsToStorage();

        modalReset.classList.add('hidden');
        resetFormState();
        renderAllViews();

        showToast('All transaction data and budget settings have been reset.', 'info');
    }

    // Export CSV Feature
    function exportTransactionsToCSV() {
        if (transactions.length === 0) {
            showToast('No transactions available to export.', 'danger');
            return;
        }

        const headers = ['ID', 'Date', 'Type', 'Name', 'Category', 'Payment Method', 'Amount (INR)', 'Notes'];
        const csvRows = [headers.join(',')];

        transactions.forEach(tx => {
            const row = [
                `"${tx.id}"`,
                `"${tx.date}"`,
                `"${tx.type}"`,
                `"${tx.title.replace(/"/g, '""')}"`,
                `"${tx.category}"`,
                `"${tx.paymentMethod}"`,
                tx.amount,
                `"${(tx.notes || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `SpendWise_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('CSV export downloaded successfully!', 'success');
    }

    // ==========================================
    // 9. EVENT LISTENERS
    // ==========================================
    function attachEventListeners() {
        // Theme Toggle
        themeToggleBtn.addEventListener('click', toggleTheme);

        // Quick Add Button
        btnQuickAdd.addEventListener('click', () => {
            resetFormState();
            switchTab('add-transaction');
        });

        // Tab Switching
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                switchTab(target);
            });
        });

        // Delegate switch-tab links
        document.addEventListener('click', (e) => {
            if (e.target.closest('.switch-tab')) {
                const btn = e.target.closest('.switch-tab');
                const target = btn.getAttribute('data-target');
                if (target) switchTab(target);
            }
        });

        // Form Cancel Edit & Reset
        btnCancelEdit.addEventListener('click', resetFormState);
        btnResetForm.addEventListener('click', resetFormState);

        // Inline Edit Budget Button
        btnEditBudgetInline.addEventListener('click', () => {
            switchTab('budget');
            inputMonthlyBudget.focus();
        });

        // Filter Inputs
        searchTxName.addEventListener('input', renderTransactionHistoryTable);
        filterCategory.addEventListener('change', renderTransactionHistoryTable);
        filterType.addEventListener('change', renderTransactionHistoryTable);
        filterDate.addEventListener('change', renderTransactionHistoryTable);

        btnClearFilters.addEventListener('click', () => {
            searchTxName.value = '';
            filterCategory.value = 'All';
            filterType.value = 'All';
            filterDate.value = '';
            renderTransactionHistoryTable();
        });

        // Event Delegation for Table Action Buttons (Edit / Delete)
        transactionTableBody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit-tx');
            const deleteBtn = e.target.closest('.btn-delete-tx');

            if (editBtn) {
                const id = editBtn.getAttribute('data-id');
                startEditTransaction(id);
            } else if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                promptDeleteTransaction(id);
            }
        });

        // Modal Action Listeners
        btnConfirmDelete.addEventListener('click', confirmDeleteTransaction);
        btnResetData.addEventListener('click', () => modalReset.classList.remove('hidden'));
        btnConfirmReset.addEventListener('click', confirmResetAllData);
        btnExportCsv.addEventListener('click', exportTransactionsToCSV);

        // Modal Close Buttons
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                modalDelete.classList.add('hidden');
                modalReset.classList.add('hidden');
            });
        });

        // Close modal on background click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                modalDelete.classList.add('hidden');
                modalReset.classList.add('hidden');
            }
        });
    }

    // ==========================================
    // 10. UTILITY & HELPER FUNCTIONS
    // ==========================================
    function formatCurrency(amount) {
        const numeric = parseFloat(amount) || 0;
        return '₹' + numeric.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0
        });
    }

    function formatDateDisplay(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            return d.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
        return dateStr;
    }

    function getCurrentMonthKey() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    function getFormattedCurrentDate(offsetDays = 0) {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconSvg = '';
        if (type === 'success') {
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--income-color)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (type === 'danger') {
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--expense-color)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        } else {
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="8"></line></svg>`;
        }

        toast.innerHTML = `${iconSvg}<span>${escapeHTML(message)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
});
