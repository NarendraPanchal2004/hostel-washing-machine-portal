# Hostel Washing Machine Slot Booking Portal

A production-ready, real-time shared laundry slot booking web application built with modern Web Standards (HTML5, CSS3, Vanilla ES6+ JavaScript) and powered by **Supabase PostgreSQL** with strict database constraints, Row Level Security (RLS), and Admin Authentication.

---

## 🌟 Key Features

1. **4 Washing Machines on One Shared Database**:
   - Machine 1: Front Load Alpha (8.0 Kg, Inverter Direct Drive)
   - Machine 2: Top Load Turbo Beta (7.5 Kg, Pulsator)
   - Machine 3: Eco Inverter Gamma (8.5 Kg, VarioDrum)
   - Machine 4: Heavy Duty Pro Delta (9.0 Kg, Steam Care)
2. **Strict 75-Minute Slot Duration**:
   - Every booking slot is exactly 75 minutes.
   - Enforced by PostgreSQL check constraints (`CHECK (end_time = start_time + INTERVAL '75 minutes')`) and server-side RPC logic.
3. **7-Day Rolling Booking Window**:
   - Students can book slots for **Today and the next 6 days** (7 rolling days total).
   - Past dates and dates beyond 6 days are rejected both client-side and server-side.
4. **PostgreSQL Double-Booking Prevention**:
   - Uses PostgreSQL's `btree_gist` extension and an **EXCLUSION constraint**:
     ```sql
     CONSTRAINT prevent_overlapping_machine_bookings 
     EXCLUDE USING gist (
         machine_id WITH =,
         tstzrange(start_time, end_time) WITH &&
     ) WHERE (status != 'cancelled');
     ```
   - Even with simultaneous concurrent booking attempts, PostgreSQL enforces transactional serialization, rejecting double-bookings at the database kernel level with error code `23P01`.
5. **Secure Admin Authentication**:
   - Authenticated via Supabase Auth (Email & Password).
   - Only authenticated admins can change machine operational status (`available`, `in_use`, `maintenance`, `offline`), manage/cancel bookings, upload washing mode guidance photos, and download date-wise PDF reports.
6. **Student Privacy Protection (RLS)**:
   - Students only see slot times and whether a slot is booked or free.
   - Personal student details (mobile phone number, email, and roll number) are strictly obfuscated and inaccessible to other students.
7. **4 Unique Machine QR Codes**:
   - Built-in high-resolution QR generator for Machines 1, 2, 3, and 4.
   - URL encoding with pre-selected machine parameter (e.g. `?machine=2`). When scanned from any smartphone camera, the site opens directly with that machine pre-selected.
   - Printable poster modal ready for physical placement in the hostel laundry room.
8. **Real-Time Live Sync on All Mobile Devices**:
   - Subscribed to Supabase Realtime replication channels.
   - When any student books or admin toggles machine status, all connected phones update live without refreshing.
   - Includes live countdown timers for running 75-minute wash cycles (e.g., "Active: 42m remaining").
9. **Date-Wise PDF Audit Reports**:
   - Admins can select any date and download an official laundry facility audit report with KPI utilization metrics, slot schedules, and student logs using `jsPDF` and `jspdf-autotable`.

---

## 📁 Project Structure

```text
├── index.html                   # Primary application interface
├── style.css                    # Design system (light/dark themes, responsive layout)
├── script.js                    # Application controller & UI orchestration
├── js/
│   ├── config.js                # Secure client-side credentials manager
│   ├── supabaseClient.js        # Supabase JS v2 connection & Realtime subscriptions
│   ├── bookingService.js        # 75-min slot calculations, overlap logic, & booking
│   ├── adminService.js          # Admin Auth, status toggles, photo uploads, & PDF export
│   └── qrService.js             # QR code generator & URL parameter scanner
├── supabase/
│   ├── full_setup.sql           # Complete all-in-one SQL setup script
│   ├── 01_schema.sql            # Table schema, btree_gist exclusion, & RLS policies
│   ├── 02_functions.sql         # Server-side atomic booking RPC procedure
│   ├── 03_storage.sql           # Storage bucket 'machine-guides' configuration
│   └── 04_seed.sql              # Initial 4 washing machine records
├── test/
│   ├── test_booking_logic.js    # Unit tests for duration, rolling window, & overlap
│   └── test_supabase_live.js    # Live Supabase integration & double-booking test
├── .env.example                 # Environment variable template
├── .gitignore                   # Ignores .env and node_modules
└── package.json                 # Project dependencies and test scripts
```

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New Project**.
3. Choose your organization, name the project (e.g. `hostel-washing-machine`), select a strong database password, and choose your nearest region.
4. Click **Create new project** and wait ~2 minutes for provisioning.

---

### Step 2: Run the Database Schema & Functions

1. In your Supabase Dashboard, open the **SQL Editor** from the left navigation menu.
2. Click **+ New Query**.
3. Open [`supabase/full_setup.sql`](supabase/full_setup.sql) from this repository, copy its entire contents, and paste it into the Supabase SQL editor.
4. Click **Run** (or press `Ctrl + Enter`).
5. You should see a success message (`Success. No rows returned`). This automatically:
   - Enables `uuid-ossp` and `btree_gist` extensions.
   - Creates the `machines` table and seeds all 4 washing machines.
   - Creates the `bookings` table with the `prevent_overlapping_machine_bookings` exclusion constraint and 75-minute duration check.
   - Sets up Row Level Security (RLS) policies protecting student privacy.
   - Creates the atomic server-side booking procedure `book_washing_machine`.
   - Enables Realtime replication on `machines` and `bookings`.

---

### Step 3: Setup Storage Bucket for Washing Mode Photos

1. In your Supabase Dashboard, navigate to **Storage**.
2. Click **New Bucket**.
3. Name the bucket: `machine-guides`.
4. Toggle **Public bucket** to **ON** (allows students to view washing mode guide photos).
5. Click **Save**.
6. In **SQL Editor**, run [`supabase/03_storage.sql`](supabase/03_storage.sql) to apply the RLS policy ensuring only authenticated admins can upload/delete guide photos.

---

### Step 4: Create an Admin Account

1. In your Supabase Dashboard, navigate to **Authentication > Users**.
2. Click **Add user > Create user**.
3. Enter your admin email (e.g. `admin@hostel.edu`) and a strong password.
4. Toggle **Auto Confirm User?** to **ON**.
5. Click **Create user**.
6. (Optional) In **SQL Editor**, register this user into `admin_profiles`:
   ```sql
   INSERT INTO public.admin_profiles (email, full_name)
   VALUES ('admin@hostel.edu', 'Hostel Warden / Laundry Manager');
   ```

---

### Step 5: Configure Environment Variables & App Credentials

#### Option A: In-App UI Configuration (Easiest)
1. Open the application in your browser.
2. Click the **"Setup Supabase (Click)"** button in the top navigation header.
3. Paste your **Project URL** and **Anon Key** (found in Supabase Dashboard > **Project Settings > API**).
4. Click **Test Connection** to verify database connectivity.
5. Click **Save & Connect**. The app will reload and show **"Live Cloud Sync"** with a green pulsing indicator!

#### Option B: Using `.env` file (For local development and automated testing)
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env      # Linux/macOS
   copy .env.example .env    # Windows PowerShell/CMD
   ```
2. Open `.env` and fill in your Supabase project keys:
   ```ini
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## 🧪 Testing the Application & Double-Booking Prevention

### 1. Run Automated Booking Logic Unit Tests
Execute the test suite to verify 75-minute slot calculations, rolling 7-day limits, and overlap detection algorithms:
```bash
npm test
```
**Expected Output:**
```text
=================================================================
RUNNING HOSTEL WASHING MACHINE BOOKING LOGIC TESTS
=================================================================
✓ PASS: Should validate exact 75-minute duration
✓ PASS: Should allow bookings for today and next 6 days (7 rolling days)
✓ PASS: Should detect double-booking overlap on the same machine
✓ PASS: Should allow back-to-back adjacent bookings without collision
✓ PASS: Should allow different washing machines to be booked at the exact same time
✓ PASS: Should allow booking a slot if previous booking was cancelled
=================================================================
TEST RESULTS: 6 / 6 Passed (100%)
=================================================================
```

### 2. Run Live Supabase Integration Test
After populating `.env` with your Supabase credentials, run:
```bash
npm run test:live
```
This test script connects directly to your live Supabase database and:
- Confirms all 4 machines are connected.
- Creates a 75-minute booking for Machine 1.
- Immediately attempts to create a conflicting overlapping booking for Machine 1 with Student B.
- **Verifies that PostgreSQL actively throws an exclusion violation** (`23P01`), proving double-booking is impossible.
- Verifies RLS policies prevent unauthorized student data exposure.
- Cleans up the test booking record.

### 3. Manual Browser Concurrency Test
1. Open the application in two separate browser windows (or on two phones).
2. On both screens, select the same machine (e.g., Machine 1) and the same date.
3. Select the same 75-minute slot (e.g., `09:00 AM - 10:15 AM`).
4. Click "Confirm Booking" on Window A.
5. Notice that Window B's slot immediately turns gray/red ("BOOKED") in real time.
6. If Window B clicks "Confirm Booking" simultaneously, PostgreSQL rejects the second booking with:
   > *SLOT CONFLICT: This machine has already been booked by another student for an overlapping 75-minute period.*

---

## 🖥️ Running Locally

Start the local server using Python or Node:

```bash
# Using Python
python -m http.server 3000

# Or using Node serve
npm run serve
```

Open your browser at `http://localhost:3000`.

---

## 🌐 Deployment Guide

### Deploying to Vercel
1. Install Vercel CLI: `npm i -g vercel` or link via GitHub.
2. Run `vercel`.
3. In Vercel Project Settings > **Environment Variables**, add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Deploy!

### Deploying to Netlify
1. Drag and drop the project folder into [Netlify Drop](https://app.netlify.com/drop) or connect your Git repository.
2. Under **Site Settings > Environment Variables**, add `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

### Deploying to GitHub Pages
1. Push this repository to GitHub.
2. Go to **Settings > Pages > Branch: main / root**.
3. Open the published site and click the **"Setup Supabase"** pill in the header to enter your credentials securely.

---

## 📄 License
ISC License. Built for University & College Hostel Laundry Facility Management.
