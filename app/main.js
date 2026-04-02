const { loadModule } = window['vue3-sfc-loader'];

window.options = {
    moduleCache: { vue: Vue },
    async getFile(url) {
        const res = await fetch(url);
        if (!res.ok) throw Object.assign(new Error(res.statusText + ' ' + url), { res });
        return { getContentData: asBinary => asBinary ? res.arrayBuffer() : res.text() }
    },
    addStyle(textContent) {
        const style = Object.assign(document.createElement('style'), { textContent });
        const ref = document.head.getElementsByTagName('style')[0] || null;
        document.head.insertBefore(style, ref);
    },
};
const options = window.options;

const PB_URL = 'http://127.0.0.1:8090';

// Pre-defined demo users — always available synchronously (before mounted())
const DEMO_USERS = [
    { id: 'u1', full_name: 'Admin Demo',       name: 'Admin Demo',       email: 'admin@demo.mx',        role: 'admin',    point_ref: null },
    { id: 'u2', full_name: 'Roberto Operador', name: 'Roberto Operador', email: 'roberto@punto.mx',     role: 'operator', point_ref: 'p1' },
    { id: 'u3', full_name: 'Maria Papelería',  name: 'Maria Papelería',  email: 'maria@yopmail.com',    role: 'operator', point_ref: 'p2' },
    { id: 'u4', full_name: 'Juan Driver',      name: 'Juan Driver',      email: 'driver@easypoint.mx',  role: 'driver',   point_ref: null },
    { id: 'u5', full_name: 'Carlos Ventas',    name: 'Carlos Ventas',    email: 'carlos@sales.mx',      role: 'sales',    point_ref: null }
];
const DEMO_PWDS = ['Punto2024!', 'easypoint123'];

const DEFAULT_DEMO_DATA = {
    _v: 2, // Version flag to force cache breaks when schema updates
    shipments: [
        { id: 'mock1', tracking_id: 'EP-9921-X', recipient_name: 'Alejandro Ruiz',   status: 'at_point',   created: '2026-03-25T10:00:00Z', updated: '2026-03-26T09:00:00Z', expand: { point_id: { name: 'Punto Roma Norte', address: 'Av. Álvaro Obregón 154, Roma Norte' } } },
        { id: 'mock2', tracking_id: 'EP-1045-A', recipient_name: 'Beatriz Solis',    status: 'delivered',  created: '2026-03-24T14:30:00Z', updated: '2026-03-25T11:20:00Z', expand: { point_id: { name: 'Punto Condesa',    address: 'Amsterdam 123, Hipódromo Condesa'   } } },
        { id: 'mock3', tracking_id: 'EP-5567-B', recipient_name: 'Carlos Mendez',    status: 'in_transit', created: '2026-03-26T08:15:00Z', updated: '2026-03-26T12:00:00Z', expand: { point_id: { name: 'Punto Polanco',    address: 'Leibnitz 20, Polanco'               } } }
    ],
    points: [
        { id: 'p1', name: 'Punto Roma Norte', address: 'Av. Álvaro Obregón 154, Roma Norte', whatsapp: '5512345678', status: 'active' },
        { id: 'p2', name: 'Punto Condesa',    address: 'Amsterdam 123, Hipódromo Condesa',   whatsapp: '5587654321', status: 'active' }
    ],
    users: DEMO_USERS,
    prospects: [
        { id: 's1', business_name: 'Minisuper Don Paco', contact_name: 'Francisco R.', address: 'Insurgentes Sur 400', status: 'pending',  created: new Date().toISOString() },
        { id: 's2', business_name: 'Cybercafe Net',      contact_name: 'Lucia M.',     address: 'Reforma 222',         status: 'approved', created: new Date().toISOString() }
    ],
    invoices: [
        { id: 'i1', number: 'INV-2026-001', client_name: 'Logística Sur S.A.', client_rfc: 'LSU123456789', period: 'Marzo 2026', total: 4500.00, status: 'paid', created: new Date().toISOString() },
        { id: 'i2', number: 'INV-2026-002', client_name: 'E-commerce Mex', client_rfc: 'ECM987654321', period: 'Marzo 2026', total: 12500.50, status: 'sent', created: new Date().toISOString() },
        { id: 'i3', number: 'INV-2026-003', client_name: 'Global Retailers', client_rfc: 'GRE456123789', period: 'Abrel 2026', total: 8900.00, status: 'draft', created: new Date().toISOString() }
    ],
    commissions: [
        { id: 'c1', point: 'Punto Roma Norte', period: 'Marzo 2026', pkgs: 145, total: 1450.00, status: 'pending', created: new Date().toISOString() },
        { id: 'c2', point: 'Punto Condesa', period: 'Marzo 2026', pkgs: 89, total: 890.00, status: 'paid', created: new Date().toISOString() }
    ],
    partner_applications: [
        { id: 'pa1', business_name: 'Tienda La Barda', whatsapp: '5500112233', address: 'Insurgentes Nte 112', status: 'new', created: new Date().toISOString() },
        { id: 'pa2', business_name: 'Cafetería Java', whatsapp: '5577889900', address: 'Miguel Angel de Quevedo 44', status: 'new', created: new Date().toISOString() }
    ]
};

const app = Vue.createApp({
    data() {
        return {
            user: null,
            token: null,
            currentRoute: 'login',
            demoMode: false,
            demoData: null,
            modal: {
                show: false,
                title: '',
                message: '',
                type: 'info',
                confirmText: '',
                cancelText: '',
                onConfirm: null,
                onCancel: null
            },
            loading: false,
            loadingMsg: ''
        }
    },
    provide() {
        return {
            appState: this.$data,
            pb_url: PB_URL,
            showModal: (opts) => {
                return new Promise((resolve) => {
                    this.modal = {
                        show: true,
                        title:       opts.title       || 'Aviso',
                        message:     opts.message     || '',
                        type:        opts.type        || 'info',
                        confirmText: opts.confirmText,
                        cancelText:  opts.cancelText,
                        onConfirm: () => resolve(true),
                        onCancel:  () => resolve(false)
                    };
                });
            },
            getMapsUrl: (address) => {
                if (!address) return '#';
                return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
            },
            login: async (email, password, rememberMe = true) => {
                let loggedIn = false;

                // 1. Try real PocketBase
                try {
                    const res = await fetch(`${PB_URL}/api/collections/users/auth-with-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ identity: email, password })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        this.token = data.token;
                        this.user  = data.record;
                        this.demoMode = false;
                        loggedIn = true;
                    }
                } catch (_) { /* PocketBase offline */ }

                // 2. Demo fallback — uses inline DEMO_USERS so it works before mounted()
                if (!loggedIn) {
                    const users = this.demoData?.users || DEMO_USERS;
                    const dUser = users.find(u => u.email === email);
                    if (dUser && DEMO_PWDS.includes(password)) {
                        this.user  = dUser;
                        this.token = 'demo_' + Date.now();
                        this.demoMode = true;
                        loggedIn = true;
                    }
                }

                if (!loggedIn) throw new Error('Credenciales incorrectas');

                // Persist session
                const storage = rememberMe ? localStorage : sessionStorage;
                storage.setItem('ep_token',    this.token);
                storage.setItem('ep_user',     JSON.stringify(this.user));
                storage.setItem('ep_demo_mode', this.demoMode ? '1' : '0');

                const role = this.user.role;
                if      (role === 'admin')  this.currentRoute = 'admin';
                else if (role === 'driver') this.currentRoute = 'driver';
                else if (role === 'sales')  this.currentRoute = 'sales';
                else                        this.currentRoute = 'dashboard';
            },
            logout: () => {
                this.user  = null;
                this.token = null;
                localStorage.removeItem('ep_token');
                localStorage.removeItem('ep_user');
                localStorage.removeItem('ep_remember');
                sessionStorage.removeItem('ep_token');
                sessionStorage.removeItem('ep_user');
                this.currentRoute = 'login';
            },
            toggleDemo: (val) => {
                this.demoMode = val;
                localStorage.setItem('ep_demo_mode', val ? '1' : '0');
            },
            saveDemoData: (data) => {
                this.demoData = data;
                localStorage.setItem('ep_demo_data', JSON.stringify(data));
            }
        }
    },
    async mounted() {
        // Load saved demo data (or defaults)
        this.demoMode = localStorage.getItem('ep_demo_mode') === '1';
        let savedDemo = localStorage.getItem('ep_demo_data');
        if (savedDemo) {
            try {
                let parsed = JSON.parse(savedDemo);
                // If version mismatch OR any core array is missing/empty, use DEFAULT_DEMO_DATA directly.
                // IMPORTANT: DEFAULT_DEMO_DATA must come LAST to always win over stale cache.
                if (parsed._v !== DEFAULT_DEMO_DATA._v || !parsed.shipments?.length) {
                    console.log('[Demo] Cache stale or empty — reloading DEFAULT_DEMO_DATA.');
                    this.demoData = DEFAULT_DEMO_DATA;
                } else {
                    // Only user-created additions (e.g. added prospects) are kept from cache
                    this.demoData = parsed;
                }
            } catch (e) {
                console.error('[Demo] Failed to parse cached data, resetting.', e);
                this.demoData = DEFAULT_DEMO_DATA;
            }
        } else {
            this.demoData = DEFAULT_DEMO_DATA;
        }
        // Always persist the canonical version so future loads are consistent
        localStorage.setItem('ep_demo_data', JSON.stringify(this.demoData));

        // Restore session
        const token = localStorage.getItem('ep_token') || sessionStorage.getItem('ep_token');
        const user  = localStorage.getItem('ep_user')  || sessionStorage.getItem('ep_user');

        if (token && user) {
            try {
                // Try to refresh real PocketBase session
                const refreshRes = await fetch(`${PB_URL}/api/collections/users/auth-refresh`, {
                    method: 'POST',
                    headers: { 'Authorization': token }
                });
                if (refreshRes.ok) {
                    const refreshData = await refreshRes.json();
                    this.token = refreshData.token;
                    this.user  = refreshData.record;
                    const storage = localStorage.getItem('ep_remember') === '1' ? localStorage : sessionStorage;
                    storage.setItem('ep_token', refreshData.token);
                    storage.setItem('ep_user',  JSON.stringify(refreshData.record));
                } else {
                    // Kept as demo session
                    this.user  = JSON.parse(user);
                    this.token = token;
                }
            } catch (_) {
                // Offline: restore from storage
                this.user  = JSON.parse(user);
                this.token = token;
            }

            const userRole = this.user?.role;
            if      (userRole === 'admin')  this.currentRoute = 'admin';
            else if (userRole === 'driver') this.currentRoute = 'driver';
            else if (userRole === 'sales')  this.currentRoute = 'sales';
            else if (userRole)              this.currentRoute = 'dashboard';
        }
    },
    template: `<App />`,
    components: {
        App: Vue.defineAsyncComponent(() => loadModule('./components/App.vue', options))
    }
});

app.mount('#app');
