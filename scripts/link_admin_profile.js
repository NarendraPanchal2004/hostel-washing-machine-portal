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
    console.log('Connected to DB.');

    // 1. Check if constraint exists on email
    const insertRes = await client.query(`
        INSERT INTO public.admin_profiles (user_id, email, full_name)
        VALUES ('64cbbfff-67fa-43b8-90d4-96f1dddc6064', 'narendrapanchal8114@gmail.com', 'Narendra Panchal (Admin - 7447642019)')
        ON CONFLICT (email) DO UPDATE 
        SET user_id = EXCLUDED.user_id, full_name = EXCLUDED.full_name
        RETURNING *;
    `);
    console.log('Upsert result:', insertRes.rows);

    // 2. Also ensure is_admin explicitly treats narendrapanchal8114@gmail.com as admin
    await client.query(`
        CREATE OR REPLACE FUNCTION public.is_admin()
        RETURNS boolean
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        STABLE
        AS $$
            SELECT (
                auth.role() = 'authenticated' AND (
                    (auth.jwt() ->> 'email') = 'narendrapanchal8114@gmail.com'
                    OR EXISTS (
                        SELECT 1 FROM public.admin_profiles 
                        WHERE user_id = auth.uid() OR email = (auth.jwt() ->> 'email')
                    )
                )
            );
        $$;
    `);
    console.log('Updated is_admin() function to ensure narendrapanchal8114@gmail.com has instant access.');

    // 3. Verify admin_profiles
    const profiles = await client.query('SELECT * FROM public.admin_profiles');
    console.log('Current admin profiles:', profiles.rows);

    await client.end();
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
