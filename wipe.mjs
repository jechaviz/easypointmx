import { adminAuth, pbApi } from './pb/scripts/_shared.mjs';

async function wipe() {
    console.log('Authenticating as admin...');
    const { token } = await adminAuth();

    const headers = { 'Authorization': token };
    const collections = ['shipments', 'points', 'commissions', 'invoices', 'partner_applications'];

    for (const col of collections) {
        const res = await fetch(pbApi(`/api/collections/${col}/records?perPage=500`), { headers });
        if (!res.ok) continue;
        const data = await res.json();
        const items = data.items || [];
        console.log(`Deleting ${items.length} records from ${col}...`);
        for (const item of items) {
            await fetch(pbApi(`/api/collections/${col}/records/${item.id}`), { method: 'DELETE', headers });
        }
    }
    
    // For users, keep admin-like accounts, delete the rest.
    const res = await fetch(pbApi('/api/collections/users/records?perPage=500'), { headers });
    if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        for (const item of items) {
            if (item.email.includes('admin')) continue;
            console.log(`Deleting user ${item.email}`);
            await fetch(pbApi(`/api/collections/users/records/${item.id}`), { method: 'DELETE', headers });
        }
    }
    console.log('Wipe complete.');
}
wipe().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
