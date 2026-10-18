# Demostración y configuración del negocio real

Easypoint corre en **dos entornos aislados** dentro del mismo binario:

| | **Real** | **Demostración** (`/demo`) |
|---|---|---|
| Base de datos | `EP_DB_NAME` (p. ej. `easypoint`) | `EP_DEMO_DB_NAME` (por defecto `<EP_DB_NAME>_demo`) |
| Cómo se entra | Sitio, panel y API normales | `/demo/` con contraseña (por defecto `midemo`, `EP_DEMO_PASSWORD`) |
| Pagos | **Nunca se simulan.** Sin modo de cobro configurado → 503 «pagos no disponibles» | **Siempre simulados** |
| Datos | Los del negocio; nace en blanco | Ficticios (Querétaro), se reinician con un clic |
| Sesiones | Firmadas con `EP_JWT_SECRET` | Firmadas con un secreto derivado: **no valen en el real**, y las reales no valen en la demo |

## Cómo funciona el aislamiento

- `/demo/` pide la contraseña (`POST /api/demo/login`). Si es correcta, el servidor prepara la base demo (esquema + datos) y devuelve un **token de entorno** de 12 h.
- El front guarda ese token y lo manda en la cabecera `X-EP-Demo` en **toda** petición (sitio público y panel). Con la cabecera válida, el servidor usa la base demo; sin ella, la real. Un token inválido o vencido devuelve `401 demo_expired` (nunca cae al real por error).
- La sesión de la demo vive en otra clave del navegador (`ep-session-demo`) y se firma con otro secreto. Una barra «DEMO» (Reiniciar · Cuentas · Salir) recuerda en todo momento dónde estás.
- `POST /api/demo/as {email}` entra con una de las 6 cuentas ficticias sin teclear su contraseña (requiere el token de entorno). `POST /api/demo/reset` vuelve a sembrar los datos.
- Límite de intentos: 6 contraseñas fallidas por IP cada 15 min.
- `EP_DEMO=0` deshabilita por completo la demostración en el servidor (producción cerrada).

> La contraseña de `/demo` es un control de acceso a datos ficticios, no un secreto de seguridad del negocio. Cámbiala (`EP_DEMO_PASSWORD`) si la compartes con terceros.

## Asistente de configuración (entorno real)

Primera vez: abre `/app/` → como la base real no tiene administrador, te lleva a **`/app/#/setup`**. Si el servidor define `EP_SETUP_TOKEN`, el asistente lo pide para crear al primer administrador (evita que un extraño se adelante en un servidor recién publicado). La base en blanco se prepara sola (migra, siembra parámetros, servicios y reglas de precio; **sin datos de ejemplo**).

Pasos (cada uno valida lo que guarda; la lista lateral muestra estado y detalle):

1. **Tu cuenta** — primer administrador (contraseña ≥ 10 caracteres; no se aceptan correos de demostración).
2. **Tu negocio** — nombre comercial, datos fiscales (RFC, régimen, CP) y contacto.
3. **Cómo cobras** *(obligatorio)* — *Transferencia con confirmación* (CLABE validada con su dígito verificador, banco, beneficiario) o *Pasarela Mercado Pago* (token; `MERCADOPAGO_ACCESS_TOKEN` del servidor tiene prioridad). Muestra la URL del webhook a registrar.
4. **Modelo de ingresos** *(obligatorio)* — perfiles **Arranque / Equilibrio / Rentable** + ajustes finos (Protege, Club, pago a proveedor, límites de efectivo, compensación de soporte).
5. **Tu primer punto** *(obligatorio)* — punto + su operador (se crea con contraseña temporal que se muestra **una sola vez**).
6. **Proveedores** · 7. **Equipo** (chofer, soporte, ventas) · 8. **WhatsApp y reseñas** *(obligatorio)* · 9. **Motor** (comandos de cron y botón «ejecutar una vez») · 10. **Revisión** (lista completa, purga de datos de prueba y **Terminar**).

Mientras falte algún paso obligatorio, **Terminar** responde `409 incomplete` y el panel del administrador muestra un aviso en «Hoy».

### API

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `GET /api/setup/status` | público | `schema_ready`, `has_admin`, `completed`, `demo_available`, `token_required` |
| `POST /api/setup/admin` | público, sólo si no hay admin | crea el primer administrador y devuelve su sesión |
| `GET /api/setup/checklist` | admin | pasos, detalle, `ready`, `required_left` |
| `POST /api/setup/business · payments · params · point · provider · user · channels` | admin | guardan cada paso |
| `POST /api/setup/finish` | admin | cierra la configuración (exige los obligatorios) |
| `POST /api/setup/purge-demo {confirm}` | admin | vacía lo operativo de la base **real** (frase exacta «BORRAR DATOS DE PRUEBA»); conserva tu cuenta, configuración, servicios y reglas |

Reglas de seguridad: parámetros en bloque sólo de los grupos del negocio (`policy./pricing./club./…`); `secret.*`, `sys.*`, `setup.*` y `biz.*` no se exponen en `/api/public/config`; la CLABE no aparece en la lista ni en la configuración pública (sólo se entrega en la respuesta de la reserva por transferencia).

## Despliegue

1. Crea **dos** bases MySQL y da permisos al mismo usuario sobre ambas (en cPanel: «MySQL® Databases» → agrega el usuario a las dos).
2. Variables (archivo `easypoint.env`): `EP_DB_NAME`, `EP_DEMO_DB_NAME` (opcional), `EP_DEMO_PASSWORD`, `EP_SETUP_TOKEN` (recomendado en el primer arranque), `EP_JWT_SECRET`, `MERCADOPAGO_ACCESS_TOKEN` (si usas pasarela).
3. Publica: el shim PHP y `nginx`/`.htaccess` ya reenvían `X-EP-Demo`, sirven `/demo/` (sin indexar) y la API.
4. Abre `/app/` y completa el asistente. Programa el cron (`--tick` cada 5 min, `--tick-full` cada hora) y confirma en el paso «Motor» que corrió.
5. Si no quieres demo en producción: `EP_DEMO=0`.

CLI útil: `ep --seed` (esquema y parámetros de la base real, sin demo) · `ep --seed-demo` (siembra **sólo** la base demo; jamás la real).

## Pruebas

`node scripts/dev.mjs --reset` deja la real en blanco y la demo sembrada. `tests/e2e_v2.mjs` y `tests/e2e_engine.mjs` corren **dentro de la demo** (cabecera `X-EP-Demo`, SQL contra la base demo). `tests/e2e_setup.mjs` cubre la contraseña de `/demo`, el aislamiento en ambos sentidos y el recorrido completo del asistente sobre la base real en blanco.
