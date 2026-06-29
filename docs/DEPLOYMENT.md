# Deployment

## Modelo recomendado

- `app/server.mjs` sirve `website/` y `app/`.
- PocketBase corre como proceso separado.
- Un reverse proxy publica un solo host y mantiene la API same-origin.

## Rutas esperadas

- `/website/` -> web comercial
- `/app/` -> panel operativo
- `/api/` -> PocketBase API
- `/_/` -> PocketBase admin UI

## Baseline

- Web app Node: puerto interno `3033`
- PocketBase: puerto interno `8090`
- Reverse proxy frontal: `80/443`

## Archivos incluidos

- `deploy/nginx.easypoint.conf`
- `deploy/iis-notes.md`

## Pagos (pasarela)

La pasarela se activa con variables de entorno de PocketBase (sin ellas, el
checkout cae a pago manual efectivo/transferencia):

- `PAYMENT_PROVIDER=mercadopago` | `stripe`
- `MERCADOPAGO_ACCESS_TOKEN=...` (Checkout Pro) o `STRIPE_SECRET_KEY=...`
- `EASYPOINT_APP_URL=https://tu-dominio/app/` (back_urls / notification_url)
- `PAYMENT_MANUAL_INSTRUCTIONS=...` (texto para pago manual)

Endpoints: `POST /api/pay/checkout` y webhooks `POST /api/pay/webhook/{mercadopago|stripe}`.

## SPA / deep-links en hosting estático

Para GitHub Pages u hosting estático, `404.html` redirige los deep-links al
index del SPA (`?redirect=`), que los restaura. En el modelo Node/nginx no se usa
(el servidor ya hace fallback a `index.html`). En Apache/cPanel, configura
`ErrorDocument 404 /404.html` si el host no lo sirve por defecto.

## Checklist minimo

- habilitar HTTPS
- proteger admin UI `/_/`
- mover secretos SMTP, OneSignal y de pagos fuera del repo
- configurar `404.html` como error 404 si el host es estático/Apache
- programar backups de `pb/pb_data`
- correr `node scripts/local-stack.mjs smoke` antes de publicar
