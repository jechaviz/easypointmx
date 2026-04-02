export const demoData = {
  shipments: [
    { id: 'mock1', tracking_id: 'EP-9921-X', recipient_name: 'Alejandro Ruiz', status: 'at_point', created: '2026-03-25T10:00:00Z', updated: '2026-03-26T09:00:00Z', expand: { point_id: { name: 'Punto Roma Norte' } } },
    { id: 'mock2', tracking_id: 'EP-1045-A', recipient_name: 'Beatriz Solis', status: 'delivered', created: '2026-03-24T14:30:00Z', updated: '2026-03-25T11:20:00Z', expand: { point_id: { name: 'Punto Condesa' } } },
    { id: 'mock3', tracking_id: 'EP-5567-B', recipient_name: 'Carlos Mendez', status: 'in_transit', created: '2026-03-26T08:15:00Z', updated: '2026-03-26T12:00:00Z', expand: { point_id: { name: 'Punto Polanco' } } },
    { id: 'mock4', tracking_id: 'EP-8832-C', recipient_name: 'Diana Flores', status: 'pending', created: '2026-03-26T15:00:00Z', updated: '2026-03-26T15:00:00Z', expand: { point_id: { name: 'Punto Santa Fe' } } },
    { id: 'mock5', tracking_id: 'EP-2210-M', recipient_name: 'Eduardo Vega', status: 'at_point', created: '2026-03-25T11:00:00Z', updated: '2026-03-26T10:30:00Z', expand: { point_id: { name: 'Punto Roma Norte' } } }
  ],
  points: [
    { id: 'p1', name: 'Punto Roma Norte', address: 'Av. Álvaro Obregón 154, Roma Norte', whatsapp: '5512345678', horarios: 'Lun-Vie 9am-8pm, Sab 10am-2pm', status: 'active' },
    { id: 'p2', name: 'Punto Condesa', address: 'Amsterdam 123, Hipódromo Condesa', whatsapp: '5587654321', horarios: 'Lun-Dom 10am-9pm', status: 'active' },
    { id: 'p3', name: 'Punto Polanco', address: 'Moliere 330, Polanco III Secc', whatsapp: '5599887766', horarios: 'Lun-Vie 8am-7pm', status: 'active' }
  ],
  users: [
    { id: 'u1', full_name: 'Admin Demo', email: 'admin@demo.mx', role: 'admin', verified: true },
    { id: 'u2', full_name: 'Roberto Operador', email: 'roberto@punto.mx', role: 'operator', verified: true },
    { id: 'u3', full_name: 'Sofía Logística', email: 'sofia@punto.mx', role: 'operator', verified: false }
  ],
  commissions: [
    { id: 'c1', point_name: 'Punto Roma Norte', period: '2026-03', packages_handled: 45, total: 382.50, status: 'pending' },
    { id: 'c2', point_name: 'Punto Condesa', period: '2026-03', packages_handled: 120, total: 1020.00, status: 'paid' },
    { id: 'c3', point_name: 'Punto Polanco', period: '2026-03', packages_handled: 12, total: 102.00, status: 'pending' }
  ],
  invoices: [
    { id: 'i1', number: 'EP-2026-001', client_name: 'Shiply México S.A.', client_rfc: 'SHI123456ABC', period: '2026-03', subtotal: 5000, tax: 800, total: 5800, status: 'paid', items: [{ concept: 'Servicios Logísticos Feb', qty: 100, unit_price: 50, total: 5000 }] },
    { id: 'i2', number: 'EP-2026-002', client_name: 'Tienda Nube MX', client_rfc: 'TNU987654XYZ', period: '2026-03', subtotal: 1200, tax: 192, total: 1392, status: 'sent', items: [{ concept: 'Manejo de Devoluciones', qty: 24, unit_price: 50, total: 1200 }] }
  ]
};
