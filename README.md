# HostelMate — Integrated Hostel Management System & Washing Machine Portal

A production-ready, full-stack Hostel Management System and Shared Laundry Slot Booking Portal built for mobile, tablet, and desktop web as well as an installable Android App (APK via Capacitor).

Powered by **Supabase PostgreSQL** with strict database constraints, Row Level Security (RLS), Role-Based Access Control (RBAC), and server-side **GPS Geofence Physical Presence Verification**.

---

## 🌟 Key Modules & Features

### 1. 🧺 Washing Machine Laundry Wing (Preserved 100%)
- **4 Heavy-Duty Machines (All 9.0 Kg Capacity)** connected to a single PostgreSQL database.
- **Strict 75-Minute Slot Duration**: Enforced by database constraints.
- **7-Day Rolling Booking Window**: Today + next 6 days.
- **Server-Side Double Booking Prevention**: PostgreSQL `btree_gist` exclusion constraints.
- **Physical QR Code Stickers**: 4 unique stickers pasteable on machines with automatic machine deep-linking (`?machine=X`).
- **Save Pass to Phone Gallery**: Students can download high-resolution digital laundry passes directly to their device gallery.
- **Operating Schedule**:
  - Monday to Thursday: 06:30 AM to 12:00 AM Midnight (14 slots).
  - Friday, Saturday & Sunday: 05:00 AM to 02:00 AM next day (17 slots).

### 2. 📍 Hostel Geofence Location Restriction (Mandatory)
- **Admin-Configurable Coordinates & Radius**: Set hostel latitude, longitude, and radius (default 100 meters).
- **Server-Side Physical Verification**: High-accuracy device GPS coordinates are verified via PostgreSQL Haversine RPC function `verify_hostel_location`.
- **Anti-Spoofing & Rejection**: If outside the hostel area or GPS accuracy is too poor (> 250m), protected actions are strictly rejected with:
  *"You are outside the hostel area. Hostel facilities are unavailable."*
- **Scope**: Protects Gate scans, Mess attendance, Morning attendance, Sports booking, and Lab check-ins. Emergency directory and login remain accessible anywhere.

### 3. 🚪 Hostel Entry and Exit Gate Management
- **Digital Resident ID Pass**: Shows student name, roll number, room number, hostel block, and verified QR code.
- **Gate Entry / Exit Buttons**: One-tap recording of returning to or leaving the campus.
- **Anti-Replay & Duplicate Protection**: Server rejects duplicate scans within 2 minutes for the same roll number.
- **Security & Warden Feed**: Real-time log of student entry and exit events with GPS distance and timestamps.

### 4. 🍽️ Mess Management & Kitchen Headcount
- **Weekly Meal Menu**: Monday through Sunday menus with breakfast, lunch, and dinner.
- **Special Feast Days**: Wednesday & Sunday (e.g. Chicken Curry / Shahi Paneer & Gulab Jamun, Sunday Grand Feast).
- **Daily Diet Selection**: Students choose Veg, Non-Veg, or Skip before admin-configured cutoff deadlines (11:00 AM for lunch, 06:00 PM for dinner).
- **Mess QR Attendance**: QR verification at the mess counter preventing double attendance for the same meal.
- **Kitchen Headcount Dashboard**: Real-time counter of total Veg vs Non-Veg meals to prevent food wastage.

### 5. 🏸 Sports Management & Equipment Desk
- **Facilities**: Cricket Ground, Indoor Badminton Court, Volleyball Court, Kabaddi Sand Bay, and Table Tennis Room.
- **Court/Ground Slot Booking**: Choose date, players count, time window, and team name with conflict detection.
- **Sports Equipment Desk**: Track availability and loans of bats, balls, rackets, and nets.

### 6. 🔬 Laboratory Management
- **Facilities**: Computer Center & Programming Lab, Electronics & IoT Innovation Lab, Applied Science Research Lab.
- **Lab Check-In**: Record student attendance with purpose of visit.
- **Lab Breakdown / Issue Reporting**: Direct fault reporting for PCs, Wi-Fi, or equipment to lab assistants.

### 7. 🌅 Morning Attendance & Wake-Up Alarm Reminders
- **Mandatory Morning Attendance**: Daily check-in window (06:00 AM - 08:30 AM) verified by hostel GPS geofence.
- **Status Classification**: Automatic categorization as *On Time* or *Late*.
- **Student Wake-Up Reminder**: Customizable morning alarm with audio chime and notifications.

### 8. 📝 Leave Applications & Maintenance Complaints
- **Leave Applications**: Students apply for leave (dates, reason, destination, parent phone) with Warden review and approval/rejection.
- **Maintenance Complaints Desk**: Report Water, Electricity, Wi-Fi, Cleanliness, Furniture, or Plumbing issues with real-time status tracking (Pending, In Progress, Resolved).
- **24x7 Emergency Directory**: Quick-dial call buttons for Warden, Rector, Security Main Gate, and Medical Officer.

### 9. 🛡️ Role-Based Access Control (RBAC)
- Supported roles: `student`, `warden`, `admin`, `security`, `mess_staff`, `lab_staff`.
- Restrictive Row Level Security (RLS) policies on all tables.
- Students cannot modify administrative settings, change other students' data, or alter geofence boundaries.

---

## 📁 Project Structure

```text
├── index.html                   # Primary application interface (all modules + modals)
├── style.css                    # Unified design system & responsive styling
├── script.js                    # Primary client controller & UI orchestration
├── manifest.json                # PWA manifest for mobile installation
├── sw.js                        # Service Worker for offline caching & PWA
├── capacitor.config.json        # Capacitor Android native configuration
├── android/                     # Complete native Android Gradle project
│   ├── app/src/main/
│   │   ├── AndroidManifest.xml  # Permissions (GPS, Camera, Internet, Vibrate)
│   │   └── res/values/strings.xml
│   └── gradlew.bat              # Gradle wrapper executable
├── js/
│   ├── config.js                # Client credentials & app defaults
│   ├── supabaseClient.js        # Supabase JS v2 client & Realtime channels
│   ├── locationService.js       # GPS coordinates & server-side geofence verification
│   ├── authService.js           # Student & Staff Supabase Auth & RBAC
│   ├── bookingService.js        # 75-min laundry slots & schedule logic
│   ├── hostelService.js         # Gate, Mess, Sports, Labs, Leave & Complaints
│   ├── adminService.js          # Admin Auth, machine status, & PDF reports
│   └── qrService.js             # QR stickers & camera scanning handler
├── scripts/
│   ├── build_dist.js            # Bundle builder for web & Capacitor
│   ├── deploy_hostel_upgrade_schema.js # Complete PostgreSQL migration
│   ├── test_hostel_upgrade_backend.js  # Geofence & module RPC tests
│   ├── test_security_boundaries.js     # 12 security boundary tests
│   └── test_schedule_and_slot_management.js # Schedule & slot tests
├── .github/workflows/
│   └── build-apk.yml            # Automated GitHub Actions Android APK Builder
└── package.json                 # Dependencies & Capacitor 5 configuration
```

---

## 🚀 Website Deployment Instructions (GitHub Pages)

1. Push the code to the `main` branch of your GitHub repository:
   ```bash
   git push origin main
   ```
2. In GitHub, navigate to **Settings > Pages**.
3. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: `main` / `(root)`
4. Click **Save**. Within 1–2 minutes, GitHub Pages deploys the live portal at:
   `https://<username>.github.io/<repo-name>/`

---

## 📱 Android APK Build Instructions

### Option 1: Automated GitHub Actions (No local Android Studio needed)
1. Push to GitHub.
2. Go to the **Actions** tab in your repository.
3. Select **Build Android APK** and click **Run workflow**.
4. Once completed, download the installable `app-debug.apk` directly from the **Artifacts** section!

### Option 2: Build Locally using Android Studio
1. Install [Android Studio](https://developer.android.com/studio) and JDK 17+.
2. Prepare the web assets:
   ```bash
   node scripts/build_dist.js
   npx cap sync android
   ```
3. Open Android Studio:
   ```bash
   npx cap open android
   ```
   Or open the `android/` directory directly inside Android Studio.
4. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. Your APK will be generated at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

### Option 3: Command-Line Build (via Gradle)
If you have JDK and Android SDK installed on your system:
```bash
node scripts/build_dist.js
npx cap sync android
cd android
./gradlew assembleDebug
```

---

## 🧪 Automated Test Verification

Run all test suites locally:
```bash
# 1. Geofence & Module Operations Backend Tests (9 tests)
node scripts/test_hostel_upgrade_backend.js

# 2. Security Boundaries & RLS Tests (12 tests)
node scripts/test_security_boundaries.js

# 3. Schedule & Slot Management Tests (9 tests)
node scripts/test_schedule_and_slot_management.js
```

All 30 backend and security tests pass with 100% precision.
