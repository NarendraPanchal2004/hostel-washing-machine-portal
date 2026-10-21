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
    const res = await client.query(`
        SELECT 
            id, 
            reference_code,
            student_name,
            booking_date::text as booking_date_str,
            to_char(start_time AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') as ist_start,
            to_char(end_time AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') as ist_end,
            status
        FROM public.bookings 
        ORDER BY start_time DESC
    `);
    console.table(res.rows);
    await client.end();
}
check();
