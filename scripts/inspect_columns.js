const { Client } = require('pg');
const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zhurgvwsaawacmukbvbi',
    password: 'Babasaheb@250',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function inspectTables() {
    await client.connect();
    const res = await client.query(`
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
    `);
    let currentTable = '';
    res.rows.forEach(r => {
        if (r.table_name !== currentTable) {
            currentTable = r.table_name;
            console.log('\n--- ' + currentTable + ' ---');
        }
        console.log(`  ${r.column_name} (${r.data_type})`);
    });
    await client.end();
}
inspectTables().catch(console.error);
