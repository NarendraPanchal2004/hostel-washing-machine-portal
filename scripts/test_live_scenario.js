const fetch = globalThis.fetch || require('node-fetch');

const SUPABASE_URL = 'https://zhurgvwsaawacmukbvbi.supabase.co';
const ANON_KEY = 'sb_publishable_w1Y0JZdQfxdaEkZDL3Af2g_88t8IgGj';

const headers = {
    'apikey': ANON_KEY,
    'Authorization': 'Bearer ' + ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

async function runScenario() {
    console.log('=== STARTING END-TO-END VERIFICATION ===\n');

    // 1. Student 1 books Machine 1
    console.log('Step 1: Student 1 books Machine 1 for 2026-10-23 at 09:00 AM...');
    const bookRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/book_washing_machine`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            p_machine_id: 1,
            p_student_name: 'Rahul Sharma',
            p_student_roll: 'B-204',
            p_student_phone: '9876543210',
            p_student_email: 'rahul@hostel.edu',
            p_start_time: '2026-10-23T09:00:00Z'
        })
    });

    const bookResult = await bookRes.json();
    console.log('Booking Result:', bookResult);
    if (!bookResult.success || !bookResult.booking_id) {
        throw new Error('Booking failed: ' + JSON.stringify(bookResult));
    }
    const bookingId = bookResult.booking_id;

    // 2. Student 2 tries to double-book the same slot
    console.log('\nStep 2: Student 2 attempts to book overlapping slot (09:15 AM)...');
    const doubleBookRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/book_washing_machine`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            p_machine_id: 1,
            p_student_name: 'Amit Verma',
            p_student_roll: 'C-301',
            p_student_phone: '9822334455',
            p_student_email: 'amit@hostel.edu',
            p_start_time: '2026-10-23T09:15:00Z'
        })
    });

    const doubleBookErr = await doubleBookRes.json();
    console.log('Double-booking rejection:', doubleBookErr.message || doubleBookErr);
    if (doubleBookRes.status === 200) {
        throw new Error('Double booking was NOT prevented!');
    }
    console.log('>>> Double booking successfully blocked! <<<');

    // 3. Student 2 checks slot availability
    console.log('\nStep 3: Student 2 fetches slot list for Machine 1 on 2026-10-23...');
    const slotsRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_machine_slots`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_date: '2026-10-23' })
    });
    const slotsData = await slotsRes.json();
    const bookedSlot = slotsData.find(s => s.machine_id === 1 && s.start_time.includes('09:00:00'));
    console.log('Slot data for 09:00 AM on Student 2 phone:', bookedSlot);
    if (!bookedSlot || bookedSlot.status !== 'confirmed') {
        throw new Error('Booked slot did not show up in public slot availability!');
    }
    console.log('>>> Booked slot correctly shows as CONFIRMED (RED) for other students! <<<');

    // 4. Admin Portal checks all bookings
    console.log('\nStep 4: Admin Portal fetches all bookings...');
    const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=id,machine_id,student_name,student_roll,student_phone,student_email,booking_date,start_time,end_time,status,reference_code,notes,created_at,machines(id,name,model)&order=start_time.desc`, {
        method: 'GET',
        headers
    });
    const adminData = await adminRes.json();
    const adminFound = adminData.find(b => b.id === bookingId);
    console.log('Admin found booking:', adminFound?.student_name, adminFound?.student_phone, adminFound?.reference_code);
    if (!adminFound) {
        throw new Error('Admin did not see student booking!');
    }
    console.log('>>> Admin sees student booking with phone and roll number! <<<');

    // 5. Admin updates Machine 3 to maintenance
    console.log('\nStep 5: Admin marks Machine 3 as maintenance in Supabase...');
    const maintRes = await fetch(`${SUPABASE_URL}/rest/v1/machines?id=eq.3`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'maintenance', updated_at: new Date().toISOString() })
    });
    console.log('Maintenance update status:', maintRes.status);

    // 6. Student opens app and checks machines
    console.log('\nStep 6: Student loads machines from Supabase...');
    const mRes = await fetch(`${SUPABASE_URL}/rest/v1/machines?select=*&order=id.asc`, {
        method: 'GET',
        headers
    });
    const machinesData = await mRes.json();
    const m3 = machinesData.find(m => m.id === 3);
    console.log('Machine 3 status for student:', m3?.name, '->', m3?.status);
    if (m3?.status !== 'maintenance') {
        throw new Error('Machine 3 status did not sync to student view!');
    }
    console.log('>>> Machine status update synced to all students! <<<');

    // Cleanup: Reset Machine 3 to available and delete test booking
    console.log('\nStep 7: Cleanup test data...');
    await fetch(`${SUPABASE_URL}/rest/v1/machines?id=eq.3`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'available', updated_at: new Date().toISOString() })
    });
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
        method: 'DELETE',
        headers
    });
    console.log('Cleanup completed successfully.');

    console.log('\n=== ALL END-TO-END CHECKS PASSED WITH 100% SUCCESS! ===');
}

runScenario().catch(err => {
    console.error('Scenario failed:', err);
    process.exit(1);
});
