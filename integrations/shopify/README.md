# Integración con Shopify

Puente de referencia (Node/Express) sobre la **API v1** de Easypoint.

| Endpoint de Easypoint | Uso |
|---|---|
| `GET  /api/v1/points` | Lista de puntos para el selector del checkout |
| `POST /api/v1/shipments` | Alta del envío cuando el pedido se paga (idempotente: `409` si ya existe) |
| `GET  /api/v1/track/<id>` | Rastreo |

Todas requieren `X-API-Key: epk_…`, que genera el administrador en **Administración → Socios API** (se muestra una sola vez).

## Pasos
1. `shopify app init` y usa `server.js` como backend.
2. Registra un *Carrier Service* que apunte a `POST /shipping/rates`.
3. Suscribe el webhook `orders/paid` a `POST /webhooks/order_paid`.
4. Variables: `EASYPOINT_API`, `EASYPOINT_API_KEY`, `EASYPOINT_RATE_CENTS`.
5. En el checkout guarda el punto elegido como atributo de pedido `easypoint_id` (la extensión de UI puede usar `GET /points`).

El cliente final recibe avisos por WhatsApp/correo cuando el paquete llega al punto y lo rastrea en `/website/#/rastreo`.
