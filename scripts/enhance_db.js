const { Client } = require('pg');

const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zhurgvwsaawacmukbvbi',
    password: 'Babasaheb@250',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function updateDb() {
    await client.connect();
    console.log('Connected to DB');

    // Add instructions column if missing
    await client.query(`
        ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS instructions TEXT;
        ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS active_from_date DATE;
    `);
    console.log('Added columns to machines if missing');

    // Update machines instructions
    await client.query(`
        UPDATE public.machines SET instructions = 'Heavy 9 Kg Load. Best for cottons, bedsheets, and daily laundry.' WHERE id = 1;
        UPDATE public.machines SET instructions = 'Heavy 9 Kg Load. High-speed wash with tangle-free drum. Suitable for sportswear.' WHERE id = 2;
        UPDATE public.machines SET instructions = 'Heavy 9 Kg Load. Ultra-quiet brushless motor. Great for study hours and evening laundry.' WHERE id = 3;
        UPDATE public.machines SET instructions = 'Heavy 9 Kg Load. Steam allergy care. Recommended for winter jackets, curtains, blankets.' WHERE id = 4;
    `);
    console.log('Updated machine instructions');

    // Add to realtime publication if not already added
    try {
        await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE public.machines;`);
        console.log('Added machines to supabase_realtime');
    } catch (e) {
        console.log('machines already in supabase_realtime or error:', e.message);
    }

    try {
        await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;`);
        console.log('Added bookings to supabase_realtime');
    } catch (e) {
        console.log('bookings already in supabase_realtime or error:', e.message);
    }

    // Check publication
    const pub = await client.query("SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'");
    console.log('supabase_realtime tables:', pub.rows.map(r => r.tablename));

    await client.end();
    console.log('DB update complete!');
}

updateDb().catch(console.error);
