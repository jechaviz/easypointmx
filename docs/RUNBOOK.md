# Runbook de operación

## Rutina diaria (10 minutos, el admin)
1. **Hoy** (admin): lo urgente aparece arriba. Las tareas urgentes son las únicas que no pueden esperar al día siguiente.
2. **Bandeja** → *Enviar siguiente*: cada clic abre el chat de WhatsApp con el texto listo (si no hay API de WhatsApp conectada). Cero si todo va por API.
3. **Efectivo**: puntos con efectivo viejo, choferes sobre su límite y transferencias por confirmar.
4. **Riesgo**: revisa y marca las banderas abiertas (efectivo grande/estancado, reservas sospechosas, SLA vencido, topes de premios).
5. **Liquidaciones**: paga las pendientes con más de 2 días y márcalas como pagadas.

## Qué hace solo el motor (no hay que vigilarlo)
Vence reservas a crédito, recuerda pagos, avisa de créditos por vencer, pide reseñas, genera tareas por rol, escala tickets fuera de SLA, vigila efectivo y riesgo, recupera clientes dormidos. Corre cada minuto (`--tick`) y cada 10 (`--tick-full`). Puedes forzarlo en **Hoy → Ejecutar motor** o **Automatización → Ejecutar ahora**: es idempotente.

## Cambiar el negocio sin tocar código
**Automatización → Parámetros**: vigencia del crédito, plazo de pago, % de Protege, Club, referidos, límites de efectivo, SLA, modo de pago… Cada cambio queda en la bitácora de auditoría.

| Quiero… | Parámetro |
|---|---|
| Activar precio dinámico | `pricing.dynamic_enabled` = activado (+ revisar *Precios y promos*) |
| Una promo de lanzamiento | *Precios y promos* → código promocional con tope de usos |
| Dar más tiempo para pagar | `policy.payment_deadline_days` (o `cutoff_days` por excursión) |
| Cancelar solo salidas bajo el mínimo | `ops.auto_cancel_under_min` |
| Pasar a cobrar en línea | `payments.mode = gateway` (y `MERCADOPAGO_ACCESS_TOKEN` en el entorno) |

## Incidentes
| Situación | Qué hacer |
|---|---|
| **Sitio carga pero `/api` falla** | `curl /api/health`. 502 → revisa `EP_BIN` y permisos del binario; 500 “config” → falta `EP_JWT_SECRET`. Mira el log de errores de PHP (`[easypoint]`, `[db-error]`) |
| **MySQL caído** | La API responde 5xx; el sitio estático sigue. Los clientes ven errores claros. Al volver, el motor se pone al día solo |
| **Despliegue malo** | `cp shared/bin/easypoint.prev shared/bin/easypoint` (30 s). El esquema sólo crece, así que el binario anterior sigue funcionando |
| **Pasarela caída** | Cambia `payments.mode = manual_confirm`: los clientes reciben referencia y tú confirmas depósitos desde *Efectivo* |
| **Correo/WhatsApp no salen** | Los mensajes quedan en *Bandeja* (`manual`/`failed`); se envían a mano con un clic y se marcan |
| **Sospecha de fuga de la clave JWT** | Cambia `EP_JWT_SECRET` → todas las sesiones se cierran. Cambia también la contraseña de la base |
| **Un chofer perdió efectivo** | *Efectivo* muestra lo que traía por folio; el libro y la bitácora dan el rastro. Ajusta con una nota en la liquidación |
| **Punto problemático** | *Administración → Puntos* → desactívalo (`Activo` apagado): deja de aparecer en el sitio y en rutas nuevas |
| **Restaurar la base** | Ver *Respaldos* en `DESPLIEGUE.md` |
| **Un cliente reclama un cobro** | *Reservas* → detalle muestra línea de tiempo (quién y cuándo); *Efectivo → Libro de pagos* muestra cada asiento con su estado |

## Altas y bajas
* **Nuevo punto**: *Aspirantes* → Aprobar (crea punto + usuario operador + correo de bienvenida con clave temporal) o *Administración → Puntos/Usuarios*.
* **Nuevo proveedor**: *Administración → Proveedores* (fee y datos de pago) y *Usuarios* con rol Proveedor ligado al proveedor.
* **Nuevo chofer**: *Usuarios* → rol Chofer.
* **Socio e-commerce**: *Socios API* → la llave se muestra una sola vez; compártela por un canal seguro.

## Datos y privacidad
* El número de tarjeta nunca toca el sistema (lo procesa la pasarela).
* El **voucher** se abre con token; sin token sólo se ve lo mínimo.
* Exportar a CSV desde las tablas es la vía para reportes; no hay acceso directo a la base para el personal.
* Solicitudes ARCO: se atienden desde *Ayuda* (ticket); borra o anonimiza en `customers`, `bookings` y `wallets` por teléfono.
