const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function deploy() {
    const client = new Client({
        host: 'aws-0-ap-southeast-1.pooler.supabase.com',
        port: 6543,
        user: 'postgres.zhurgvwsaawacmukbvbi',
        password: 'Babasaheb@250',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    console.log('Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully!');

    const sqlPath = path.join(__dirname, '..', 'supabase', 'full_setup.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing full_setup.sql...');
    await client.query(sql);
    console.log('Database schema, tables, RLS policies, and 4 machines created successfully!');

    // Verify machines
    const mRes = await client.query('SELECT id, name, model, capacity_kg, status FROM public.machines ORDER BY id ASC');
    console.log('Machines in DB:', mRes.rows);

    // Verify bookings table
    const bRes = await client.query('SELECT COUNT(*) FROM public.bookings');
    console.log('Bookings table count:', bRes.rows[0].count);

    // Notify postgrest schema reload
    try {
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('PostgREST schema cache reloaded!');
    } catch (e) {
        console.warn('Could not notify pgrst:', e.message);
    }

    await client.end();
    console.log('Deployment completed successfully!');
}

deploy().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
