# Easypoint

Easypoint es una aplicacion web sin build-step que combina:

- `website/`: sitio comercial, captación y portal de autoservicio de vouchers con pagos de abonos.
- `app/`: panel operativo para admin, locales, choferes, ventas y proveedores de experiencias.
- `pb/`: backend PocketBase local con hooks, migraciones y liquidaciones automáticas.
- `tests/`: smoke tests HTTP/API.

## Stack

- Frontend: Vue 3 + `vue3-sfc-loader` desde CDN.
- Servidor web: `app/server.mjs` para servir sitio y app.
- Backend: PocketBase embebido en `pb/`.
- Automatizacion local: `scripts/local-stack.mjs`.

## Estructura

- `app/`: app operativa y servidor web.
- `website/`: landing y formularios publicos.
- `pb/`: PocketBase, migraciones y hooks.
- `scripts/`: automatizacion local y smoke orchestration.
- `docs/`: runbooks y roadmap de profesionalizacion.
- `runtime-config.js`: configuracion publica base.
- `runtime-config.local.example.js`: ejemplo de override local.
- `runtime-config.generated.js`: runtime config generada para desarrollo local.

## Inicio Rapido

Requisitos:

- Node.js 24+
- Windows con `pb/pocketbase.exe` disponible. El binario ya no se versiona: descargalo de
  [pocketbase.io/docs](https://pocketbase.io/docs) y colocalo en `pb/pocketbase.exe`
  (o exporta `POCKETBASE_BIN` apuntando a tu binario).

Levantar stack local recomendado:

```powershell
node scripts/local-stack.mjs serve
```

Eso hace lo siguiente:

- inicia PocketBase en `127.0.0.1:8091`
- inicia la web en `http://127.0.0.1:3041`
- expone PocketBase via proxy same-origin en la web
- escribe `runtime-config.generated.js` para apuntar el frontend al mismo host web

URLs locales:

- Sitio: `http://127.0.0.1:3041/website/`
- App: `http://127.0.0.1:3041/app/`
- Alias historico: `http://127.0.0.1:3041/easypoint/`
- Health web: `http://127.0.0.1:3041/health`
- Health PocketBase: `http://127.0.0.1:8091/api/health`
- API same-origin: `http://127.0.0.1:3041/api/health`

## Smoke Test

Ejecutar verificacion end-to-end con stack temporal:

```powershell
node scripts/local-stack.mjs smoke
```

Tambien puedes correr el smoke test manualmente si ya tienes ambos servicios arriba:

```powershell
$env:WEB_URL='http://127.0.0.1:3041/easypoint'
$env:PB_API='http://127.0.0.1:8091/api'
node tests/api_e2e.mjs
```

## Configuracion

Orden de carga de runtime config:

1. `runtime-config.js`
2. `runtime-config.generated.js`
3. `runtime-config.local.js`

Uso recomendado:

- `runtime-config.js`: defaults versionados.
- `runtime-config.generated.js`: generado por automatizacion local.
- `runtime-config.local.js`: override manual no versionado.
- Default recomendado: `pocketBaseUrl = window.location.origin` para usar proxy same-origin.

Plantilla:

```powershell
Copy-Item runtime-config.local.example.js runtime-config.local.js
```

## Flujo Operativo

- Usa `node scripts/local-stack.mjs serve` para desarrollo local consistente.
- Usa `node scripts/local-stack.mjs smoke` antes de publicar cambios.
- Manten `runtime-config.local.js` fuera de git.
- No edites `pb/pb_data/data.db` manualmente; usa migraciones o scripts.

## Migración a MySQL 8.x / MariaDB

EasyPoint incluye herramientas integradas para migrar esquemas y datos desde PocketBase (SQLite) a cualquier servidor MySQL o MariaDB (AWS RDS, GCP Cloud SQL, PlanetScale, cPanel o local):

1. **Esquema Relacional DDL**: [`deploy/easypoint_mysql_schema.sql`](./deploy/easypoint_mysql_schema.sql)
   - Contiene la definición DDL con tipos nativos (`VARCHAR`, `DATETIME(3)`, `DECIMAL(12,2)`, `TINYINT(1)`, `JSON`), claves primarias, índices y restricciones para las 20 colecciones operativas y tablas de administración.

2. **Generador de Dump Completo**:
   ```bash
   node scripts/pb-to-mysql.mjs
   ```
   - Extrae los datos actuales de `pb/pb_data/data.db` y genera [`deploy/easypoint_mysql_dump.sql`](./deploy/easypoint_mysql_dump.sql) con sentencias `INSERT` idempotentes (`ON DUPLICATE KEY UPDATE`).

3. **Importación a Servidor MySQL**:
   ```bash
   mysql -h <host> -u <usuario> -p <base_de_datos> < deploy/easypoint_mysql_dump.sql
   ```

4. **Verificación de Integridad SQLite**:
   ```bash
   node scripts/pb-to-mysql.mjs --check
   ```

## Documentacion

- [Plan de profesionalizacion](./docs/PROFESSIONALIZATION_PLAN.md)
- [Design principles](./docs/DESIGN_PRINCIPLES.md)
- [Runbook operativo](./docs/RUNBOOK.md)
- [Backups](./docs/BACKUPS.md)
- [Seeds](./docs/SEEDS.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Schema checks](./docs/SCHEMA_CHECKS.md)
- [Release checklist](./docs/RELEASE_CHECKLIST.md)
- [Security notes](./docs/SECURITY_NOTES.md)
