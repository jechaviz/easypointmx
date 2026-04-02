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
    { id: 'u1', full_name: 'Admin Demo',       name: 'Admin Demo',       email: 'admin@demo.mx',        role: 'admin',    point_ref: null, verified: true },
    { id: 'u2', full_name: 'Roberto Operador', name: 'Roberto Operador', email: 'roberto@punto.mx',     role: 'operator', point_ref: 'p1', verified: true },
    { id: 'u3', full_name: 'Maria Papelería',  name: 'Maria Papelería',  email: 'maria@yopmail.com',    role: 'operator', point_ref: 'p2', verified: true },
    { id: 'u4', full_name: 'Juan Driver',      name: 'Juan Driver',      email: 'driver@easypoint.mx',  role: 'driver',   point_ref: null, verified: true },
    { id: 'u5', full_name: 'Carlos Ventas',    name: 'Carlos Ventas',    email: 'carlos@sales.mx',      role: 'sales',    point_ref: null, verified: true }
];
const DEMO_PWDS = ['Punto2024!', 'easypoint123'];

const DEFAULT_DEMO_DATA = {
    _v: 3, // Version flag to force cache breaks when schema updates
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

const NOTIFICATION_READS_KEY = 'ep_notification_reads_v1';
const MANUAL_BUSINESS_EVENTS_KEY = 'ep_manual_business_events_v1';
const MAX_MANUAL_EVENTS = 24;

function toList(value) {
    return Array.isArray(value) ? value : [];
}

function resolveTimestamp(item) {
    return item?.updated || item?.created || new Date().toISOString();
}

function latestTimestamp(items) {
    const stamps = toList(items)
        .map(item => Date.parse(resolveTimestamp(item)))
        .filter(value => Number.isFinite(value));
    return stamps.length ? new Date(Math.max(...stamps)).toISOString() : new Date().toISOString();
}

function signatureOf(items, pickers = []) {
    return toList(items)
        .map(item => {
            const base = [item?.id || '', item?.status || '', resolveTimestamp(item)];
            const extras = pickers.map(pick => {
                try {
                    return pick(item) || '';
                } catch (_) {
                    return '';
                }
            });
            return [...base, ...extras].join(':');
        })
        .sort()
        .join('|');
}

function previewList(items, pick) {
    return toList(items)
        .slice(0, 2)
        .map(item => pick(item))
        .filter(Boolean)
        .join(', ');
}

function normalizeAudience(audience) {
    if (!audience || audience === 'all') return ['all'];
    return Array.isArray(audience) ? audience : [audience];
}

function eventMatchesUser(event, user) {
    const audience = normalizeAudience(event?.audience);
    const role = user?.role || 'guest';
    return audience.includes('all') || audience.includes(role);
}

function createBusinessEvent({
    id,
    audience = 'all',
    severity = 'info',
    icon = 'bell-fill',
    title,
    message,
    createdAt,
    source = 'derived'
}) {
    return {
        id,
        audience: normalizeAudience(audience),
        severity,
        icon,
        title,
        message,
        createdAt: createdAt || new Date().toISOString(),
        source
    };
}

function formatMoney(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0
    }).format(Number(amount) || 0);
}

function buildBusinessEvents({ user, snapshot }) {
    if (!user?.role) return [];

    const data = snapshot || {};
    const shipments = toList(data.shipments);
    const users = toList(data.users);
    const commissions = toList(data.commissions);
    const partnerApplications = toList(data.partner_applications);
    const points = toList(data.points);
    const point = data.point || points.find(item => item?.id === user.point_ref) || null;
    const now = Date.now();
    const events = [];

    if (user.role === 'admin') {
        const pendingUsers = users.filter(item => item?.verified === false);
        const unassignedOperators = users.filter(item => item?.role === 'operator' && item?.verified !== false && !item?.point_ref);
        const newPartners = partnerApplications.filter(item => item?.status === 'new');
        const pendingCommissions = commissions.filter(item => item?.status === 'pending');
        const transitShipments = shipments.filter(item => item?.status === 'in_transit');

        if (pendingUsers.length) {
            events.push(createBusinessEvent({
                id: `admin:pending-users:${signatureOf(pendingUsers, [item => item?.role])}`,
                audience: 'admin',
                severity: 'warning',
                icon: 'person-fill-exclamation',
                title: `${pendingUsers.length} usuario(s) pendientes de aprobacion`,
                message: `Revisa accesos de ${previewList(pendingUsers, item => item?.full_name || item?.email) || 'nuevos usuarios'} en AdminHub.`,
                createdAt: latestTimestamp(pendingUsers)
            }));
        }

        if (unassignedOperators.length) {
            events.push(createBusinessEvent({
                id: `admin:operators-without-point:${signatureOf(unassignedOperators, [item => item?.email])}`,
                audience: 'admin',
                severity: 'warning',
                icon: 'shop-window',
                title: `${unassignedOperators.length} local(es) sin punto asignado`,
                message: 'Vincula a tus operadores con un local para que puedan operar recepcion y entrega.',
                createdAt: latestTimestamp(unassignedOperators)
            }));
        }

        if (newPartners.length) {
            events.push(createBusinessEvent({
                id: `admin:new-partners:${signatureOf(newPartners, [item => item?.business_name])}`,
                audience: 'admin',
                severity: 'info',
                icon: 'briefcase-fill',
                title: `${newPartners.length} solicitud(es) de afiliacion nuevas`,
                message: `Ventas ya capturo ${previewList(newPartners, item => item?.business_name) || 'nuevos prospectos'} para revisar.`,
                createdAt: latestTimestamp(newPartners)
            }));
        }

        if (pendingCommissions.length) {
            const totalPending = pendingCommissions.reduce((sum, item) => sum + Number(item?.total || 0), 0);
            events.push(createBusinessEvent({
                id: `admin:pending-commissions:${signatureOf(pendingCommissions, [item => item?.period, item => item?.point || item?.point_name])}`,
                audience: 'admin',
                severity: 'warning',
                icon: 'cash-stack',
                title: `${pendingCommissions.length} comision(es) por liquidar`,
                message: `El monto estimado pendiente es ${formatMoney(totalPending)}.`,
                createdAt: latestTimestamp(pendingCommissions)
            }));
        }

        if (transitShipments.length) {
            events.push(createBusinessEvent({
                id: `admin:transit-shipments:${signatureOf(transitShipments, [item => item?.tracking_id])}`,
                audience: 'admin',
                severity: 'info',
                icon: 'truck',
                title: `${transitShipments.length} envio(s) en transito`,
                message: 'La red tiene paquetes moviendose entre choferes y locales.',
                createdAt: latestTimestamp(transitShipments)
            }));
        }
    }

    if (user.role === 'operator') {
        if (!user.point_ref || !point) {
            events.push(createBusinessEvent({
                id: `operator:point-missing:${user.id || user.email}`,
                audience: 'operator',
                severity: 'warning',
                icon: 'exclamation-triangle-fill',
                title: 'Tu cuenta sigue sin local asignado',
                message: 'Admin debe vincularte a un punto para activar recepcion y entrega.',
                createdAt: new Date().toISOString()
            }));
        }

        const inboundShipments = shipments.filter(item => item?.status === 'in_transit');
        const readyForPickup = shipments.filter(item => item?.status === 'at_point');
        const deliveredRecently = shipments.filter(item => item?.status === 'delivered' && (now - Date.parse(resolveTimestamp(item))) <= 86400000);

        if (inboundShipments.length && point) {
            events.push(createBusinessEvent({
                id: `operator:inbound:${user.point_ref}:${signatureOf(inboundShipments, [item => item?.tracking_id])}`,
                audience: 'operator',
                severity: 'info',
                icon: 'box-seam-fill',
                title: `${inboundShipments.length} paquete(s) vienen hacia ${point.name}`,
                message: `Preparate para recepcion de ${previewList(inboundShipments, item => item?.tracking_id) || 'nuevos paquetes'}.`,
                createdAt: latestTimestamp(inboundShipments)
            }));
        }

        if (readyForPickup.length) {
            events.push(createBusinessEvent({
                id: `operator:ready:${user.point_ref || 'na'}:${signatureOf(readyForPickup, [item => item?.tracking_id])}`,
                audience: 'operator',
                severity: 'warning',
                icon: 'person-check-fill',
                title: `${readyForPickup.length} paquete(s) listos para entregar`,
                message: 'Tu mostrador ya tiene paquetes esperando al cliente final.',
                createdAt: latestTimestamp(readyForPickup)
            }));
        }

        if (deliveredRecently.length) {
            events.push(createBusinessEvent({
                id: `operator:delivered:${user.point_ref || 'na'}:${signatureOf(deliveredRecently, [item => item?.tracking_id])}`,
                audience: 'operator',
                severity: 'success',
                icon: 'check2-circle',
                title: `${deliveredRecently.length} entrega(s) completadas recientemente`,
                message: 'Buen ritmo operativo en tu local durante las ultimas 24 horas.',
                createdAt: latestTimestamp(deliveredRecently)
            }));
        }
    }

    if (user.role === 'driver') {
        const pendingPickups = shipments.filter(item => item?.status === 'pending');
        const onRoute = shipments.filter(item => item?.status === 'in_transit');

        if (pendingPickups.length) {
            events.push(createBusinessEvent({
                id: `driver:pending:${signatureOf(pendingPickups, [item => item?.tracking_id])}`,
                audience: 'driver',
                severity: 'warning',
                icon: 'box-arrow-in-down',
                title: `${pendingPickups.length} recoleccion(es) pendientes`,
                message: `Tu ruta aun tiene ${previewList(pendingPickups, item => item?.tracking_id) || 'paquetes'} por recoger.`,
                createdAt: latestTimestamp(pendingPickups)
            }));
        }

        if (onRoute.length) {
            events.push(createBusinessEvent({
                id: `driver:on-route:${signatureOf(onRoute, [item => item?.tracking_id])}`,
                audience: 'driver',
                severity: 'info',
                icon: 'truck-flatbed',
                title: `${onRoute.length} paquete(s) siguen en ruta`,
                message: 'Completa las entregas en local para liberar espacio de carga y cerrar la ruta.',
                createdAt: latestTimestamp(onRoute)
            }));
        }
    }

    if (user.role === 'sales') {
        const newProspects = partnerApplications.filter(item => item?.status === 'new');
        const approvedProspects = partnerApplications.filter(item => item?.status === 'approved');
        const stalledProspects = partnerApplications.filter(item => ['new', 'pending'].includes(item?.status) && (now - Date.parse(resolveTimestamp(item))) > 259200000);

        if (newProspects.length) {
            events.push(createBusinessEvent({
                id: `sales:new:${signatureOf(newProspects, [item => item?.business_name])}`,
                audience: 'sales',
                severity: 'info',
                icon: 'megaphone-fill',
                title: `${newProspects.length} prospecto(s) nuevos para contactar`,
                message: `Hay oportunidades activas como ${previewList(newProspects, item => item?.business_name) || 'nuevos aliados'} esperando seguimiento.`,
                createdAt: latestTimestamp(newProspects)
            }));
        }

        if (approvedProspects.length) {
            events.push(createBusinessEvent({
                id: `sales:approved:${signatureOf(approvedProspects, [item => item?.business_name])}`,
                audience: 'sales',
                severity: 'success',
                icon: 'patch-check-fill',
                title: `${approvedProspects.length} aliado(s) aprobados`,
                message: 'Ya puedes preparar onboarding comercial y seguimiento postventa.',
                createdAt: latestTimestamp(approvedProspects)
            }));
        }

        if (stalledProspects.length) {
            events.push(createBusinessEvent({
                id: `sales:stalled:${signatureOf(stalledProspects, [item => item?.business_name])}`,
                audience: 'sales',
                severity: 'warning',
                icon: 'clock-history',
                title: `${stalledProspects.length} prospecto(s) sin seguimiento reciente`,
                message: 'Conviene reactivar estas oportunidades para no perder conversion.',
                createdAt: latestTimestamp(stalledProspects)
            }));
        }
    }

    return events.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

const app = Vue.createApp({
    data() {
        return {
            user: null,
            token: null,
            currentRoute: 'login',
            demoMode: false,
            demoData: null,
            notifications: [],
            notificationCenterOpen: false,
            notificationReads: {},
            manualBusinessEvents: [],
            businessSnapshot: {},
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
            toggleNotificationCenter: () => {
                this.notificationCenterOpen = !this.notificationCenterOpen;
            },
            closeNotificationCenter: () => {
                this.notificationCenterOpen = false;
            },
            markNotificationRead: (id) => {
                if (!id) return;
                this.notificationReads = {
                    ...this.notificationReads,
                    [id]: new Date().toISOString()
                };
                localStorage.setItem(NOTIFICATION_READS_KEY, JSON.stringify(this.notificationReads));
                this.refreshNotifications();
            },
            markAllNotificationsRead: () => {
                const nextReads = { ...this.notificationReads };
                const stamp = new Date().toISOString();
                for (const event of this.notifications) {
                    nextReads[event.id] = stamp;
                }
                this.notificationReads = nextReads;
                localStorage.setItem(NOTIFICATION_READS_KEY, JSON.stringify(nextReads));
                this.refreshNotifications();
            },
            emitBusinessEvent: (event) => {
                const nextEvent = createBusinessEvent({
                    ...event,
                    id: event?.id || `manual:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
                    source: 'manual',
                    createdAt: event?.createdAt || new Date().toISOString()
                });
                this.manualBusinessEvents = [nextEvent, ...toList(this.manualBusinessEvents)].slice(0, MAX_MANUAL_EVENTS);
                localStorage.setItem(MANUAL_BUSINESS_EVENTS_KEY, JSON.stringify(this.manualBusinessEvents));
                this.refreshNotifications();
                return nextEvent;
            },
            syncBusinessEvents: (snapshot = {}) => {
                this.businessSnapshot = snapshot || {};
                this.refreshNotifications();
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
                        if (data.record && data.record.verified === false) {
                            throw new Error('Tu cuenta sigue pendiente de aprobación por un admin.');
                        }
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
                        if (dUser.verified === false) {
                            throw new Error('Tu cuenta sigue pendiente de aprobación por un admin.');
                        }
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

                this.notificationCenterOpen = false;
                this.businessSnapshot = this.demoMode ? (this.demoData || {}) : {};
                this.refreshNotifications();
            },
            registerUser: async ({ full_name, email, password, role }) => {
                const normalizedEmail = String(email || '').trim().toLowerCase();
                const payload = {
                    email: normalizedEmail,
                    password,
                    passwordConfirm: password,
                    full_name: String(full_name || '').trim(),
                    role,
                    emailVisibility: true
                };

                try {
                    const res = await fetch(`${PB_URL}/api/collections/users/records`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (!res.ok || data?.code) throw new Error(data?.message || 'No se pudo completar el registro.');
                    return data;
                } catch (error) {
                    const offlineLike = !error?.message || /failed to fetch|networkerror|load failed/i.test(error.message);
                    if (!offlineLike) throw error;
                }

                const demoData = this.demoData || DEFAULT_DEMO_DATA;
                const users = [...(demoData.users || DEMO_USERS)];
                if (users.some(u => String(u.email || '').toLowerCase() === normalizedEmail)) {
                    throw new Error('Ya existe una cuenta con ese correo.');
                }

                const newUser = {
                    id: 'demo_' + Date.now(),
                    email: normalizedEmail,
                    full_name: String(full_name || '').trim(),
                    role,
                    point_ref: null,
                    verified: false,
                    emailVisibility: true,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                };

                this.demoData = { ...demoData, users: [newUser, ...users] };
                localStorage.setItem('ep_demo_data', JSON.stringify(this.demoData));
                return newUser;
            },
            logout: () => {
                this.user  = null;
                this.token = null;
                this.notifications = [];
                this.notificationCenterOpen = false;
                this.businessSnapshot = {};
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
                if (this.demoMode && this.user) {
                    this.businessSnapshot = data || {};
                    this.refreshNotifications();
                }
            }
        }
    },
    async mounted() {
        try {
            this.notificationReads = JSON.parse(localStorage.getItem(NOTIFICATION_READS_KEY) || '{}');
        } catch (_) {
            this.notificationReads = {};
        }
        try {
            this.manualBusinessEvents = toList(JSON.parse(localStorage.getItem(MANUAL_BUSINESS_EVENTS_KEY) || '[]'));
        } catch (_) {
            this.manualBusinessEvents = [];
        }

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
            if (this.user?.verified === false) {
                this.user = null;
                this.token = null;
                this.notifications = [];
                this.businessSnapshot = {};
                localStorage.removeItem('ep_token');
                localStorage.removeItem('ep_user');
                sessionStorage.removeItem('ep_token');
                sessionStorage.removeItem('ep_user');
                this.currentRoute = 'login';
                return;
            }
            if      (userRole === 'admin')  this.currentRoute = 'admin';
            else if (userRole === 'driver') this.currentRoute = 'driver';
            else if (userRole === 'sales')  this.currentRoute = 'sales';
            else if (userRole)              this.currentRoute = 'dashboard';

            this.businessSnapshot = this.demoMode ? (this.demoData || {}) : {};
            this.refreshNotifications();
        }
    },
    methods: {
        refreshNotifications() {
            if (!this.user?.role) {
                this.notifications = [];
                return;
            }

            const derivedEvents = buildBusinessEvents({
                user: this.user,
                snapshot: this.businessSnapshot || {}
            });

            const manualEvents = toList(this.manualBusinessEvents).filter(event => eventMatchesUser(event, this.user));
            const merged = new Map();

            for (const event of [...manualEvents, ...derivedEvents]) {
                merged.set(event.id, {
                    ...event,
                    readAt: this.notificationReads[event.id] || null
                });
            }

            this.notifications = Array.from(merged.values()).sort((left, right) => {
                return Date.parse(right.createdAt) - Date.parse(left.createdAt);
            });
        }
    },
    template: `<App />`,
    components: {
        App: Vue.defineAsyncComponent(() => loadModule('./components/App.vue', options))
    }
});

app.mount('#app');
