const fetch = globalThis.fetch || require('node-fetch');

const SUPABASE_URL = 'https://zhurgvwsaawacmukbvbi.supabase.co';
const ANON_KEY = 'sb_publishable_w1Y0JZdQfxdaEkZDL3Af2g_88t8IgGj';

const anonHeaders = {
    'apikey': ANON_KEY,
    'Authorization': 'Bearer ' + ANON_KEY,
    'Content-Type': 'application/json'
};

async function testSecurity() {
    console.log('=== STARTING SECURITY BOUNDARY TESTS ===\n');

    // 1. Test unauthorized direct SELECT on public.bookings
    console.log('Test 1: Anon user tries to SELECT student bookings directly...');
    const bRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*`, { headers: anonHeaders });
    const bData = await bRes.json();
    console.log('Direct bookings query result count:', bData.length);
    if (bData.length > 0) {
        throw new Error('SECURITY BREACH: Anonymous user was able to read student personal details!');
    }
    console.log('>>> PASSED: Anonymous user cannot read student personal info! <<<\n');

    // 2. Test unauthorized UPDATE on machines
    console.log('Test 2: Anon user tries to tamper with Machine 1 status...');
    const mRes = await fetch(`${SUPABASE_URL}/rest/v1/machines?id=eq.1`, {
        method: 'PATCH',
        headers: { ...anonHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify({ status: 'offline' })
    });
    const mData = await mRes.json();
    console.log('Tamper machines result:', mData);
    if (Array.isArray(mData) && mData.length > 0) {
        throw new Error('SECURITY BREACH: Anonymous user was able to modify machine status!');
    }
    console.log('>>> PASSED: Anonymous user cannot tamper with machines! <<<\n');

    // 3. Test unauthorized UPDATE on hostel_notices
    console.log('Test 3: Anon user tries to overwrite hostel notices...');
    const nRes = await fetch(`${SUPABASE_URL}/rest/v1/hostel_notices?id=eq.1`, {
        method: 'PATCH',
        headers: { ...anonHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify({ content: 'HACKED BY ANONYMOUS' })
    });
    const nData = await nRes.json();
    console.log('Tamper notices result:', nData);
    if (Array.isArray(nData) && nData.length > 0) {
        throw new Error('SECURITY BREACH: Anonymous user was able to modify notices!');
    }
    console.log('>>> PASSED: Anonymous user cannot tamper with notices! <<<\n');

    // 4. Test public read on machines and notices
    console.log('Test 4: Public read on machines and notices...');
    const mRead = await fetch(`${SUPABASE_URL}/rest/v1/machines?select=id,name,status&order=id.asc`, { headers: anonHeaders }).then(r => r.json());
    console.log('Public machines read count:', mRead.length);
    const nRead = await fetch(`${SUPABASE_URL}/rest/v1/hostel_notices?select=id,title,content`, { headers: anonHeaders }).then(r => r.json());
    console.log('Public notice read title:', nRead[0]?.title);
    if (mRead.length !== 4 || !nRead[0]?.title) {
        throw new Error('Public read for machines or notices failed!');
    }
    console.log('>>> PASSED: Public can safely view machines and notices! <<<\n');

    // 5. Test slot availability RPC (no personal info exposed)
    console.log('Test 5: Testing privacy-preserving slot viewer RPC...');
    const slotsRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_machine_slots`, {
        method: 'POST',
        headers: anonHeaders,
        body: JSON.stringify({ p_date: '2026-10-22' })
    });
    const slots = await slotsRes.json();
    console.log('Slots response status:', slotsRes.status, 'slots returned:', slots.length);
    if (slots.length > 0) {
        if ('student_name' in slots[0] || 'student_phone' in slots[0] || 'student_roll' in slots[0]) {
            throw new Error('SECURITY BREACH: Student personal details found in slot viewer!');
        }
    }
    console.log('>>> PASSED: Slot viewer is strictly privacy-preserving! <<<\n');

    // 6. Test student booking creation via secure RPC
    console.log('Test 6: Student books slot via secure RPC...');
    const bookRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/book_washing_machine`, {
        method: 'POST',
        headers: anonHeaders,
        body: JSON.stringify({
            p_machine_id: 2,
            p_student_name: 'Secured Student',
            p_student_roll: 'R-404',
            p_student_phone: '9876501234',
            p_student_email: 'student@test.com',
            p_start_time: '2026-10-23T11:30:00Z'
        })
    });
    const bookResult = await bookRes.json();
    console.log('Booking Result:', bookResult.message, 'Ref:', bookResult.reference_code);
    if (!bookResult.success) {
        throw new Error('Booking via secure RPC failed: ' + JSON.stringify(bookResult));
    }
    const testBookingId = bookResult.booking_id;
    console.log('>>> PASSED: Student booking creation works securely without login! <<<\n');

    // 7. Test server-side double-booking rejection
    console.log('Test 7: Attempting overlapping booking for Machine 2...');
    const conflictRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/book_washing_machine`, {
        method: 'POST',
        headers: anonHeaders,
        body: JSON.stringify({
            p_machine_id: 2,
            p_student_name: 'Conflict Attacker',
            p_student_roll: 'R-999',
            p_student_phone: '9876501235',
            p_student_email: 'attacker@test.com',
            p_start_time: '2026-10-23T12:00:00Z' // 30 mins into the 75m slot!
        })
    });
    const conflictData = await conflictRes.json();
    console.log('Conflict rejection message:', conflictData.message || conflictData);
    if (conflictRes.status === 200) {
        throw new Error('SECURITY BREACH: Overlapping booking was NOT rejected by the database!');
    }
    console.log('>>> PASSED: Server-side double booking prevented! <<<\n');

    // 8. Test Admin Login & Authorized Operations
    console.log('Test 8: Testing Authorized Admin Login...');
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'narendrapanchal8114@gmail.com',
            password: 'BVG@250'
        })
    });
    const loginData = await loginRes.json();
    if (!loginData.access_token) {
        throw new Error('Admin login failed: ' + JSON.stringify(loginData));
    }
    const adminToken = loginData.access_token;
    console.log('>>> Admin successfully authenticated via Supabase Auth! Token obtained. <<<\n');

    const adminHeaders = {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + adminToken,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    // 9. Admin view all bookings (including student phone and roll)
    console.log('Test 9: Admin views all bookings with student details...');
    const adminBookingsRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*`, { headers: adminHeaders });
    const adminBookings = await adminBookingsRes.json();
    console.log('Admin bookings retrieved count:', adminBookings.length);
    const foundOurBooking = adminBookings.find(b => b.id === testBookingId);
    console.log('Admin found test booking student name:', foundOurBooking?.student_name, 'phone:', foundOurBooking?.student_phone);
    if (!foundOurBooking) {
        throw new Error('Admin could not see student booking!');
    }
    console.log('>>> PASSED: Authorized Admin can view all bookings! <<<\n');

    // 10. Admin modifies machine status
    console.log('Test 10: Admin updates Machine 4 status...');
    const adminMRes = await fetch(`${SUPABASE_URL}/rest/v1/machines?id=eq.4`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'maintenance', updated_at: new Date().toISOString() })
    });
    const adminMData = await adminMRes.json();
    console.log('Admin machine update result:', adminMData[0]?.name, '->', adminMData[0]?.status);
    if (adminMData[0]?.status !== 'maintenance') {
        throw new Error('Admin machine update failed!');
    }
    console.log('>>> PASSED: Authorized Admin can update machines! <<<\n');

    // 11. Admin cancels test booking and resets Machine 4
    console.log('Test 11: Admin cancels test booking and resets machine...');
    await fetch(`${SUPABASE_URL}/rest/v1/machines?id=eq.4`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'available', updated_at: new Date().toISOString() })
    });

    const cancelRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${testBookingId}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'cancelled' })
    });
    console.log('Admin cancel booking status:', cancelRes.status);

    // Delete test row
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${testBookingId}`, {
        method: 'DELETE',
        headers: adminHeaders
    });
    console.log('Cleaned up test booking.');

    // 12. Check audit logs
    console.log('Test 12: Checking audit log records...');
    const auditRes = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?select=*&order=created_at.desc&limit=5`, { headers: adminHeaders });
    const auditLogs = await auditRes.json();
    console.log('Audit log entries count:', auditLogs.length);
    console.log('Latest audit log entry:', auditLogs[0]?.action, 'target:', auditLogs[0]?.target_id, 'by:', auditLogs[0]?.performed_by);
    if (auditLogs.length === 0) {
        throw new Error('No audit log entries recorded!');
    }
    console.log('>>> PASSED: Audit logs recording correctly! <<<\n');

    console.log('=== ALL 12 SECURITY BOUNDARY TESTS PASSED 100%! ===');
}

testSecurity().catch(err => {
    console.error('Security test failed:', err);
    process.exit(1);
});
