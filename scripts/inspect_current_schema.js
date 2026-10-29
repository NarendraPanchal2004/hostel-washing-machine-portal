const { Client } = require('pg');

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
    console.log('Connected to PostgreSQL.');

    const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    `);
    console.log('Tables in public schema:');
    for (const row of tablesRes.rows) {
        const countRes = await client.query(`SELECT count(*) FROM public."${row.table_name}"`);
        console.log(`- ${row.table_name}: ${countRes.rows[0].count} rows`);
    }

    const funcsRes = await client.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        ORDER BY routine_name;
    `);
    console.log('\nFunctions in public schema:');
    funcsRes.rows.forEach(r => console.log(`- ${r.routine_name}`));

    await client.end();
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
