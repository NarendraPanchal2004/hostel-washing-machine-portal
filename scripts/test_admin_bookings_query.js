const fetch = globalThis.fetch || require('node-fetch');
const SUPABASE_URL = 'https://zhurgvwsaawacmukbvbi.supabase.co';
const ANON_KEY = 'sb_publishable_w1Y0JZdQfxdaEkZDL3Af2g_88t8IgGj';

async function testExactAdminQuery() {
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'narendrapanchal8114@gmail.com',
            password: 'BVG@250'
        })
    });
    const loginData = await loginRes.json();
    console.log('Got access_token:', Boolean(loginData.access_token));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=id,machine_id,student_name,student_roll,student_phone,student_email,booking_date,start_time,end_time,status,reference_code,notes,created_at,machines(id,name,model)&order=start_time.desc`, {
        headers: {
            'apikey': ANON_KEY,
            'Authorization': 'Bearer ' + loginData.access_token
        }
    });
    const bookings = await res.json();
    console.log('Bookings returned count:', bookings.length);
    console.log('First booking:', JSON.stringify(bookings[0], null, 2));

    console.log('\nAll bookings summary:');
    bookings.forEach((b, i) => {
        console.log(`${i+1}. [${b.booking_date}] ${b.reference_code} | ${b.machines?.name} | ${b.student_name} (${b.student_roll}) | Phone: ${b.student_phone} | Status: ${b.status}`);
    });
}
testExactAdminQuery().catch(console.error);
