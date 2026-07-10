# Modelo de negocio Easypoint (propuesta)

Easypoint = **punto de recolección de pagos y servicios**. No vende la experiencia
final (la excursión, el envío): **orquesta y cobra**, y se queda con un margen por
hacerlo seguro y simple. El valor está en ser la capa de **confianza + dinero**
entre el cliente y muchos proveedores/puntos.

## 1. Líneas de ingreso

| Línea | Cómo cobra Easypoint | Margen |
|---|---|---|
| Excursiones | Fee sobre el total + manejo del apartado/pagos parciales | % del total (sugerido 10–20%) |
| Guías DHL/Estafeta | Sobreprecio sobre la tarifa de convenio | spread por guía |
| Afiliación de puntos | Comisión por paquete/servicio operado en el punto | por transacción |
| Flotación de apartados | Dinero apartado retenido hasta liquidar al proveedor | financiero |

El eje nuevo es el **apartado (pago parcial)**: el cliente aparta con una cantidad
definida por el proveedor (p.ej. $100) y Easypoint **custodia** ese dinero hasta
que la reserva se finalice.

## 2. Pagos parciales (apartado)

- El **proveedor define** por excursión: precio total y **monto de apartado**
  (fijo, p.ej. $100, o un mínimo). 0 = exige pago completo.
- El cliente puede pagar en **abonos** con **fechas de pago** (calendario) hasta
  cubrir el total antes de la fecha de la excursión.
- Easypoint registra `amount_paid` y `balance` por reserva; el estado de pago va
  `pending → partial → paid`.
- **Plan de abonos + recordatorios:** al reservar se pregunta cómo planea pagar
  (semanal / quincenal / fechas específicas) y si quiere recordatorios por correo
  o WhatsApp. Se genera el calendario (`reminder_dates`) y un cron diario
  (`/api/reminders/run`) envía los avisos pendientes (correo vía PB; WhatsApp vía
  API si está configurada) y los marca para no repetir.

**Reglas de dinero (clave para la rentabilidad y la seguridad):**

- **Sin reembolsos en efectivo.** Si la reserva no se finaliza (el cliente no
  completa el pago o no se presenta), **lo abonado NO se pierde ni se devuelve en
  efectivo**: se convierte en **crédito Easypoint** (estado `credit`) aplicable a
  **otra excursión / otro proveedor** dentro de una vigencia (sugerido 12 meses).
- Esto elimina contracargos por "quiero mi dinero" (no prometemos devolución),
  retiene el flujo dentro del ecosistema y reduce el riesgo financiero.
- La política se muestra **antes de pagar** (aceptación explícita) para que sea
  exigible: "Apartas con $X. Sin reembolsos ni cancelaciones; tu pago aplica como
  crédito para otra experiencia."

**Liquidación al proveedor:** Easypoint libera al proveedor el total **menos su
fee** sólo cuando la experiencia se marca como completada. Mientras tanto el
apartado es flotación de Easypoint.

### Cobranza en efectivo (ruta de choferes)

El cliente abona **en efectivo en el punto**; el dueño del punto retiene el
dinero y gana una **comisión** (`points.commission_rate`). Los choferes de
Easypoint —que de todas formas visitan los puntos periódicamente— **recolectan
el neto** (monto − comisión del punto) y lo marcan **entregado al administrador**.

Flujo (libro `payments`, ciclo `held_at_point → collected → delivered`):

1. Operador del punto **registra el abono** (código de reserva + monto) → queda
   retenido en su punto y suma al `amount_paid` de la reserva (vía hook, sin que
   el operador edite la reserva).
2. Chofer **recolecta**: el sistema calcula comisión del punto + neto desde
   `commission_rate` (recálculo server-side anti-manipulación) y sella la fecha.
3. Chofer **entrega al admin** → `delivered`, con fecha.

El admin ve totales: retenido en puntos, recolectado en ruta, entregado, y
comisión pagada a puntos.

## 3. Defensa contra el usuario insatisfecho (crecer seguro)

El objetivo es **resolver en privado antes de que la queja se haga pública**:

1. **Embudo de queja interno**: en la reserva/rastreo hay un botón "¿Algún
   problema?" que abre un **ticket privado** (`support_tickets`) y avisa al admin
   por push/WhatsApp **al instante**. El cliente siente que lo atienden y no salta
   a redes/reseñas.
2. **Política aceptada al pagar**: sin reembolsos/cancelaciones → menos disputas
   "legales"; las inconformidades se canalizan a **crédito** (compensación dentro
   del sistema), no a devolución.
3. **Crédito como compensación**: ante una mala experiencia comprobada, se otorga
   crédito (cuesta poco, retiene al cliente, evita el contracargo y la reseña).
4. **Reputación controlada**: las reseñas públicas se piden **sólo a clientes con
   experiencia marcada como satisfactoria** (no se expone un canal público de
   quejas; el canal público es de elogio, el privado es de queja).
5. **Trazabilidad**: cada pago, fecha y cambio de estado queda registrado para
   defender a Easypoint ante un contracargo o reclamo.

## 4. Afiliación de puntos y proveedores

- **Registro sencillo** (mínimos campos + alta inmediata, verificación posterior)
  y **recuperación de contraseña** simple por correo — bajar la fricción de alta.
- El **dueño del punto/proveedor** opera desde la **app** (no sólo web): ver
  reservas, registrar pagos/apartados, confirmar experiencias, cobrar guías.
- Incentivo: comisión por servicio operado + acceso a la demanda de la red.

## 5. App (sin pasar por la web)

- **PWA instalable** (Android, iOS "Agregar a inicio", escritorio) como primera
  entrega: experiencia tipo app, offline parcial, sin tiendas ni firma.
- **App nativa** (framework V/VApps → `vab` APK/AAB; desktop `v -prod`; iOS vía
  Xcode) como segunda fase: requiere Android SDK, firma y cuentas de tienda
  (tareas del dueño). Ver `docs/DEPLOYMENT.md` y `v_projects/domains/product_apps/vapps`.

## 5b. Gestión y control (dashboards completos)

- **Finanzas (admin):** cuentas por cobrar (saldos de reservas), efectivo retenido en
  puntos / en ruta, crédito en circulación (monederos), ingresos por línea, y **cola
  de pendientes** (tickets abiertos, reservas sin confirmar, guías por generar, abonos
  retenidos). Endpoint `GET /api/finance/summary`.
- **Liquidaciones:** `POST /api/settlements/run` calcula pagos a **puntos** (comisión)
  y a **proveedores** (fee Easypoint) por periodo; el chofer cierra su **corte** con
  folio (`POST /api/cortes/driver`) al entregar el efectivo al admin.
- **Proveedores:** entidad gestionable (`providers`, con `fee_rate`); excursiones
  enlazadas por `provider_id`.
- **Monederos:** historial de movimientos (`wallet_entries`).
- **Reportes:** exportación CSV por colección y rango de fechas.
- **Bitácora:** `audit_log` registra cambios clave (solo admin).
- **KPIs reales** por rol (operador: comisión/abonos; chofer: efectivo que trae;
  ventas: prospectos/conversión) reemplazan los valores de muestra.

## 5c. Red de microcentros de servicios

Cada punto afiliado es un **hub de servicios**, no solo de paquetería. Un
catálogo genérico (`services`) permite ofrecer, con comisión al punto:
pagos de servicios, recargas, seguros, boletos, impresión, SIM, devoluciones
e-commerce, remesas, certificados digitales, publicidad local, marketplace de
insumos, farmacia bajo pedido, locker, reciclaje, productos locales y servicios
B2B (facturación, TPV, sitios web…). Cada servicio define su comisión (% o fija).

Las **ventas** (`service_orders`) las registra el operador en su punto y
**fluyen al mismo libro de cobranza** (`payments`, kind='service'): el chofer
recolecta el neto en su ruta diaria y lo entrega al admin → liquidación. Así
cada nuevo servicio incrementa el valor de la misma ruta e infraestructura.

Visión a mediano plazo: **red regional / franquicia ligera** en Querétaro y luego
otras regiones, con una plataforma central que ya gestiona comisiones, cobranza,
cortes, liquidaciones, crédito y soporte. La página pública `/servicios` anuncia
el catálogo y capta afiliados.

## 6. Qué falta decidir (parámetros del negocio)

- % de fee por línea (excursiones/guías) y monto/mínimo de apartado por defecto.
- Vigencia del crédito y si es transferible.
- Comisión exacta a puntos/proveedores.
- Si el apartado mínimo lo fija el proveedor o Easypoint pone un piso.

Estos son **parámetros configurables**, no rediseños: el sistema ya soporta
apartado, calendario, crédito y embudo de quejas; ajustar números es runtime.
