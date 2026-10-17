# Despliegue (Spaceship cPanel · MySQL)

Mismo patrón que `electroprice` y `realstate`: **un binario nativo + un shim PHP + MySQL**. En el servidor no hace falta V, Node ni PocketBase: sólo `gcc` (para compilar el C una vez), `php`, el cliente `mariadb`/`mysql` y MySQL.

## 0. Antes de empezar
| Requisito en el servidor | Para qué |
|---|---|
| MySQL/MariaDB (cPanel → *MySQL Databases*) | Datos |
| `gcc` | Compilar `easypoint.c` (una vez por versión) |
| `php` ≥ 8 | Ejecutar `shim.php` |
| cliente `mariadb` o `mysql` en `PATH` | El binario consulta por el cliente del host (`EP_MARIADB_BIN`) |
| `sendmail` (opcional) | Correos; sin él los mensajes quedan “omitidos” y WhatsApp va en la bandeja manual |

## 1. Base de datos y secretos
1. Crea la base y un usuario con todos los permisos sobre ella.
2. Crea el archivo de secretos **fuera del docroot** (`chmod 600`), p. ej. `~/apps/easypoint/shared/env/easypoint.env`:

```
EP_DB_HOST=127.0.0.1
EP_DB_PORT=3306
EP_DB_NAME=usuario_easypoint
EP_DB_USER=usuario_ep
EP_DB_PASS=********
EP_MARIADB_BIN=/usr/bin/mariadb          # o /usr/bin/mysql
EP_JWT_SECRET=<64+ caracteres aleatorios>
EP_BCRYPT_COST=10
EASYPOINT_APP_URL=https://easypoint.mx   # base de los enlaces de voucher
# EP_BASE_PATH=/easypoint                # sólo si vive en un subdirectorio
# MERCADOPAGO_ACCESS_TOKEN=...           # sólo con payments.mode=gateway
# WHATSAPP_API_URL=... / WHATSAPP_API_TOKEN=...   # WhatsApp Cloud API (opcional)
# EP_MAIL=sendmail|off
```

## 2. Compilar el binario
En tu máquina (Windows, con el V del fork):

```bash
bash server/build.sh        # genera server/dist/easypoint.c + cabeceras vendorizadas
scp server/dist/* usuario@servidor:~/apps/easypoint/build/
```

En el servidor:

```bash
cd ~/apps/easypoint/build
gcc -w -O2 -std=gnu11 easypoint.c -o easypoint -lpthread -lm
mkdir -p ../shared/bin && [ -f ../shared/bin/easypoint ] && cp ../shared/bin/easypoint ../shared/bin/easypoint.prev
install -m 755 easypoint ../shared/bin/easypoint
```

> El C transpilado se verificó con gcc en Linux (Kali/WSL): ELF de ~1.2 MB que responde el protocolo CGI contra MySQL. `build.sh` primero regenera `server/schema_gen.v` desde `server/schema/*.sql`. Diagnóstico en el servidor: `easypoint --selftest`.

## 3. Esquema, parámetros y primer administrador
```bash
export EP_ENV_FILE=~/apps/easypoint/shared/env/easypoint.env
~/apps/easypoint/shared/bin/easypoint --migrate           # esquema (idempotente)
~/apps/easypoint/shared/bin/easypoint --seed              # parámetros del negocio + catálogo de servicios + reglas base
~/apps/easypoint/shared/bin/easypoint --make-admin tu@correo.mx   # imprime la clave una vez
# solo para demos: ~/apps/easypoint/shared/bin/easypoint --seed-demo
```

## 4. Sitio y shim
Sube al docroot (`public_html/` o el subdirectorio):

```
website/  app/  shared/  vendor/  img/  runtime-config.js
shim.php   .htaccess      ← de server/deploy/
```

Edita en `shim.php` (o exporta en el entorno de PHP) `EP_BIN` y `EP_ENV_FILE` si tus rutas difieren. El `.htaccess` ya enruta `/api/*` al shim y hace que las rutas de `/website` y `/app` caigan a su `index.html`. **No subas** `server/`, `tests/`, `docs/` ni `.env`.

Verifica: `curl https://easypoint.mx/api/health` → `{"ok":true,…}`.

## 5. Cron (motor de automatización)
```
* * * * *   EP_ENV_FILE=$HOME/apps/easypoint/shared/env/easypoint.env $HOME/apps/easypoint/shared/bin/easypoint --tick       >/dev/null 2>&1
*/10 * * * * EP_ENV_FILE=$HOME/apps/easypoint/shared/env/easypoint.env $HOME/apps/easypoint/shared/bin/easypoint --tick-full >/dev/null 2>&1
```
`--tick` entrega la bandeja de salida y los trabajos diferidos; `--tick-full` además corre todas las revisiones (vencimientos, recordatorios, tareas, riesgo). Son idempotentes: si se empalman o fallan una vez, no pasa nada.

## 6. Pasarela de pago y modos
`payments.mode` (en **Automatización → Pagos**):
* `demo` — pago simulado inmediato (sólo para demostraciones; **no usar en producción**).
* `gateway` — Mercado Pago: se crea la preferencia por `curl` y el webhook `POST /api/webhooks/mercadopago` aplica el pago (idempotente por `gateway_ref`). Requiere `MERCADOPAGO_ACCESS_TOKEN` y una URL pública para el webhook.
* `manual_confirm` — transferencia: se genera una referencia y una tarea al admin, que confirma el depósito.

## 7. Respaldos
```bash
# diario (cron): volcado comprimido, 14 días
mysqldump --single-transaction -h127.0.0.1 -u"$EP_DB_USER" -p"$EP_DB_PASS" "$EP_DB_NAME" | gzip > ~/backups/easypoint-$(date +%F).sql.gz
find ~/backups -name 'easypoint-*.sql.gz' -mtime +14 -delete
# restaurar
gunzip -c ~/backups/easypoint-AAAA-MM-DD.sql.gz | mysql -u"$EP_DB_USER" -p"$EP_DB_PASS" "$EP_DB_NAME"
```

## 8. Actualizar y revertir
* **Sólo frontend:** copia los archivos cambiados (no hay build). Sube `assetVersion` en `runtime-config.js` para invalidar cachés.
* **Backend:** repite el paso 2; `--migrate` aplica migraciones nuevas. Para revertir: `cp shared/bin/easypoint.prev shared/bin/easypoint`.
* **Antes de cada versión:** `node tests/site_audit.mjs`, `node tests/e2e_v2.mjs`, `node tests/e2e_engine.mjs` contra una base de pruebas.

## 9. Desarrollo local (Windows)
```bash
# MariaDB local (una vez): mariadb-install-db --datadir=.data/mysql ; mariadbd --datadir=.data/mysql --port=3307
# crear base/usuario, exportar EP_DB_* y EP_JWT_SECRET (ver .data/env.sh), y:
C:\git\v\v.exe -o .data/ep.exe server
.data/ep.exe --migrate && .data/ep.exe --seed-demo
.data/ep.exe --serve 8081                       # API + sitio en http://127.0.0.1:8081/website/ y /app/
# cadena real de producción (PHP → shim → binario):
php -S 127.0.0.1:8090 -t . server/deploy/dev-router.php
```
Cuentas demo: `admin@`, `soporte@`, `ventas@`, `chofer@`, `punto@`, `proveedor@easypoint.mx` / `Demo12345!`.

## 10. Problemas comunes
| Síntoma | Causa y solución |
|---|---|
| `/api/*` responde 502 “Binario no disponible” | `EP_BIN` incorrecto o sin `chmod +x` |
| 500 “config” | Falta `EP_JWT_SECRET` en el archivo de secretos |
| Errores SQL en el log del shim | Ver líneas `[db-error]` en el log de errores de PHP; revisa `EP_MARIADB_BIN` y permisos |
| Los correos no salen | No hay `sendmail`; los mensajes quedan `skipped`. Usa la bandeja manual o configura SMTP del host |
| `gcc` falla con `bool` | Falta `-std=gnu11` en gcc ≥ 15 |
