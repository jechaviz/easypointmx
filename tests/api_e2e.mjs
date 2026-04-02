// Using native fetch in Node 24+

const PB_API = 'http://127.0.0.1:8090/api';
const WEB_URL = 'http://localhost:3033/easypoint';

async function runTests() {
    console.log('🚀 Starting Easypoint E2E API Tests...\n');
    let failures = 0;

    // Test 1: Health Check (Website)
    try {
        const res = await fetch(`${WEB_URL}/`);
        if (res.ok) {
            console.log('✅ [WEB] Website Root Access: OK (200)');
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (e) {
        console.error('❌ [WEB] Website Root Access: FAILED', e.message);
        failures++;
    }

    // Test 2: List Points
    try {
        const res = await fetch(`${PB_API}/collections/points/records`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.items)) {
            console.log(`✅ [API] List Points: OK (${data.items.length} points found)`);
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (e) {
        console.error('❌ [API] List Points: FAILED', e.message);
        failures++;
    }

    // Test 3: Create & Verify Shipment
    const testTrackingId = `E2E-${Math.floor(Math.random() * 100000)}`;
    try {
        // Create
        const createRes = await fetch(`${PB_API}/collections/shipments/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tracking_id: testTrackingId,
                status: 'pending'
            })
        });
        
        if (createRes.ok) {
            console.log(`✅ [API] Create Shipment (${testTrackingId}): OK`);
            
            // Verify
            const verifyRes = await fetch(`${PB_API}/collections/shipments/records?filter=(tracking_id='${testTrackingId}')`);
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.items.length > 0) {
                console.log(`✅ [API] Verify Shipment Existence: OK`);
            } else {
                throw new Error('Created shipment not found in search');
            }
        } else {
            const errBody = await createRes.text();
            throw new Error(`Status ${createRes.status} - ${errBody}`);
        }
    } catch (e) {
        console.error('❌ [API] Shipment Lifecycle: FAILED', e.message);
        failures++;
    }

    console.log('\n--- Test Summary ---');
    if (failures === 0) {
        console.log('🎉 ALL TESTS PASSED SUCCESSFULLY');
        process.exit(0);
    } else {
        console.error(`🚨 ${failures} TESTS FAILED`);
        process.exit(1);
    }
}

runTests();
