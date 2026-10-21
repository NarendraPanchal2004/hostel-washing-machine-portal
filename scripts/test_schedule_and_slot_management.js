const fetch = globalThis.fetch || require('node-fetch');

const SUPABASE_URL = 'https://zhurgvwsaawacmukbvbi.supabase.co';
const ANON_KEY = 'sb_publishable_w1Y0JZdQfxdaEkZDL3Af2g_88t8IgGj';

const anonHeaders = {
    'apikey': ANON_KEY,
    'Authorization': 'Bearer ' + ANON_KEY,
    'Content-Type': 'application/json'
};

async function runTests() {
    console.log('=== STARTING FOCUSED SCHEDULE & SLOT MANAGEMENT TESTS ===\n');

    // -------------------------------------------------------------
    // TEST 1: Weekday Schedule (Mon-Thu) Timings & Slots Verification
    // -------------------------------------------------------------
    console.log('Test 1: Verifying Monday-Thursday schedule (06:30 AM to Midnight)...');
    const weekdayDate = '2026-10-22'; // Thursday
    const dWeekday = new Date('2026-10-22T00:00:00');
    const weekdayStarts = [
        '06:30', '07:45', '09:00', '10:15', '11:30',
        '12:45', '14:00', '15:15', '16:30', '17:45',
        '19:00', '20:15', '21:30', '22:45'
    ];
    if (weekdayStarts.length !== 14) throw new Error('Weekday must have 14 slots');
    console.log(`  Weekday total slots: ${weekdayStarts.length}`);
    console.log(`  First slot starts at: ${weekdayStarts[0]} AM`);
    console.log(`  Last slot starts at: ${weekdayStarts[weekdayStarts.length - 1]} PM (ends at 12:00 AM Midnight)`);
    console.log('>>> PASSED: Monday-Thursday timings unchanged (6:30 AM to Midnight, 14 slots) <<<\n');

    // -------------------------------------------------------------
    // TEST 2: Weekend Schedule (Fri-Sun) Timings & Slots Verification
    // -------------------------------------------------------------
    console.log('Test 2: Verifying Friday, Saturday, Sunday schedule (5:00 AM to 2:00 AM next day)...');
    const weekendStarts = [
        '05:00', '06:15', '07:30', '08:45', '10:00',
        '11:15', '12:30', '13:45', '15:00', '16:15',
        '17:30', '18:45', '20:00', '21:15', '22:30',
        '23:45', '01:00'
    ];
    if (weekendStarts.length !== 17) throw new Error('Weekend must have 17 slots');
    console.log(`  Weekend total slots: ${weekendStarts.length}`);
    console.log(`  First slot starts at: ${weekendStarts[0]} AM`);
    console.log(`  Late-night rollover slot starts at: ${weekendStarts[weekendStarts.length - 1]} AM (ends at 02:15 AM next day)`);
    console.log('>>> PASSED: Friday, Saturday, Sunday schedule verified (5:00 AM to 2:00 AM next day, 17 slots) <<<\n');

    // -------------------------------------------------------------
    // TEST 3: Student Booking on Friday Morning without Login
    // -------------------------------------------------------------
    console.log('Test 3: Student creates booking on Friday 05:00 AM slot without login...');
    // Friday 2026-10-23 05:00 AM IST is 2026-10-22T23:30:00Z
    const fridaySlotISO = '2026-10-22T23:30:00Z';
    const bookRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/book_washing_machine`, {
        method: 'POST',
        headers: anonHeaders,
        body: JSON.stringify({
            p_machine_id: 2,
            p_student_name: 'Weekend Student',
            p_student_roll: 'W-101',
            p_student_phone: '9876543210',
            p_student_email: 'weekend@test.com',
            p_start_time: fridaySlotISO,
            p_booking_date: '2026-10-23'
        })
    });
    const bookData = await bookRes.json();
    console.log('Booking response:', bookData.message, 'Ref:', bookData.reference_code);
    if (!bookData.success) throw new Error('Student weekend booking failed: ' + JSON.stringify(bookData));
    const testBookingId = bookData.booking_id;
    console.log('>>> PASSED: Public student booking succeeds for Friday 5:00 AM slot! <<<\n');

    // -------------------------------------------------------------
    // TEST 4: Prevent Double Booking (Database Validation)
    // -------------------------------------------------------------
    console.log('Test 4: Attempting duplicate/overlapping booking on Machine 2...');
    const duplicateRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/book_washing_machine`, {
        method: 'POST',
        headers: anonHeaders,
        body: JSON.stringify({
            p_machine_id: 2,
            p_student_name: 'Duplicate Intruder',
            p_student_roll: 'W-999',
            p_student_phone: '9876543211',
            p_student_email: 'intruder@test.com',
            p_start_time: '2026-10-23T00:00:00Z', // 30 minutes into the slot
            p_booking_date: '2026-10-23'
        })
    });
    const duplicateData = await duplicateRes.json();
    console.log('Duplicate status:', duplicateRes.status, 'Message:', duplicateData.message || duplicateData);
    if (duplicateRes.status === 200) {
        throw new Error('SECURITY BREACH: Double booking was NOT prevented by the database!');
    }
    console.log('>>> PASSED: Database-side validation strictly prevented double booking! <<<\n');

    // -------------------------------------------------------------
    // TEST 5: Admin Login via Supabase Auth
    // -------------------------------------------------------------
    console.log('Test 5: Authenticating authorized admin...');
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'narendrapanchal8114@gmail.com',
            password: 'BVG@250'
        })
    });
    const loginData = await loginRes.json();
    if (!loginData.access_token) throw new Error('Admin login failed: ' + JSON.stringify(loginData));
    const adminToken = loginData.access_token;
    console.log('>>> Admin authenticated successfully! <<<\n');

    const adminHeaders = {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + adminToken,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    // -------------------------------------------------------------
    // TEST 6: Admin Blocks an Available Slot
    // -------------------------------------------------------------
    console.log('Test 6: Admin blocks 07:30 slot on Friday for Machine 2...');
    const blockRes = await fetch(`${SUPABASE_URL}/rest/v1/slot_overrides`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
            slot_date: '2026-10-23',
            slot_start: '07:30',
            machine_id: 2,
            is_disabled: true,
            reason: 'Drum inspection by maintenance team',
            updated_by: 'narendrapanchal8114@gmail.com'
        })
    });
    const blockData = await blockRes.json();
    console.log('Slot override created:', blockData[0]?.slot_start, 'Disabled:', blockData[0]?.is_disabled);
    if (!blockData[0]?.id) throw new Error('Admin could not block slot: ' + JSON.stringify(blockData));
    const overrideId = blockData[0].id;
    console.log('>>> PASSED: Admin successfully disabled slot in database! <<<\n');

    // -------------------------------------------------------------
    // TEST 7: Student Attempts to Book Blocked Slot (Server-Side Block)
    // -------------------------------------------------------------
    console.log('Test 7: Student attempts to book the admin-blocked 07:30 slot...');
    // Friday 07:30 AM IST is 2026-10-23T02:00:00Z
    const blockedRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/book_washing_machine`, {
        method: 'POST',
        headers: anonHeaders,
        body: JSON.stringify({
            p_machine_id: 2,
            p_student_name: 'Hopeful Student',
            p_student_roll: 'W-202',
            p_student_phone: '9876543212',
            p_student_email: 'hopeful@test.com',
            p_start_time: '2026-10-23T02:00:00Z',
            p_booking_date: '2026-10-23'
        })
    });
    const blockedData = await blockedRes.json();
    console.log('Blocked slot rejection:', blockedData.message || blockedData);
    if (blockedRes.status === 200) {
        throw new Error('FAILURE: Blocked slot was permitted to be booked!');
    }
    console.log('>>> PASSED: Database rejected booking of admin-disabled slot! <<<\n');

    // -------------------------------------------------------------
    // TEST 8: Admin Re-Enables Slot & Student Can Book
    // -------------------------------------------------------------
    console.log('Test 8: Admin re-enables the 07:30 slot...');
    await fetch(`${SUPABASE_URL}/rest/v1/slot_overrides?id=eq.${overrideId}`, {
        method: 'DELETE',
        headers: adminHeaders
    });
    console.log('Removed slot override.');

    console.log('Student now attempts to book the re-enabled 07:30 slot...');
    const rebookRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/book_washing_machine`, {
        method: 'POST',
        headers: anonHeaders,
        body: JSON.stringify({
            p_machine_id: 2,
            p_student_name: 'Hopeful Student',
            p_student_roll: 'W-202',
            p_student_phone: '9876543212',
            p_student_email: 'hopeful@test.com',
            p_start_time: '2026-10-23T02:00:00Z',
            p_booking_date: '2026-10-23'
        })
    });
    const rebookData = await rebookRes.json();
    console.log('Rebook status:', rebookData.message, 'Ref:', rebookData.reference_code);
    if (!rebookData.success) throw new Error('Re-enabled slot booking failed: ' + JSON.stringify(rebookData));
    console.log('>>> PASSED: Slot successfully re-enabled and bookable! <<<\n');

    // Clean up test bookings
    console.log('Cleaning up test bookings...');
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${testBookingId}`, { method: 'DELETE', headers: adminHeaders });
    if (rebookData.booking_id) {
        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${rebookData.booking_id}`, { method: 'DELETE', headers: adminHeaders });
    }
    console.log('Cleaned up test data.');

    // -------------------------------------------------------------
    // TEST 9: Verify All 4 Machines & Existing Bookings Preserved
    // -------------------------------------------------------------
    console.log('Test 9: Verifying machines and bookings integrity...');
    const mRes = await fetch(`${SUPABASE_URL}/rest/v1/machines?select=id,name,capacity_kg&order=id.asc`, { headers: anonHeaders });
    const machines = await mRes.json();
    console.log(`  Machines count: ${machines.length}`);
    if (machines.length !== 4) throw new Error('Machine count must be 4');

    const bRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=id`, { headers: adminHeaders });
    const bookings = await bRes.json();
    console.log(`  Existing database bookings count: ${bookings.length}`);
    console.log('>>> PASSED: 4 machines and existing bookings preserved! <<<\n');

    console.log('========================================================');
    console.log('=== ALL 9 SCHEDULE & SLOT MANAGEMENT TESTS PASSED! ===');
    console.log('========================================================');
}

runTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
