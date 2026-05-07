// Using native fetch in Node 24+

const PB_API = process.env.PB_API || 'http://127.0.0.1:8090/api';
const WEB_URL = String(process.env.WEB_URL || 'http://localhost:3033/easypoint').replace(/\/$/, '');
const WEB_ORIGIN = new URL(WEB_URL).origin;
const WEB_API = `${WEB_ORIGIN}/api`;

function pbFilterString(value) {
    return `'${String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function pbApiUrl(path, params = {}) {
    const url = new URL(path, PB_API.endsWith('/') ? PB_API : `${PB_API}/`);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
}

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

    // Test 2: Directory Slash Redirect
    try {
        const res = await fetch(`${WEB_ORIGIN}/website`, { redirect: 'manual' });
        const location = res.headers.get('location') || '';
        if ([301, 302, 307, 308].includes(res.status) && location.endsWith('/website/')) {
            console.log('✅ [WEB] Directory Slash Redirect: OK');
        } else {
            throw new Error(`Status ${res.status}, location=${location || 'missing'}`);
        }
    } catch (e) {
        console.error('❌ [WEB] Directory Slash Redirect: FAILED', e.message);
        failures++;
    }

    // Test 3: Public SFC Asset
    try {
        const res = await fetch(`${WEB_ORIGIN}/website/components/SiteApp.vue`);
        const body = await res.text();
        if (res.ok && body.includes('<template>')) {
            console.log('✅ [WEB] SiteApp SFC Asset: OK');
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (e) {
        console.error('❌ [WEB] SiteApp SFC Asset: FAILED', e.message);
        failures++;
    }

    // Test 4: List Points
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

    // Test 5: Same-origin Proxy Health
    try {
        const res = await fetch(`${WEB_API}/health`);
        const data = await res.json();
        if (res.ok && Number(data?.code) === 200) {
            console.log('✅ [WEB->API] Same-origin API Proxy: OK');
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (e) {
        console.error('❌ [WEB->API] Same-origin API Proxy: FAILED', e.message);
        failures++;
    }

    // Test 6: Public Partner Application
    const testPartnerName = `E2E Partner ${Math.floor(Math.random() * 100000)}`;
    try {
        const createRes = await fetch(`${PB_API}/collections/partner_applications/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                business_name: testPartnerName,
                whatsapp: '5500000000',
                address: 'E2E test address',
                description: 'E2E public form contract',
                horarios: 'Lun-Vie 9:00-18:00',
                status: 'new'
            })
        });

        if (createRes.ok) {
            const created = await createRes.json();
            console.log(`✅ [API] Public Partner Application (${created.id}): OK`);
        } else {
            const errBody = await createRes.text();
            throw new Error(`Status ${createRes.status} - ${errBody}`);
        }
    } catch (e) {
        console.error('❌ [API] Public Partner Application: FAILED', e.message);
        failures++;
    }

    // Test 7: Create & Verify Shipment
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
            const verifyRes = await fetch(pbApiUrl('collections/shipments/records', {
                filter: `(tracking_id=${pbFilterString(testTrackingId)})`
            }));
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
        process.exitCode = 0;
        return;
    } else {
        console.error(`🚨 ${failures} TESTS FAILED`);
        process.exitCode = 1;
    }
}

runTests();
