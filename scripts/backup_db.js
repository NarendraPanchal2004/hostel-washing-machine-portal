const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.zhurgvwsaawacmukbvbi',
    password: 'Babasaheb@250',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function backup() {
    await client.connect();
    console.log('Connected to DB for backup');

    const tables = ['machines', 'bookings', 'hostel_notices', 'admin_profiles'];
    const backupData = {
        timestamp: new Date().toISOString(),
        tables: {}
    };

    for (const t of tables) {
        try {
            const res = await client.query(`SELECT * FROM public.${t}`);
            backupData.tables[t] = res.rows;
            console.log(`Backed up ${t}: ${res.rows.length} rows`);
        } catch (e) {
            console.warn(`Could not backup ${t}:`, e.message);
        }
    }

    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `backup_pre_security_${Date.now()}.json`;
    const filepath = path.join(backupDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
    console.log(`Backup successfully written to ${filepath}`);

    await client.end();
}

backup().catch(console.error);
