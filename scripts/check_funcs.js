const { Client } = require('pg');

const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zhurgvwsaawacmukbvbi',
    password: 'Babasaheb@250',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function check() {
    await client.connect();
    const res = await client.query("SELECT proname FROM pg_proc WHERE proname IN ('book_washing_machine', 'get_public_machine_slots', 'get_booking_by_ref', 'is_admin')");
    console.log('Found custom functions:', res.rows);
    await client.end();
}
check().catch(console.error);
