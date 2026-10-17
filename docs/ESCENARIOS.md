# Escenarios cubiertos

Cada fila es un caso que el sistema resuelve **sin intervención humana** o con una sola decisión. “Prueba” apunta al caso de e2e (`tests/e2e_v2.mjs`, `tests/e2e_engine.mjs`) que lo demuestra contra MySQL real.

## Reservas y cupo

| # | Escenario | Respuesta del sistema | Prueba |
|---|---|---|---|
| R1 | Nombre vacío, contacto inválido, excursión inexistente | 400/404 con mensaje claro | Reserva sin nombre / excursión inexistente |
| R2 | Fecha pasada o no publicada por el proveedor | 400; sólo salidas abiertas aceptan reservas | fecha pasada / no publicada |
| R3 | Cupo agotado | 409 `sold_out` | Cupo agotado |
| R4 | Tres clientes por el último lugar a la vez | Exactamente uno gana (`GET_LOCK` + `INSERT … SELECT … WHERE cupo`) | Carrera por el último lugar |
| R5 | El cliente manipula el total | Se recalcula en servidor desde precio, reglas y Protege | Total recalculado |
| R6 | Reserva de último minuto (dentro del plazo de pago) | 12 h de gracia; el aviso en pantalla lo explica | Vencimiento (con `created_at` retrocedido) |
| R7 | Sin abono dentro del plazo | Cupo liberado, reserva cancelada | Reserva sin pago… se cancela |
| R8 | Abono parcial y no liquida | Cancelada, **abono → crédito 12 meses** (nunca efectivo) | Abono vencida → crédito |
| R9 | Cliente cancela (sin Protege) | Abono → crédito | e2e_engine: cancelar sin Protege |
| R10 | Cancela con Protege ≥ 7 días | 80% a reembolso (ticket para el admin) + 20% crédito | Cancelar con Protege |
| R11 | Cambio de fecha con Protege / Club / primer cambio | Gratis; en los demás casos cargo configurable | Cambio de fecha con Protege |
| R12 | Cambio de fecha sin token o a fecha sin cupo | 403 / 409 | Sin token no se puede mover |
| R13 | Proveedor cancela la salida | Todos → crédito + bono 10%; la salida deja de aceptar reservas; el siguiente pago usa el crédito solo | Proveedor cancela la salida |
| R14 | Clima / cupo mínimo | Crédito sin bono | e2e_engine: salida en riesgo |
| R15 | Salida bajo el mínimo a ≤3 días | Tarea urgente a admin y proveedor; opcional auto-cancelación (`ops.auto_cancel_under_min`) | e2e_engine: salida en riesgo |
| R16 | Pasajero aborda con saldo | Check-in permitido, aviso “cobra saldo $X”; al cerrar con saldo → bandera de riesgo | Check-in de abordaje |
| R17 | Voucher de otro proveedor | 403 | e2e_engine: aislamiento de proveedores |
| R18 | Proveedor olvida cerrar la salida | Tarea al día siguiente; al admin a los 4 días | e2e_engine: salida sin cerrar |

## Dinero

| # | Escenario | Respuesta | Prueba |
|---|---|---|---|
| D1 | Abono mayor al saldo / reserva ya liquidada | 400, nunca sobrepaga | Abono mayor… / ya liquidada |
| D2 | Dos pagos simultáneos | `UPDATE … WHERE amount_paid + A <= total` atómico | Cada abono deja asiento |
| D3 | Efectivo en punto | Retenido; la reserva se confirma | Abono en efectivo queda retenido |
| D4 | Comisión del punto (% o fija) | Calculada en servidor al recolectar | Comisión 10% de $400 = $40 |
| D5 | Redondeo del chofer > $10 | 400 | Redondeo > $10 rechazado |
| D6 | Corte vacío o repetido | Sin folio fantasma | Segundo corte… |
| D7 | Liquidar dos veces | Idempotente (cada pago lleva su folio) | Liquidar de nuevo… |
| D8 | Liquidación al proveedor | bruto − Protege − fee (% o fijo); folio único; idempotente | Completar salida: fee 15% exacto |
| D9 | Pago a proveedor duplicado | 409 | Pagar dos veces → 409 |
| D10 | Efectivo estancado en un punto | Tarea al chofer + bandera de riesgo | e2e_engine: efectivo |
| D11 | Chofer con mucho efectivo | Tarea urgente + bandera | e2e_engine: efectivo |
| D12 | Abono en efectivo inusualmente grande | Bandera de riesgo | e2e_engine: efectivo |
| D13 | Transferencia por confirmar | Pago pendiente + tarea; el admin confirma y se aplica | e2e_engine: transferencia |
| D14 | Webhook de pasarela repetido | Idempotente por `gateway_ref` | e2e_engine: pago duplicado |
| D15 | Crédito por vencer / vencido | Aviso a 30 días; al vencer se debita (breakage) FIFO | e2e_engine: vencimiento de crédito |
| D16 | Cliente con crédito reserva | Se aplica solo, sin reembolso en efectivo | Siguiente reserva usa el crédito |

## Clientes y crecimiento

| # | Escenario | Respuesta | Prueba |
|---|---|---|---|
| C1 | Código de referido propio / inventado | Ignorado | Auto-referido se ignora |
| C2 | Primer viaje del invitado completado | $100 a cada uno, con tope mensual | Referido completa su primer viaje |
| C3 | Cliente Club completa un viaje | Cashback % en crédito | e2e_engine: cashback del Club |
| C4 | Reseña ≤3★ / ≥4★ | Ticket privado / pedir pública + bono | Reseña baja abre ticket |
| C5 | Reseñar dos veces | 400 | No se puede reseñar dos veces |
| C6 | Cliente dormido (120 días) | Winback con código de un solo uso | e2e_engine: winback |
| C7 | Código promocional | Descuento con tope global; usos máximos | Código promo resta $100 |
| C8 | Precio dinámico | Anticipada, última hora, grupo, alta demanda, socio; apagado por defecto | Precio dinámico: grupo de 6+ |

## Paquetes, red y soporte

| # | Escenario | Respuesta | Prueba |
|---|---|---|---|
| P1 | Rastreo público | Sin PII | Rastreo público sin PII |
| P2 | Paquete duplicado / socio sin llave | 409 / 401 | Envío duplicado / API socio sin llave |
| P3 | Cambio de estado del paquete | Aviso a quien pidió alerta, al destinatario | Operador marca “listo en punto” |
| P4 | Cotización de guía sin pagar | Vence a las 48 h | e2e_engine: guías |
| P5 | Guía pagada sin generar | Tarea al punto a las 4 h | e2e_engine: guías |
| N1 | Solicitud de punto | Score, SLA, tarea con WhatsApp; aprobación crea punto + usuario | Solicitud de punto puntúa |
| N2 | Punto sin actividad 14 días | Tarea de reactivación | e2e_engine: punto inactivo |
| S1 | Ticket por contenido grave | Prioridad urgente automática | Ticket público clasifica |
| S2 | Ticket sin respuesta | Escala a las 2 h (1 h si urgente) y levanta bandera | e2e_engine: SLA |
| S3 | Compensación mayor al tope de soporte | 403, requiere admin | Soporte no puede compensar |
| S4 | Bots en formularios | Honeypot y tiempo mínimo | Honeypot / Lead instantáneo |

## Seguridad y operación

| # | Escenario | Respuesta | Prueba |
|---|---|---|---|
| X1 | Fuerza bruta de contraseña | 429 tras 8 intentos / 15 min | e2e_engine: límite de intentos |
| X2 | Rol sin permiso / fuera de su alcance | 403; operador sólo ve su punto, proveedor sus salidas | Operador NO lee reservas / alcance |
| X3 | Token del voucher | Sin token no se mueve ni cancela | Sin token no se puede mover |
| X4 | Recuperar contraseña | Enlace de un solo uso (hash en BD, 1 h) sin revelar si el correo existe | e2e_engine: recuperación |
| X5 | Motor idempotente | Un segundo tick no duplica tareas, mensajes ni banderas | El motor es idempotente |
| X6 | Parámetros del negocio | Editables en runtime, con auditoría | Parámetros editables |
| X7 | Falla de un handler | `recover_value`: responde 500 y el proceso sigue | (diseño; ver `main.v`) |
