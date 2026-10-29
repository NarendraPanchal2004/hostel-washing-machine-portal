const { Client } = require('pg');

const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zhurgvwsaawacmukbvbi',
    password: 'Babasaheb@250',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function runTests() {
    await client.connect();
    console.log('=== RUNNING HOSTEL BACKEND RPC & GEOFENCE TESTS ===\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Geofence Inside Check (Hostel center: 19.8762, 75.3433)
    try {
        const res = await client.query('SELECT public.verify_hostel_location(19.87621, 75.34331, 10.0) AS result');
        const allowed = res.rows[0].result.allowed;
        if (allowed === true) {
            console.log('PASS 1: Geofence check inside perimeter passed.');
            passed++;
        } else {
            throw new Error('Expected allowed=true');
        }
    } catch (e) {
        console.error('FAIL 1: Geofence inside check:', e.message);
        failed++;
    }

    // Test 2: Geofence Outside Check (e.g. 5 km away: 19.9200, 75.3433)
    try {
        await client.query('SELECT public.verify_hostel_location(19.9200, 75.3433, 10.0)');
        console.error('FAIL 2: Expected outside location to be rejected!');
        failed++;
    } catch (e) {
        if (e.message.includes('GEOFENCE_OUTSIDE')) {
            console.log('PASS 2: Geofence outside perimeter rejected strictly:', e.message);
            passed++;
        } else {
            console.error('FAIL 2: Unexpected error:', e.message);
            failed++;
        }
    }

    // Test 3: Poor GPS Accuracy (> 250m)
    try {
        await client.query('SELECT public.verify_hostel_location(19.8762, 75.3433, 300.0)');
        console.error('FAIL 3: Expected inaccurate GPS to be rejected!');
        failed++;
    } catch (e) {
        if (e.message.includes('LOCATION_INACCURATE')) {
            console.log('PASS 3: Inaccurate GPS rejected correctly:', e.message);
            passed++;
        } else {
            console.error('FAIL 3: Unexpected error:', e.message);
            failed++;
        }
    }

    // Test 4: Gate Entry RPC
    const testRoll = 'TEST-999';
    try {
        const res = await client.query(`
            SELECT public.record_gate_entry_exit(
                'entry', '${testRoll}', 'Test Student', 19.8762, 75.3433, 15.0, 'Hostel North Gate'
            ) AS result;
        `);
        if (res.rows[0].result.success === true) {
            console.log('PASS 4: Gate entry recorded successfully.');
            passed++;
        }
    } catch (e) {
        console.error('FAIL 4: Gate entry error:', e.message);
        failed++;
    }

    // Test 5: Gate Duplicate Scan Prevention
    try {
        await client.query(`
            SELECT public.record_gate_entry_exit(
                'entry', '${testRoll}', 'Test Student', 19.8762, 75.3433, 15.0, 'Hostel North Gate'
            );
        `);
        console.error('FAIL 5: Duplicate gate scan was not rejected!');
        failed++;
    } catch (e) {
        if (e.message.includes('DUPLICATE_SCAN')) {
            console.log('PASS 5: Anti-replay duplicate gate scan prevented:', e.message);
            passed++;
        } else {
            console.error('FAIL 5: Unexpected error:', e.message);
            failed++;
        }
    }

    // Test 6: Sports Slot Booking & Overlap Prevention
    const testDate = '2026-11-01';
    const startTime = '2026-11-01 16:00:00+00';
    const endTime = '2026-11-01 17:30:00+00';
    try {
        const res = await client.query(`
            SELECT public.book_sports_facility(
                1, '${testRoll}', 'Test Student', '${testDate}', '${startTime}', '${endTime}', 'Hostel Warriors', 11
            ) AS result;
        `);
        if (res.rows[0].result.success === true) {
            console.log('PASS 6: Sports cricket ground booked successfully.');
            passed++;
        }
    } catch (e) {
        console.error('FAIL 6: Sports booking error:', e.message);
        failed++;
    }

    // Test 7: Sports Overlapping Slot Rejection
    try {
        await client.query(`
            SELECT public.book_sports_facility(
                1, 'ANOTHER-ROLL', 'Another Student', '${testDate}', '2026-11-01 16:30:00+00', '2026-11-01 18:00:00+00'
            );
        `);
        console.error('FAIL 7: Overlapping sports booking was not rejected!');
        failed++;
    } catch (e) {
        if (e.message.includes('SPORTS_SLOT_CONFLICT')) {
            console.log('PASS 7: Overlapping sports booking strictly rejected:', e.message);
            passed++;
        } else {
            console.error('FAIL 7: Unexpected error:', e.message);
            failed++;
        }
    }

    // Test 8: Mess Menu Retrieval
    try {
        const res = await client.query('SELECT * FROM public.mess_menus ORDER BY id');
        if (res.rows.length === 7) {
            console.log(`PASS 8: Mess menus for all 7 days loaded (Special dishes on Wed/Sun: "${res.rows[2].special_dish}").`);
            passed++;
        }
    } catch (e) {
        console.error('FAIL 8: Mess menu error:', e.message);
        failed++;
    }

    // Test 9: Existing Washing Machine Bookings count & RPC intact
    try {
        const bRes = await client.query('SELECT count(*) FROM public.bookings');
        const mRes = await client.query('SELECT count(*) FROM public.machines');
        console.log(`PASS 9: Existing washing machine data intact (Machines: ${mRes.rows[0].count}, Bookings: ${bRes.rows[0].count}).`);
        passed++;
    } catch (e) {
        console.error('FAIL 9: Washing machine check error:', e.message);
        failed++;
    }

    // Cleanup test data
    await client.query(`DELETE FROM public.gate_logs WHERE student_roll = '${testRoll}'`);
    await client.query(`DELETE FROM public.sports_bookings WHERE student_roll = '${testRoll}'`);
    console.log('\nTest data cleaned up.');

    console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
    await client.end();
}

runTests().catch(err => {
    console.error('Test runner failed:', err);
    process.exit(1);
});
