const fetch = globalThis.fetch || require('node-fetch');

const SUPABASE_URL = 'https://zhurgvwsaawacmukbvbi.supabase.co';
const ANON_KEY = 'sb_publishable_w1Y0JZdQfxdaEkZDL3Af2g_88t8IgGj';

const headers = {
    'apikey': ANON_KEY,
    'Authorization': 'Bearer ' + ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

async function testNoticeFlow() {
    console.log('=== TESTING NOTICE BOARD AND MACHINES FLOW ===\n');

    // 1. Admin saves a new notice
    console.log('1. Admin saves a notice to Supabase...');
    const testNotice = {
        id: 1,
        title: 'हॉस्टेल वॉशिंग मशीन महत्त्वाची सूचना',
        content: 'सर्व विद्यार्थ्यांनी मशीन वापरताना HE लिक्विड डिटर्जंट वापरावे. वॉश पूर्ण झाल्यावर ड्रम स्वच्छ करून दरवाजा उघडा ठेवावा.',
        author: 'Hostel In-Charge (7447642019)',
        priority: 'warning',
        is_active: true,
        updated_at: new Date().toISOString()
    };

    const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/hostel_notices?id=eq.1`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(testNotice)
    });
    console.log('Save Notice Status:', saveRes.status);

    // 2. Student loads the notice
    console.log('2. Student fetches active notice...');
    const loadRes = await fetch(`${SUPABASE_URL}/rest/v1/hostel_notices?id=eq.1`, {
        method: 'GET',
        headers
    });
    const loadedData = await loadRes.json();
    console.log('Loaded Notice Title:', loadedData[0]?.title);
    console.log('Loaded Notice Content:', loadedData[0]?.content);
    console.log('Loaded Notice Priority:', loadedData[0]?.priority);

    if (loadedData[0]?.content !== testNotice.content) {
        throw new Error('Notice content did not match!');
    }
    console.log('>>> Notice Board sync verified 100%! <<<\n');

    // 3. Verify all 4 machines are available
    console.log('3. Verifying all 4 machines...');
    const mRes = await fetch(`${SUPABASE_URL}/rest/v1/machines?select=*&order=id.asc`, {
        method: 'GET',
        headers
    });
    const machines = await mRes.json();
    console.log('Machines found:', machines.map(m => `#${m.id} ${m.name} (${m.capacity_kg} Kg) -> ${m.status}`));
    if (machines.length !== 4) {
        throw new Error('Expected 4 machines, found ' + machines.length);
    }
    console.log('>>> All 4 Machines verified! <<<\n');

    console.log('=== ALL NOTICE & MACHINE CHECKS PASSED WITH 100% SUCCESS! ===');
}

testNoticeFlow().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
