const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zhurgvwsaawacmukbvbi',
    password: 'Babasaheb@250',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    console.log('Connected to DB.');

    // 1. Fetch all bookings
    const bookingsRes = await client.query('SELECT * FROM public.bookings ORDER BY start_time DESC');
    console.log(`Found ${bookingsRes.rows.length} total bookings in Supabase.`);

    // 2. Fetch all machines
    const machinesRes = await client.query('SELECT * FROM public.machines ORDER BY id');
    
    // 3. Fetch all notices
    const noticesRes = await client.query('SELECT * FROM public.hostel_notices ORDER BY updated_at DESC');

    // 4. Fetch slot overrides
    const overridesRes = await client.query('SELECT * FROM public.slot_overrides');

    // 5. Fetch admin profiles
    const adminsRes = await client.query('SELECT * FROM public.admin_profiles');

    const backupData = {
        timestamp: new Date().toISOString(),
        total_bookings: bookingsRes.rows.length,
        bookings: bookingsRes.rows,
        machines: machinesRes.rows,
        hostel_notices: noticesRes.rows,
        slot_overrides: overridesRes.rows,
        admin_profiles: adminsRes.rows
    };

    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupFile = path.join(backupDir, `safety_backup_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`Safety backup written successfully to ${backupFile}`);

    // Print summary of bookings
    console.log('\n--- VERIFIED BOOKINGS IN DATABASE ---');
    bookingsRes.rows.forEach((b, i) => {
        console.log(`${i+1}. [${b.booking_date}] Code: ${b.reference_code} | Machine: ${b.machine_id} | Student: ${b.student_name} | Phone: ${b.student_phone} | Roll: ${b.student_roll} | Status: ${b.status}`);
    });

    await client.end();
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
