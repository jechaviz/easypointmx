# Arquitectura

```
Navegador (Vue 3 sin build, SFC compilados en el navegador)
   │  GET /website/*  /app/*  /shared/*  /vendor/*      (estáticos, Apache)
   │  /api/*  ───────────────────────────────────────┐
   ▼                                                  ▼
Apache (.htaccess)                         shim.php  (único PHP; sin lógica)
                                                      │ proc_open + variables CGI + secretos de un .env fuera del docroot
                                                      ▼
                                       easypoint  (binario nativo: V → C → gcc)
                                                      │ cliente `mariadb` del host (sin libmysqlclient)
                                                      ▼
                                              MySQL / MariaDB
cron del servidor ── `easypoint --tick` (cada minuto) / `--tick-full` (cada 10) ──▶ mismo binario
```

## Por qué este stack
* **Un solo archivo ejecutable** + un shim de 70 líneas: mínimo despliegue, sin Node, sin PocketBase, sin runtime en el servidor. Es el patrón ya probado en `electroprice` y `realstate` (mismo shim, mismo `build.sh`).
* **MySQL real** con DDL relacional (`server/schema/*.sql`): `DECIMAL(12,2)` para dinero, índices, `GET_LOCK` para cupo, transacciones.
* **El C transpilado compila con gcc en el servidor** (`-std=gnu11`), verificado en Linux; no hace falta V ahí.
* **Sin estado entre peticiones** (CGI): la sesión es un JWT HS256, el límite de tasa vive en la base, y el motor corre por cron.

## Carpetas
| Ruta | Qué es |
|---|---|
| `server/*.v` | API y motor en V. `db.v` (cliente MySQL y CRUD guiado por esquema), `kernel.v` (eventos, tareas, bandeja, CRM, monedero, cotizador), `booking.v` (reservas y pagos), `public.v`, `crud.v` (recursos con rol y alcance), `flows_*.v`, `engine.v`, `ops.v`, `seed.v`, `router.v` |
| `server/schema/` | Migraciones (`001_core.sql`, `002_fixes.sql`); el DDL es la fuente de verdad: de él se deducen tipos para JSON y literales SQL |
| `server/deploy/` | `shim.php`, `.htaccess`, `dev-router.php` |
| `server/build.sh` | Transpila a C portable (`dist/`) |
| `shared/` | Sistema de diseño (`ep-ui.css`), núcleo (`ep-core.js`), arte generativo (`ep-art.js`), componentes (`ui/*.vue`) |
| `website/` | Sitio público (cliente) |
| `app/` | Panel de trabajo por rol |
| `vendor/` | Copias versionadas de `../lib` (ver abajo) |
| `scripts/sync-lib.mjs` | Sincroniza y verifica la deriva de `vendor/` |
| `tests/` | `e2e_v2.mjs` (flujos), `e2e_engine.mjs` (motor y escenarios), `site_audit.mjs` (contrato del front) |

## Datos y tipos
El servidor parsea su propio DDL al iniciar. Convención: un nombre de columna implica un tipo en toda la base; los alias calculados usan `n_` (número) o `b_` (booleano). Esto elimina un ORM y mantiene JSON con tipos correctos. Las escrituras filtran columnas desconocidas y escapan cada valor según su tipo.

## Concurrencia y dinero
* **Cupo:** `SELECT GET_LOCK(...)`, `INSERT … SELECT … WHERE (SUM(personas)+N <= cupo)`, `RELEASE_LOCK` en una sola invocación del cliente (una conexión).
* **Abonos:** `apply_payment` es el único camino: `UPDATE bookings SET amount_paid = amount_paid + A … WHERE … AND amount_paid + A <= total` y el asiento del libro se inserta sólo si el UPDATE afectó una fila.
* **Monedero:** `INSERT … ON DUPLICATE KEY UPDATE balance = balance + x` y asiento con el saldo resultante; el consumo es un `UPDATE … WHERE balance >= x`.
* **Idempotencia del motor:** cada tarea, mensaje, bandera y job lleva `dedupe_key`; el tick precarga las claves en memoria (una consulta por tabla).

## Seguridad
* JWT firmado + usuario re-leído en cada petición (baja inmediata). `bcrypt` para contraseñas.
* RBAC por recurso y **alcance** (operador → su punto; proveedor → sus excursiones/salidas/liquidaciones). La lógica de dinero (comisión, neto, totales, fee) se recalcula **siempre en el servidor**.
* Límite de tasa por IP y por cuenta en login, reservas, pagos, tickets y consultas de voucher; honeypot y tiempo mínimo en formularios públicos.
* El voucher se opera con **token** (sólo llega por enlace/QR del cliente); la búsqueda por código solo muestra datos mínimos.
* Los secretos viven en un archivo fuera del docroot que el shim inyecta; el binario nunca los escribe.
* `recover_value` convierte un fallo de un handler en un 500 sin tumbar el proceso.

## Librerías compartidas (`C:\git\websites\lib`)
| Librería | Dónde se usa |
|---|---|
| `growth-kit` (JS) | Atribución UTM (`captureAttribution` en cada visita → se guarda en reservas/solicitudes), enlaces WhatsApp (`waLink`) en todo el sitio y panel, `shareIntent` en el voucher, **planificador de campañas** (`buildCampaignPlan`, `validatePlan`, `toCsv/toIcs/toMarkdown`) |
| `web-ui` (Vue) | `FAQ`, `Testimonials`, `AudiencePaths` en el sitio público |
| `web-common` | Almacenamiento versionado/seguro (sesión, reservas del dispositivo), `syncDocumentMeta` por ruta, `safeInternalPath` |
| `procurement-common` | `rankQuotes`: compara DHL/Estafeta × estándar/express con pesos según “qué te importa” |
| `erp/ui/vendor/qrcode.js` | QR reales del voucher y de los folios |
| `site-audit-core` | Auditoría de contrato del front (`tests/site_audit.mjs`) |
| `erp` (PHP: billing/CFDI, payments, crm, mail) | Disponible para el siguiente paso fiscal (CFDI de comisiones); hoy no se despliega |
| `pocketbase-mysql-translator` | **No aplica**: no hay PocketBase |

`scripts/sync-lib.mjs` copia los archivos y escribe `vendor/MANIFEST.json` con el origen y hash; `--check` falla si `lib/` cambió y `vendor/` no (prueba de deriva), igual que en `appniverse`.

## Pruebas
* `node tests/e2e_v2.mjs` — 115 casos de flujos de cliente, punto, chofer, proveedor y admin contra MySQL real.
* `node tests/e2e_engine.mjs` — 50 casos de motor y escenarios límite (`docs/ESCENARIOS.md`).
* `node tests/site_audit.mjs` — estructura del front y deriva de `vendor/`.
* Las pruebas viajan en el tiempo con SQL directo (fechas de reservas, `created_at`, `sla_due`) para ejercitar el motor sin esperar.
