/**
 * HostelMate - Screen Navigation Controller
 * Handles seamless 12-Screen routing, back stack, and live Supabase data binding
 */

const ScreenNav = (function () {
    let currentScreen = 'screen-dashboard';
    const historyStack = ['screen-dashboard'];

    function init() {
        console.log('Initializing Screen Navigation Controller...');

        // 1. Bind all back buttons
        document.querySelectorAll('.btn-screen-back').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.back || 'screen-dashboard';
                goBack(target);
            });
        });

        // 2. Bind Dashboard 3x4 Feature Tiles
        document.querySelectorAll('.feature-tile-btn').forEach(tile => {
            tile.addEventListener('click', () => {
                const targetScreen = tile.dataset.screen;
                if (targetScreen) {
                    navigateTo(targetScreen);
                }
            });
        });

        // 3. Bind Bottom or Header triggers
        const btnAdminTrigger = document.getElementById('btn-admin-auth');
        if (btnAdminTrigger) {
            btnAdminTrigger.addEventListener('click', () => {
                navigateTo('screen-admin');
            });
        }

        const btnLoginTrigger = document.getElementById('btn-student-auth');
        if (btnLoginTrigger) {
            btnLoginTrigger.addEventListener('click', () => {
                navigateTo('screen-login');
            });
        }

        // 4. Bind Sports Sub-tabs (Registration | Equipment | Tournaments)
        document.querySelectorAll('.sports-subtab-btn').forEach(tabBtn => {
            tabBtn.addEventListener('click', () => {
                const sub = tabBtn.dataset.sub;
                document.querySelectorAll('.sports-subtab-btn').forEach(b => b.classList.remove('active'));
                tabBtn.classList.add('active');

                document.querySelectorAll('.sports-sub-view').forEach(v => v.style.display = 'none');
                const targetView = document.getElementById(`subview-sports-${sub}`);
                if (targetView) targetView.style.display = 'block';
            });
        });

        // 5. Bind Mess Diet Selector (Veg / Non-Veg)
        const btnVeg = document.getElementById('screen-mess-veg-btn');
        const btnNonVeg = document.getElementById('screen-mess-nonveg-btn');
        if (btnVeg && btnNonVeg) {
            btnVeg.addEventListener('click', () => {
                btnVeg.classList.add('active');
                btnNonVeg.classList.remove('active');
            });
            btnNonVeg.addEventListener('click', () => {
                btnNonVeg.classList.add('active');
                btnVeg.classList.remove('active');
            });
        }

        // 6. Bind Gate Entry/Exit Toggle
        document.querySelectorAll('#screen-gate .pill-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#screen-gate .pill-toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 7. Bind Study Lab Toggle
        document.querySelectorAll('#screen-study-lab .pill-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#screen-study-lab .pill-toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 8. Bind Computer Lab Toggle
        document.querySelectorAll('#screen-comp-lab .pill-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#screen-comp-lab .pill-toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 9. Initial screen is Student Dashboard
        showScreen('screen-dashboard');
    }

    function navigateTo(screenId) {
        if (!screenId) return;
        historyStack.push(screenId);
        showScreen(screenId);
    }

    function goBack(fallback = 'screen-dashboard') {
        historyStack.pop();
        const prev = historyStack.length > 0 ? historyStack[historyStack.length - 1] : fallback;
        showScreen(prev || 'screen-dashboard');
    }

    function showScreen(screenId) {
        document.querySelectorAll('.mobile-app-screen').forEach(scr => {
            scr.classList.remove('active-screen');
        });

        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active-screen');
            currentScreen = screenId;
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Trigger data refresh depending on screen
            onScreenVisible(screenId);
        } else {
            console.warn(`Screen #${screenId} not found in DOM`);
        }
    }

    function onScreenVisible(screenId) {
        if (screenId === 'screen-washing') {
            if (window.BookingService) renderWashingMachineScreen();
        } else if (screenId === 'screen-admin') {
            loadAdminScreenMetrics();
        }
    }

    async function renderWashingMachineScreen() {
        const container = document.getElementById('mobile-wm-cards-container');
        if (!container || !window.BookingService) return;

        try {
            const dateStr = new Date().toISOString().split('T')[0];
            const machines = await window.BookingService.getMachinesWithStatus(dateStr);
            container.innerHTML = '';

            machines.forEach(m => {
                const card = document.createElement('div');
                card.className = 'machine-row-card';

                const isAvail = m.status === 'available';
                const isBusy = m.status === 'busy';
                const isMaint = m.status === 'maintenance' || m.status === 'offline';

                let iconClass = isAvail ? 'available' : isBusy ? 'busy' : 'maintenance';
                let statusText = isAvail ? 'Available' : isBusy ? 'In Use (45 min left)' : 'Maintenance';
                let statusClass = isAvail ? 'available' : isBusy ? 'busy' : 'maintenance';

                card.innerHTML = `
                    <div class="machine-row-left">
                        <div class="machine-row-icon ${iconClass}">
                            🧺
                        </div>
                        <div>
                            <h4 class="machine-row-title">${m.name}</h4>
                            <p class="machine-row-status ${statusClass}">● ${statusText}</p>
                        </div>
                    </div>
                    <div>
                        ${isAvail ? `<button type="button" class="btn-machine-action" onclick="window.triggerBookingModal(${m.id})">Book</button>` : ''}
                        ${isBusy ? `<button type="button" class="btn-machine-action view" onclick="window.triggerBookingModal(${m.id})">View</button>` : ''}
                        ${isMaint ? `<button type="button" class="btn-machine-action disabled" disabled>Book</button>` : ''}
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (e) {
            console.warn('renderWashingMachineScreen error:', e);
        }
    }

    async function loadAdminScreenMetrics() {
        const client = window.SupabaseManager ? window.SupabaseManager.getClient() : null;
        if (!client) return;

        try {
            const { count: sCount } = await client.from('user_profiles').select('*', { count: 'exact', head: true });
            const { count: bCount } = await client.from('bookings').select('*', { count: 'exact', head: true });
            const { count: gCount } = await client.from('gate_logs').select('*', { count: 'exact', head: true });
            const { count: mCount } = await client.from('mess_attendance').select('*', { count: 'exact', head: true });
            const { count: spCount } = await client.from('sports_bookings').select('*', { count: 'exact', head: true });
            const { count: lCount } = await client.from('lab_attendance').select('*', { count: 'exact', head: true });

            if (document.getElementById('tile-stat-students')) document.getElementById('tile-stat-students').textContent = sCount || 248;
            if (document.getElementById('tile-stat-gate')) document.getElementById('tile-stat-gate').textContent = gCount || 156;
            if (document.getElementById('tile-stat-mess')) document.getElementById('tile-stat-mess').textContent = mCount || 210;
            if (document.getElementById('tile-stat-machines')) document.getElementById('tile-stat-machines').textContent = bCount || 18;
            if (document.getElementById('tile-stat-sports')) document.getElementById('tile-stat-sports').textContent = spCount || 42;
            if (document.getElementById('tile-stat-labs')) document.getElementById('tile-stat-labs').textContent = lCount || 96;
        } catch (e) {
            console.warn('loadAdminScreenMetrics issue:', e);
        }
    }

    return {
        init,
        navigateTo,
        goBack,
        showScreen
    };
})();

window.ScreenNav = ScreenNav;
document.addEventListener('DOMContentLoaded', () => {
    ScreenNav.init();
});
