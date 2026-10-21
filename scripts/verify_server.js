async function verifyServer() {
    const res = await fetch('http://localhost:3000');
    console.log('HTTP Status:', res.status);
    const text = await res.text();
    console.log('Has machines-container:', text.includes('id="machines-container"'));
    console.log('Has hostel-notice-board:', text.includes('id="hostel-notice-board"'));
    console.log('Has tab-notice-board:', text.includes('id="tab-notice-board"'));
    console.log('Has v=4.0:', text.includes('v=4.0'));
}
verifyServer().catch(console.error);
