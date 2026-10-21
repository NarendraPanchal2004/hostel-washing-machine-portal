const { Client } = require('pg');

const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zhurgvwsaawacmukbvbi',
    password: 'Babasaheb@250',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function inspect() {
    await client.connect();

    console.log('=== POLICIES ===');
    const policies = await client.query("SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public'");
    console.log(policies.rows);

    console.log('=== REALTIME PUBLICATION ===');
    const pub = await client.query("SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'");
    console.log(pub.rows);

    console.log('=== EXTENSIONS ===');
    const ext = await client.query("SELECT extname FROM pg_extension");
    console.log(ext.rows.map(r => r.extname));

    console.log('=== CONSTRAINTS ON BOOKINGS ===');
    const cons = await client.query("SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.bookings'::regclass");
    console.log(cons.rows);

    await client.end();
}

inspect().catch(err => {
    console.error('Inspect error:', err);
    process.exit(1);
});
