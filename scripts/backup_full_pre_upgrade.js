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
    console.log('Connected to DB for pre-upgrade backup...');

    const tables = ['machines', 'bookings', 'hostel_notices', 'slot_overrides', 'admin_profiles', 'audit_logs'];
    const backupData = {
        timestamp: new Date().toISOString(),
        tables: {}
    };

    for (const t of tables) {
        const res = await client.query(`SELECT * FROM public."${t}"`);
        backupData.tables[t] = res.rows;
        console.log(`Backed up ${t}: ${res.rows.length} rows`);
    }

    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupPath = path.join(backupDir, `backup_pre_hostel_upgrade_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`Full backup saved safely to: ${backupPath}`);

    await client.end();
}

backup().catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
});
