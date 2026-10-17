# Modelo de negocio Easypoint v2

**Tesis:** Easypoint no vende la experiencia ni el envío. **Orquesta y custodia el dinero y la confianza** entre muchos clientes, muchos puntos y muchos proveedores, y cobra por hacerlo seguro y simple. Mientras más alta la confianza (sin reembolsos que perder, quejas privadas, liquidaciones puntuales), más rápido crece la red.

## 1. Líneas de ingreso y cómo se cobra

| Línea | Quién paga | Cómo | Parámetro (editable en *Automatización*) |
|---|---|---|---|
| **Fee de excursiones** | Proveedor | % (15% por defecto) o fijo por reserva, sólo sobre lo **realmente completado** | `providers.fee_rate / fee_amount` |
| **Easypoint Protege** | Cliente (opcional) | 6% del subtotal (mín. $30): cambio de fecha gratis + 80% reembolsable al cancelar con ≥7 días | `pricing.protect_pct`, `pricing.protect_min`, `policy.protect_refund_pct` |
| **Easypoint Club** | Cliente | $99/mes: cashback 5% en crédito, descuento de socio, cambios gratis | `club.price_month`, `club.cashback_pct` |
| **Precio dinámico** | Cliente | Anticipada −5%, última hora −10% (llena cupo), grupo −8%, alta demanda +8%, socio −3%; tope global de descuento | `pricing.dynamic_enabled` + reglas |
| **Guías DHL / Estafeta** | Cliente | Tarifa de convenio con margen + **seguro de envío** (1.5% del valor declarado) | `guides.*`, `econ.guide_spread_pct` |
| **Servicios en punto** | Cliente | Take sobre cada venta del catálogo (17 servicios) | `econ.service_take_pct`; comisión al punto por servicio |
| **Breakage** | — | Crédito que vence a los 12 meses (con avisos a 30 días) | `policy.credit_validity_months` |
| **Float** | — | Anticipos del cliente y efectivo en tránsito, hasta pagar al proveedor a T+2 | `settlement.payout_days` |
| **Socios e-commerce (API)** | Tienda | Fee por paquete entregado en punto | `api_partners.fee_per_parcel` *(medición lista; el cobro automático es siguiente paso)* |

### Qué se optimizó respecto a la v1
1. **Precio final sin sorpresas.** El cliente ve un solo precio; el fee lo absorbe el proveedor (modelo de los grandes marketplaces). Subir fee o agregar cargos al cliente es una palanca, no el diseño base.
2. **Del “sin reembolsos” rígido a un producto vendible.** La política base (abono → crédito) protege la liquidez y elimina contracargos por “quiero mi dinero”; *Protege* convierte la flexibilidad en **ingreso** para quien la valora.
3. **Retención como producto:** Club (recurrente) y crédito con vencimiento (breakage honesto, avisado).
4. **Crecimiento con costo condicionado:** referidos pagan sólo al completarse el primer viaje del invitado (tope mensual); el *winback* manda un código de un solo uso cuyo costo existe sólo si se usa; el bono de $100 a quien invita sale del take del viaje que ya se concretó.
5. **Cada peso tiene registro en cada mano** (punto → chofer → admin → proveedor): menos fuga, más defendible ante una disputa.
6. **Margen visible:** *Economía* muestra, por línea, volumen, ingreso, costo a puntos, float y margen de contribución; el modelo se afina con números reales, no con supuestos.

## 2. Economía unitaria (ejemplo con datos de la demo)

Reserva de 2 personas a $1,450 (GMV $2,900), con Protege:

| Concepto | Monto |
|---|---|
| Precio de lista | $2,900 |
| Protege (6%) | +$174 → cliente paga $3,074 |
| Fee del proveedor (15% de $2,900) | **+$435** |
| Protege | **+$174** |
| **Ingreso Easypoint** | **$609** (19.8% del total cobrado) |
| Comisión al punto si el abono fue en efectivo (10% de lo cobrado en el punto) | −$40 por cada $400 |
| Premio de referido (si aplica, una vez) | −$100 |
| Pasarela (si fue en línea, ~3.5%) | −$108 *(se negocia con el proveedor de pagos)* |

El margen de contribución de una reserva típica queda entre el 14% y el 20% del GMV; la mejora más grande viene de **Protege (adopción)**, **cancelaciones evitadas** y **recompra (Club + referidos)**.

## 3. Palancas (el tablero *Economía* las simula con tus datos)

| Palanca | Efecto |
|---|---|
| +10 pts de adopción de Protege | +0.6% del GMV como ingreso |
| +1 pt de fee al proveedor | +1% del GMV |
| −5 pts de cancelaciones | +5% × take de ingreso que hoy se pierde |
| Precio dinámico (alta demanda) | Más ingreso por asiento sin más costo; última hora llena cupo vacío |
| Breakage | 100% margen sobre el crédito que vence |
| Club | Ingreso recurrente + cashback como costo acotado |
| Densidad de ruta | Más puntos por chofer baja el costo de recolección |

## 4. Riesgos y controles

| Riesgo | Control |
|---|---|
| Fraude / efectivo | Límites por punto y chofer, alertas, banderas de riesgo, redondeo ≤$10, cálculo de comisión sólo en servidor |
| Contracargos | Sin reembolso en efectivo; crédito; política aceptada **antes** de pagar |
| Quejas públicas | Canal privado con SLA de 2 h; compensación en crédito con tope por rol |
| Sobreventa | Cupo atómico (`GET_LOCK` + inserción condicionada) |
| Pasivo de crédito | Se muestra en *Hoy* y en *Economía*; vence a 12 meses |
| Proveedor que cancela | Bono automático al cliente y tarea al admin; el proveedor responde por el costo |
| Dependencia de un canal | WhatsApp con respaldo manual (un clic) y correo; pasarela con modo manual |
| **Cumplimiento fiscal y de custodia** | **Pendiente de validar con asesoría:** facturación (CFDI) de comisiones y servicios, IVA, y el tratamiento de custodiar dinero de terceros. La librería `erp/modules/billing` está disponible para integrarse |

## 5. Qué medir

GMV · take rate efectivo · margen de contribución · conversión reserva→abono · cancelación y vencimiento · recompra y LTV · crédito en circulación y breakage · efectivo en puntos/ruta · SLA de tickets · tasa de aprobación de aspirantes · reservas por punto y por proveedor.

## 6. Decisiones que siguen siendo del dueño

Los números de arriba son **parámetros**, no rediseños; se cambian en runtime:
* Fee por proveedor y por línea; monto de apartado por defecto.
* Vigencia del crédito (12 meses) y si es transferible.
* % de Protege y si se ofrece por defecto premarcado.
* Comisión a puntos (por nivel) y a proveedores.
* Si se activa precio dinámico y con qué topes.
* Pago anticipado al proveedor (`settlement.instant_fee_pct`, reservado: aún sin interfaz).
