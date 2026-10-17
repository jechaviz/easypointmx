// Puente Shopify <-> Easypoint (API v1). Node/Express.
//   EASYPOINT_API        https://easypoint.mx/api
//   EASYPOINT_API_KEY    epk_... (Administración -> Socios API)
//   EASYPOINT_RATE_CENTS tarifa fija en centavos (default 5900 = $59.00 MXN)
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const API = (process.env.EASYPOINT_API || 'https://easypoint.mx/api').replace(/\/$/, '');
const API_KEY = process.env.EASYPOINT_API_KEY;
const RATE_CENTS = process.env.EASYPOINT_RATE_CENTS || '5900';
const http = axios.create({ baseURL: API, timeout: 12000, headers: { 'X-API-Key': API_KEY || '' } });
if (!API_KEY) console.warn('[easypoint] EASYPOINT_API_KEY no está configurado: el alta de envíos fallará.');

// 1) Carrier Service: Shopify pide tarifas de envío
app.post('/shipping/rates', (req, res) => {
  const { destination } = req.body.rate;
  if (destination.country !== 'MX') return res.json({ rates: [] });
  res.json({ rates: [{ service_name: 'Recoger en un punto Easypoint', service_code: 'easypoint_ooh', total_price: RATE_CENTS, currency: 'MXN', description: 'Entrega en un local seguro cerca de ti.' }] });
});

// 2) Lista de puntos para el selector del checkout (extensión de UI)
app.get('/points', async (_req, res) => {
  try { res.json((await http.get('/v1/points')).data); } catch (e) { res.status(502).json({ error: 'easypoint_unavailable' }); }
});

// 3) Pedido pagado -> alta del envío en Easypoint (idempotente: 409 = ya existe)
app.post('/webhooks/order_paid', async (req, res) => {
  const order = req.body;
  const line = (order.shipping_lines || []).find((l) => l.code === 'easypoint_ooh');
  if (!line) return res.sendStatus(200);
  const pointId = (order.note_attributes || []).find((a) => a.name === 'easypoint_id')?.value;
  const ship = order.shipping_address || {};
  try {
    await http.post('/v1/shipments', {
      tracking_id: `SH${order.order_number}`, point_id: Number(pointId),
      recipient_name: `${ship.first_name || ''} ${ship.last_name || ''}`.trim(), recipient_phone: ship.phone || order.phone || '',
      recipient_email: order.email || '', carrier: 'shopify'
    });
    console.log(`Envío creado para el pedido #${order.order_number}`);
  } catch (e) {
    if (e.response?.status !== 409) { console.error('Error creando el envío:', e.response?.data || e.message); return res.sendStatus(500); } // 500: Shopify reintenta
  }
  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => console.log('Puente Easypoint <-> Shopify listo'));
