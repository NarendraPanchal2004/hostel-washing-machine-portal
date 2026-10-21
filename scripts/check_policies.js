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
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'bookings';
    `);
    console.table(res.rows);

    const funcRes = await client.query(`
        SELECT prosrc FROM pg_proc WHERE proname = 'is_admin';
    `);
    console.log('is_admin function definition:');
    console.log(funcRes.rows[0]?.prosrc);

    await client.end();
}
check();
