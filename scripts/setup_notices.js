const { Client } = require('pg');

const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zhurgvwsaawacmukbvbi',
    password: 'Babasaheb@250',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function setupNoticeTable() {
    await client.connect();
    console.log('Connected to DB');

    // 1. Create table hostel_notices
    await client.query(`
        CREATE TABLE IF NOT EXISTS public.hostel_notices (
            id INT PRIMARY KEY DEFAULT 1,
            title VARCHAR(200) NOT NULL DEFAULT 'Hostel Laundry Notice',
            content TEXT NOT NULL,
            author VARCHAR(100) DEFAULT 'Hostel Laundry In-Charge / Warden',
            priority VARCHAR(20) DEFAULT 'info',
            is_active BOOLEAN DEFAULT true,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Ensure single active notice row (id = 1)
        INSERT INTO public.hostel_notices (id, title, content, author, priority, is_active, updated_at)
        VALUES (
            1,
            'Hostel Laundry Notice / सूचना',
            'कृपया वॉशिंग मशीन वापरल्यानंतर दरवाजा उघडा ठेवा आणि ड्रम स्वच्छ ठेवा. काही अडचण असल्यास वॉर्डन किंवा मॅनेजरशी संपर्क साधा.',
            'Hostel In-Charge (7447642019)',
            'info',
            true,
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    `);
    console.log('Created hostel_notices table');

    // 2. Enable RLS with public access
    await client.query(`
        ALTER TABLE public.hostel_notices ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Public can view notices" ON public.hostel_notices;
        CREATE POLICY "Public can view notices"
            ON public.hostel_notices FOR SELECT
            USING (true);

        DROP POLICY IF EXISTS "Public can update notices" ON public.hostel_notices;
        CREATE POLICY "Public can update notices"
            ON public.hostel_notices FOR ALL
            USING (true);
    `);
    console.log('Applied RLS policies to hostel_notices');

    // 3. Add to supabase_realtime publication
    try {
        await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE public.hostel_notices;`);
        console.log('Added hostel_notices to supabase_realtime');
    } catch (e) {
        console.log('Realtime publication message:', e.message);
    }

    const res = await client.query('SELECT * FROM public.hostel_notices');
    console.log('Notice data:', res.rows);

    await client.end();
    console.log('Notice table setup complete!');
}

setupNoticeTable().catch(console.error);
