# Easypoint v2

**Tu ciudad, a un punto de distancia.** Red de puntos (negocios de barrio) para recibir y enviar paquetes, vender guías DHL/Estafeta, ofrecer servicios y **reservar excursiones con apartado**, con un motor de automatización que le da a cada actor su lista de “qué hacer ahora”.

* **Backend:** V → C (un binario CGI) + shim PHP + **MySQL/MariaDB**. Sin Node, sin PocketBase.
* **Frontend:** Vue 3 sin build (SFC compilados en el navegador), sistema de diseño propio claro/oscuro, PWA instalable.
* **Librerías compartidas** (`C:\git\websites\lib`) vendorizadas en `vendor/`.

| Documento | Contenido |
|---|---|
| [docs/ACTORES_Y_PIPELINES.md](docs/ACTORES_Y_PIPELINES.md) | Cada actor, su pipeline y qué se automatiza |
| [docs/ESCENARIOS.md](docs/ESCENARIOS.md) | Escenarios límite cubiertos y la prueba que los respalda |
| [docs/MODELO_DE_NEGOCIO.md](docs/MODELO_DE_NEGOCIO.md) | Líneas de ingreso, economía unitaria, palancas y riesgos |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Stack, carpetas, concurrencia, seguridad, librerías |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | Puesta en producción en cPanel/Spaceship, cron, respaldos |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Operación diaria y respuesta a incidentes |
| [docs/DESIGN_PRINCIPLES.md](docs/DESIGN_PRINCIPLES.md) | Principios de producto y diseño |

## Superficies
* **Sitio público** `/website/` — inicio con la red animada, excursiones con cotizador en vivo, voucher con QR y autoservicio (pagar, cambiar fecha, cancelar, calificar), envíos con comparador, rastreo, mapa de puntos, Club, afiliación (puntos, proveedores, e-commerce/API), ayuda y legal.
* **Panel de trabajo** `/app/` — un **Hoy** por rol (admin, punto, chofer, proveedor, ventas, soporte) más sus herramientas: cobrar abono (con QR), vender servicios y guías, recolectar con ruta optimizada, manifiesto y check-in, liquidaciones, tablero de reservas, CRM, economía unitaria, efectivo, tickets con SLA, planificador de campañas, bandeja de WhatsApp de un clic, riesgo y parámetros del negocio.
* **API** `/api/*` — pública, por rol (JWT) y para socios e-commerce (`X-API-Key`).

## Arranque local (Windows)
```bash
# 1) MariaDB local y variables (ver docs/DESPLIEGUE.md §9)
# 2) compilar y levantar
C:\git\v\v.exe -o .data/ep.exe server
.data/ep.exe --migrate && .data/ep.exe --seed-demo
.data/ep.exe --serve 8081          # http://127.0.0.1:8081/website/  y  /app/
```
Cuentas demo: `admin@`, `soporte@`, `ventas@`, `chofer@`, `punto@`, `proveedor@easypoint.mx` · `Demo12345!`.

## Pruebas
```bash
node scripts/check.mjs        # sin base de datos: DDL, deriva de vendor/, contrato del front, compilación y autoprueba
node tests/e2e_v2.mjs         # flujos de todos los actores               (MySQL real, 115 casos)
node tests/e2e_engine.mjs     # motor de automatización y escenarios límite (50 casos)
node scripts/dev.mjs          # entorno local completo en un comando
```

## Estructura
```
server/    API y motor en V, esquema SQL, shim.php, .htaccess, build.sh
shared/    ep-ui.css · ep-core.js · ep-art.js · ui/*.vue
website/   sitio público        app/   panel por rol
vendor/    copias de ../lib     scripts/sync-lib.mjs
tests/     e2e + auditoría      docs/  documentación
```
