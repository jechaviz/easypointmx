# Actores y pipelines de Easypoint v2

Easypoint es una red de **puntos** (negocios de barrio) alrededor de cuatro flujos: paquetes, guías, servicios y excursiones con apartado. El dinero y la confianza son el producto: cobramos, custodiamos y orquestamos; el proveedor presta la experiencia.

La regla de diseño del rediseño: **cada actor abre su panel y ve una lista priorizada de lo que debe hacer (“Hoy”), generada por un motor de automatización**, no un menú de tablas. Los humanos sólo intervienen donde hay decisión, dinero físico o criterio.

## Mapa de actores

| Actor | Quién es | Entra por | Qué quiere | Qué le automatizamos |
|---|---|---|---|---|
| **Cliente** | Viajero o remitente | Sitio público (sin cuenta) + voucher con token | Reservar fácil, pagar a su ritmo, no perder su dinero | Recordatorios, vencimiento a crédito, cambio de fecha, cancelación, reseña, referidos |
| **Punto** (operador) | Dueño de un local afiliado | Panel → Cobrar / Vender / Paquetes / Caja | Ganar comisión sin complicarse | Tareas de recolección, alertas de efectivo, guías por generar, aviso al destinatario |
| **Chofer** | Recolector de efectivo | Panel → Ruta | Ruta corta, corte limpio | Ruta por vecino más cercano, límite de efectivo, alertas, cálculo de comisión y neto |
| **Proveedor** | Organizador de excursiones | Panel → Salidas / Manifiesto | Llenar salidas y cobrar sin perseguir pagos | Apartado y abonos cobrados por Easypoint, manifiesto, check-in QR, liquidación automática |
| **Ventas** | Equipo comercial | Panel → Aspirantes / Campañas | Afiliar puntos y proveedores | Score de solicitudes, SLA, tareas con WhatsApp listo, planificador de campañas medibles |
| **Soporte** | Equipo de atención | Panel → Tickets | Resolver rápido y en privado | Prioridad por contenido, SLA, escalamiento, compensación con tope |
| **Admin** | Operación y finanzas | Panel → todo | Que el negocio corra solo y rentable | Motor, riesgo, economía unitaria, parámetros editables |
| **Socio e-commerce** | Tienda en línea | API con llave | Entregar en puntos | Alta de envíos, alertas al cliente final |
| **Motor** | Proceso `ep --tick` | Cron cada minuto | — | Todo lo anterior, idempotente |

## Pipeline 1 · Reserva de excursión (cliente ↔ proveedor)

```
reservado ──abono──▶ abonado ──liquida──▶ pagado ──QR──▶ abordado ──proveedor completa──▶ completado
    │                    │                  │
    └──── fecha límite sin pago ────────────┴──▶ credito (cancelada, abono → monedero 12 meses)
    └──── cliente cancela ─▶ credito  (con Protege y ≥7 días: 80% a reembolso + 20% a crédito)
    └──── salida cancelada ─▶ credito (+10% de bono si fue culpa del proveedor)
```

| Paso | Quién | Qué pasa | Automático |
|---|---|---|---|
| 1. Cotizar | Cliente | Precio en vivo: fecha, personas, promo, Protege, socio Club | Reglas de precio dinámico (anticipada, última hora, grupo, alta demanda) |
| 2. Reservar | Cliente | Cupo reservado **atómicamente** (`GET_LOCK` + inserción condicionada); folio y token | Total recalculado en servidor; crédito del monedero se aplica solo; aviso por WhatsApp/correo |
| 3. Apartar / pagar | Cliente | En línea (Mercado Pago / transferencia / demo) o en efectivo en un punto | `apply_payment`: una sola función atómica para todos los canales |
| 4. Recordar | Motor | +24 h sin abono → empujón; plazo−4 días → último aviso; calendario de abonos elegido | Idempotente por `dedupe_key` |
| 5. Vencer | Motor | Con saldo al llegar el plazo (3 días antes): cupo liberado, abono → crédito | Gracia de 12 h para reservas de último minuto |
| 6. Víspera | Motor | Todo pagado: voucher con QR y punto de encuentro | — |
| 7. Abordar | Proveedor | Escanea QR o captura folio; si hay saldo, se lo dice | Etapa → *abordado* |
| 8. Completar | Proveedor / motor | Reservas pagadas → *completado*; liquidación al proveedor (bruto − fee) | Tarea si olvida cerrar (+1 día), tarea al admin (+4 días) |
| 9. Post-viaje | Motor | Reseña (sólo sin queja abierta); ≤3★ → ticket privado, ≥4★ → pedir pública; cashback Club; premio de referido | Topes mensuales de premios |

## Pipeline 2 · Dinero en efectivo (punto → chofer → admin → liquidación)

```
held_at_point ──chofer recolecta──▶ collected ──corte con folio──▶ delivered ──liquidación──▶ comisión del punto pagada
```

* **Punto** registra el abono en segundos (`/ops/cash-payment`): suma a la reserva y queda *retenido*.
* **Motor** crea tarea al chofer cuando un punto supera `cash.point_limit` ($3,000) o `cash.point_max_days` (7 días); levanta bandera si el efectivo es estancado o un abono excede `cash.large_payment_flag`.
* **Chofer** ve la ruta ordenada (vecino más cercano desde su GPS). Al recolectar, el **servidor** calcula comisión del punto y neto; el redondeo no puede pasar de $10.
* **Corte** (`/driver/corte`): entrega todo lo recolectado, con folio; el motor vigila `cash.driver_limit` ($5,000).
* **Liquidación**: el admin corre la de comisiones por punto (idempotente: marca cada pago con su folio).

## Pipeline 3 · Paquetes y guías

```
pending ─▶ in_transit ─▶ at_point ─▶ delivered        quoted ─▶ paid ─▶ generated
```

Alertas por correo/WhatsApp en cada cambio; el cliente rastrea sin cuenta (sin PII). Cotizaciones sin pagar vencen a las 48 h; guías pagadas sin generar generan tarea al punto a las 4 h. Socios e-commerce crean envíos con `X-API-Key`.

## Pipeline 4 · Soporte (embudo privado de quejas)

```
open ──SLA 2 h sin respuesta──▶ escalated ──▶ resolved (+ compensación en crédito, con tope para soporte)
```

Prioridad automática por texto (“cobro doble”, “estafa”…). El canal de queja es **privado**; el público es de elogio. Reseñas ≤3★ abren ticket automático.

## Pipeline 5 · Crecimiento de la red

```
solicitud ─score/SLA 24 h─▶ contacto por WhatsApp ─▶ aprobada (crea punto + usuario + correo) / rechazada
punto activo ─14 días sin actividad─▶ tarea de reactivación
```

Leads de la web llegan con atribución (UTM de primer y último toque, growth-kit) y tarea de ventas con WhatsApp prellenado.

## Pipeline 6 · Cliente en el tiempo (CRM)

`nuevo → primer_viaje → recurrente → vip`, y `dormido / en_riesgo` si pasan 120 días: el motor manda **winback** con un código de $100 de un solo uso (el costo sólo existe si lo usan). Referidos: el invitador y el invitado reciben $100 al completarse el primer viaje del invitado.

## Qué ve cada rol en “Hoy”

| Rol | KPIs | Tareas típicas del motor |
|---|---|---|
| Admin | Efectivo en puntos/ruta, por cobrar, crédito en circulación, reservas hoy, tickets, banderas, mensajes por enviar | Salida en riesgo, liquidación por pagar, transferencia por confirmar, SLA vencido |
| Punto | Efectivo retenido, comisión 30 d, paquetes en punto, ventas del día | Generar guía pagada |
| Chofer | Paradas con efectivo, efectivo en su poder vs límite | Recolectar en X, entregar corte |
| Proveedor | Salidas 14 d, por liquidar, calificación | Manifiesto de hoy/mañana, confirmar que salió, alta demanda, faltan lugares para el mínimo |
| Ventas | Aspirantes y leads | Contactar aspirante (con SLA), reactivar punto |
| Soporte | Tickets abiertos y fuera de SLA | Ticket por atender |
