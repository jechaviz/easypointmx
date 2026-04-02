const PB = 'http://127.0.0.1:8090';

async function wipe() {
    console.log('Authenticating as admin...');
    const authRes = await fetch(`${PB}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'admin@demo.mx', password: 'easypoint123' }) // Or admin@easypoint.mx
    });
    
    let token = '';
    if (authRes.ok) {
        token = (await authRes.json()).token;
    } else {
        // try alternative admin
        const authRes2 = await fetch(`${PB}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: 'admin@easypoint.mx', password: 'easypoint123' })
        });
        if (authRes2.ok) token = (await authRes2.json()).token;
        else { console.error('Failed to auth as admin'); return; }
    }

    const headers = { 'Authorization': token };
    const collections = ['shipments', 'points', 'commissions', 'invoices', 'partner_applications'];

    for (const col of collections) {
        const res = await fetch(`${PB}/api/collections/${col}/records?perPage=500`, { headers });
        if (!res.ok) continue;
        const data = await res.json();
        const items = data.items || [];
        console.log(`Deleting ${items.length} records from ${col}...`);
        for (const item of items) {
            await fetch(`${PB}/api/collections/${col}/records/${item.id}`, { method: 'DELETE', headers });
        }
    }
    
    // For users, keep admin@demo.mx or admin@easypoint.mx, delete the rest
    const res = await fetch(`${PB}/api/collections/users/records?perPage=500`, { headers });
    if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        for (const item of items) {
            if (item.email.includes('admin')) continue;
            console.log(`Deleting user ${item.email}`);
            await fetch(`${PB}/api/collections/users/records/${item.id}`, { method: 'DELETE', headers });
        }
    }
    console.log('Wipe complete.');
}
wipe();
