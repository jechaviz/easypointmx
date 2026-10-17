module main

// Parámetros por defecto del negocio (siempre, idempotente) y datos de demostración (--seed-demo).

const config_defaults = [
	['policy', 'policy.credit_validity_months', '12', 'Vigencia del crédito (meses)'],
	['policy', 'policy.payment_deadline_days', '3', 'Días antes de la salida para tener liquidado (si no, pasa a crédito)'],
	['policy', 'policy.nudge_hours_unpaid', '24', 'Horas sin abono para el primer recordatorio'],
	['policy', 'policy.protect_refund_pct', '80', '% reembolsable con Easypoint Protege (cancelando con ≥7 días)'],
	['policy', 'policy.reschedule_fee', '150', 'Costo de cambio de fecha sin Protege/Club (después del primero gratis)'],
	['policy', 'policy.last_minute_grace_hours', '12', 'Horas de gracia para pagar una reserva hecha dentro de la ventana de pago'],
	['policy', 'policy.reschedule_min_days', '3', 'Días mínimos de anticipación para cambiar fecha'],
	['policy', 'policy.first_reschedule_free', 'true', 'El primer cambio de fecha es gratis'],
	['pricing', 'pricing.dynamic_enabled', 'false', 'Activar reglas de precio dinámico'],
	['pricing', 'pricing.protect_pct', '6', 'Easypoint Protege: % del subtotal'],
	['pricing', 'pricing.protect_min', '30', 'Easypoint Protege: mínimo por reserva'],
	['pricing', 'pricing.max_discount_pct', '25', 'Tope de descuento acumulado'],
	['club', 'club.price_month', '99', 'Easypoint Club: precio mensual'],
	['club', 'club.cashback_pct', '5', 'Easypoint Club: % de cashback en crédito al completar un viaje'],
	['club', 'club.duration_days', '30', 'Duración de una membresía pagada'],
	['referral', 'referral.reward_referrer', '100', 'Crédito al que invita (MXN)'],
	['referral', 'referral.reward_referee', '100', 'Crédito al invitado (MXN)'],
	['referral', 'referral.min_booking_total', '800', 'Total mínimo de la primera reserva para premiar'],
	['referral', 'referral.monthly_cap', '10', 'Máximo de premios por invitador al mes'],
	['cash', 'cash.driver_limit', '5000', 'Efectivo máximo que puede traer un chofer sin entregar'],
	['cash', 'cash.point_limit', '3000', 'Efectivo retenido en un punto que dispara recolección'],
	['cash', 'cash.point_max_days', '7', 'Días máximos de efectivo retenido en un punto'],
	['cash', 'cash.large_payment_flag', '8000', 'Un abono en efectivo mayor a esto levanta bandera de riesgo'],
	['support', 'support.sla_first_response_h', '2', 'SLA de primera respuesta (horas)'],
	['support', 'support.sla_resolve_h', '24', 'SLA de resolución (horas)'],
	['support', 'support.auto_credit_cap', '300', 'Tope de compensación que puede dar soporte (MXN)'],
	['settlement', 'settlement.payout_days', '2', 'Días tras completar la salida para pagar al proveedor'],
	['settlement', 'settlement.instant_fee_pct', '1.5', 'Comisión por pago anticipado al proveedor'],
	['settlement', 'settlement.provider_cancel_bonus_pct', '10', 'Bono de crédito al cliente si el proveedor cancela la salida'],
	['payments', 'payments.mode', 'demo', 'demo | gateway | manual_confirm'],
	['payments', 'payments.instructions', 'Deposita a la CLABE que te enviamos por WhatsApp e indica tu referencia.', 'Instrucciones de transferencia'],
	['growth', 'growth.winback_days', '120', 'Días sin viajar para campaña de recuperación'],
	['growth', 'growth.review_delay_days', '1', 'Días después de completar para pedir reseña'],
	['growth', 'growth.review_bonus', '20', 'Crédito por dejar una reseña (MXN)'],
	['ops', 'ops.point_inactive_days', '14', 'Días sin actividad para marcar un punto inactivo'],
	['ops', 'ops.application_sla_h', '24', 'SLA para contactar a un aspirante a punto'],
	['ops', 'ops.guide_quote_ttl_h', '48', 'Horas de vigencia de una cotización de guía sin pagar'],
	['ops', 'ops.auto_cancel_under_min', 'false', 'Cancelar automáticamente salidas bajo el mínimo (1 día antes)'],
	['guides', 'guides.dhl_base', '139', 'DHL: tarifa base'],
	['guides', 'guides.dhl_perkg', '38', 'DHL: kg adicional'],
	['guides', 'guides.estafeta_base', '109', 'Estafeta: tarifa base'],
	['guides', 'guides.estafeta_perkg', '30', 'Estafeta: kg adicional'],
	['guides', 'guides.express_mult', '1.6', 'Multiplicador Express'],
	['guides', 'guides.national_mult', '1.4', 'Multiplicador zona nacional'],
	['guides', 'guides.insurance_pct', '1.5', 'Seguro de envío: % del valor declarado'],
	['guides', 'guides.insurance_min', '20', 'Seguro de envío: mínimo'],
	['econ', 'econ.guide_spread_pct', '12', 'Supuesto: margen de Easypoint sobre guías'],
	['econ', 'econ.service_take_pct', '8', 'Supuesto: take de Easypoint sobre ventas de servicios'],
	['brand', 'brand.url', 'https://easypoint.mx', 'URL pública'],
	['brand', 'brand.review_url', '', 'Enlace para reseñas públicas (Google)'],
	['brand', 'brand.whatsapp', '', 'WhatsApp de contacto'],
]

fn (mut a App) seed_config() int {
	// una sola sentencia: INSERT IGNORE de todos los parámetros que falten
	mut rows := []string{}
	for c in config_defaults {
		rows << '(${q(c[1])}, ${q(c[2])}, ${q(c[0])}, ${q(c[3])})'
	}
	res := a.db.rows('INSERT IGNORE INTO ep_config (ckey, cvalue, grp, label) VALUES ${rows.join(',')};
SELECT ROW_COUNT() AS n') or {
		return 0
	}
	return if res.len > 0 { res[0]['n'].int() } else { 0 }
}

fn (mut a App) seed_rules() {
	if a.db.count('pricing_rules', '1=1') > 0 {
		return
	}
	rules := [
		{'label': 'Compra anticipada (45+ días)', 'kind': 'early_bird', 'pct': '5', 'days': '45'},
		{'label': 'Última hora (≤3 días, para llenar cupo)', 'kind': 'last_minute', 'pct': '10', 'days': '3', 'fill_pct': '60'},
		{'label': 'Grupo de 6+', 'kind': 'group', 'pct': '8', 'min_people': '6'},
		{'label': 'Alta demanda (≥85% lleno)', 'kind': 'surge', 'pct': '8', 'fill_pct': '85'},
		{'label': 'Socio Club', 'kind': 'member', 'pct': '3'},
		{'label': 'Bienvenida', 'kind': 'promo_code', 'amount': '100', 'code': 'BIENVENIDO100', 'max_uses': '500'},
	]
	for r in rules {
		mut d := r.clone()
		d['active'] = '1'
		a.db.insert('pricing_rules', d) or {}
	}
}

fn (mut a App) seed_services() {
	if a.db.count('services', '1=1') > 0 {
		return
	}
	sv := [
		['Pago de servicios (CFE, Telmex, agua)', 'pagos', 'Cobro de recibos de luz, agua, teléfono e internet.', 'percent', '3', '0', 'por cobro', 'receipt'],
		['Recargas telefónicas', 'recargas', 'Tiempo aire de todas las compañías.', 'percent', '5', '0', 'por recarga', 'phone'],
		['Seguros económicos (moto, celular, mascota)', 'seguros', 'Pólizas rápidas de bajo costo.', 'percent', '15', '0', 'por póliza', 'shield-check'],
		['Boletos (autobús, eventos, turismo)', 'boletos', 'Venta de boletos y experiencias.', 'percent', '8', '0', 'por boleto', 'ticket-perforated'],
		['Impresión de etiquetas y documentos', 'impresion', 'Recibe archivos por WhatsApp, entrega al día siguiente.', 'fixed', '0', '5', 'por trabajo', 'printer'],
		['Venta de tarjetas SIM', 'sim', 'Distribución y activación de SIM.', 'fixed', '0', '30', 'por activación', 'sim'],
		['Devoluciones de e-commerce', 'devoluciones', 'Recepción de devoluciones para recolección diaria.', 'fixed', '0', '10', 'por paquete', 'arrow-return-left'],
		['Pago de remesas', 'remesas', 'Recepción y pago de remesas.', 'percent', '2', '0', 'por envío', 'cash-stack'],
		['Certificados y licencias digitales', 'certificados', 'e.firma, SSL, antivirus, Microsoft 365, Google Workspace.', 'percent', '10', '0', 'por licencia', 'patch-check'],
		['Publicidad local en la red', 'publicidad', 'Tu volante en decenas de tiendas por un mes.', 'fixed', '0', '200', 'por campaña', 'megaphone'],
		['Marketplace de insumos', 'marketplace', 'Bolsas, cinta, etiquetas, papelería, limpieza, uniformes.', 'percent', '8', '0', 'por pedido', 'box-seam'],
		['Farmacia bajo pedido', 'farmacia', 'El negocio recibe el pedido, tú entregas por la tarde.', 'percent', '10', '0', 'por pedido', 'capsule'],
		['Locker humano', 'locker', 'Guarda de paquetes para que el cliente pase cuando pueda.', 'fixed', '0', '8', 'por paquete', 'safe2'],
		['Productos locales (café, miel, salsas)', 'productos_locales', 'Punto de venta para productores de la región.', 'percent', '12', '0', 'por venta', 'bag-heart'],
		['Facturación electrónica (B2B)', 'b2b', 'Alta y suscripción de facturación para negocios.', 'percent', '10', '0', 'por suscripción', 'file-earmark-text'],
		['Terminal bancaria / TPV (B2B)', 'b2b', 'Alta de terminal de cobro para el comercio.', 'fixed', '0', '150', 'por alta', 'credit-card-2-back'],
		['Sitio web / tienda en línea (B2B)', 'b2b', 'Desarrollo web y tiendas en línea para negocios.', 'percent', '15', '0', 'por proyecto', 'globe'],
	]
	for s in sv {
		a.db.insert('services', {
			'name': s[0], 'category': s[1], 'description': s[2], 'commission_type': s[3]
			'commission_rate': s[4], 'commission_amount': s[5], 'unit': s[6], 'icon': s[7], 'active': '1'
		}) or {}
	}
}

// Datos de demostración (Querétaro). Contraseña común de las cuentas demo desde EP_SEED_PASSWORD.
fn (mut a App) seed_demo() {
	if a.db.count('points', '1=1') > 0 {
		return
	}
	pass := env_or('EP_SEED_PASSWORD', 'Demo12345!')
	hash := hash_password(pass)
	pts := [
		['Papelería Don Chuy', 'Av. Zaragoza 120, Centro, Querétaro', '20.5935', '-100.3899', '4421000001', 'L-S 09:00-20:00', '10'],
		['Abarrotes La Esquina', 'Calle Corregidora 45, Centro, Querétaro', '20.5933', '-100.3910', '4421000002', 'L-D 08:00-21:00', '10'],
		['Cafetería Origen', 'Av. Universidad 330, Cimatario, Querétaro', '20.5700', '-100.4100', '4421000003', 'L-V 08:00-19:00', '12'],
		['Miscelánea Los Pinos', 'Calle Pinos 18, El Pueblito, Corregidora', '20.5370', '-100.4420', '4421000004', 'L-S 09:00-19:00', '10'],
		['Tienda Naturista Verde', 'Blvd. Bernardo Quintana 5000, Querétaro', '20.6200', '-100.4160', '4421000005', 'L-S 10:00-18:00', '10'],
		['Ciber & Copias Express', 'Av. Tecnológico 220, Querétaro', '20.6080', '-100.3720', '4421000006', 'L-V 09:00-20:00', '8'],
	]
	mut point_ids := []i64{}
	for p in pts {
		id := a.db.insert('points', {
			'name': p[0], 'address': p[1], 'lat': p[2], 'lng': p[3], 'whatsapp': p[4], 'hours': p[5]
			'commission_type': 'percent', 'commission_rate': p[6], 'active': '1', 'tier': 'basic', 'rating': '4.7'
		}) or { 0 }
		point_ids << id
	}
	provs := [
		['Aventuras Sierra Gorda', '4422000001', 'sierra@aventuras.mx', '15', '012180001234567890', 'BBVA'],
		['Vinos y Quesos Tour', '4422000002', 'hola@vinosyquesos.mx', '15', '072180009876543210', 'Banorte'],
		['Pueblos Mágicos MX', '4422000003', 'ventas@pueblosmagicos.mx', '18', '014180005555555555', 'Santander'],
	]
	mut prov_ids := []i64{}
	for p in provs {
		id := a.db.insert('providers', {
			'name': p[0], 'whatsapp': p[1], 'email': p[2], 'fee_type': 'percent', 'fee_rate': p[3]
			'clabe': p[4], 'bank_name': p[5], 'beneficiary': p[0], 'payout_days': '2', 'active': '1', 'rating': '4.8'
		}) or { 0 }
		prov_ids << id
	}
	excs := [
		[prov_ids[0].str(), 'Sierra Gorda: Cascadas y Misiones', 'Jalpan de Serra', 'Recorre las cinco misiones franciscanas (Patrimonio UNESCO) y refréscate en las cascadas de Chuveje. Incluye transporte, guía y desayuno.', '1450', '1 día · 12 h', '14', '6', '400', 'Salida 6:00 am desde Querétaro centro', '06:00', 'sierra,misiones,naturaleza', '1'],
		[prov_ids[1].str(), 'Ruta del Queso y el Vino', 'Tequisquiapan y Bernal', 'Cavas, quesos artesanales y paseo por Tequisquiapan con cata guiada de tres vinos.', '1290', '1 día · 9 h', '20', '8', '350', 'Plaza de Armas, Querétaro', '09:00', 'vino,queso,gastronomía', '1'],
		[prov_ids[2].str(), 'Peña de Bernal y Pueblo Mágico', 'Bernal', 'Ascenso guiado a la tercera roca monolítica más grande del mundo y comida típica.', '890', 'Medio día · 6 h', '25', '6', '200', 'Terminal de autobuses, Querétaro', '08:00', 'senderismo,pueblo mágico', '0'],
		[prov_ids[0].str(), 'Rafting y Tirolesa en Jalpan', 'Jalpan de Serra', 'Descenso en balsa por el río Santa María y cuatro tirolesas sobre el cañón.', '1890', '1 día · 11 h', '12', '6', '500', 'Salida 5:30 am desde Querétaro centro', '05:30', 'aventura,rio', '0'],
		[prov_ids[2].str(), 'Tren turístico y Hacienda', 'Querétaro', 'Paseo en tren de época, visita a una hacienda colonial y comida de tres tiempos.', '1190', 'Medio día · 7 h', '18', '8', '300', 'Estación de ferrocarril, Querétaro', '10:00', 'tren,historia', '0'],
		[prov_ids[1].str(), 'Cavas de Espumosos y Glamping', 'Ezequiel Montes', 'Recorrido por la cava, cata de espumosos y noche opcional en glamping.', '2150', '2 días · 1 noche', '10', '4', '600', 'Plaza de Armas, Querétaro', '09:30', 'vino,glamping,romántico', '1'],
	]
	mut exc_ids := []i64{}
	for e in excs {
		id := a.db.insert('excursions', {
			'provider_id': e[0], 'name': e[1], 'destination': e[2], 'description': e[3], 'price': e[4]
			'duration': e[5], 'max_capacity': e[6], 'min_people': e[7], 'deposit_amount': e[8]
			'meeting_point': e[9], 'departure_time': e[10], 'tags': e[11], 'featured': e[12], 'active': '1'
			'cutoff_days': '3'
			'policy': 'Apartas con un abono. Sin reembolsos en efectivo: si no completas tu pago, lo abonado se convierte en crédito Easypoint para otra experiencia (vigente 12 meses).'
		}) or { 0 }
		exc_ids << id
		// salidas: los próximos 8 fines de semana + un par entre semana
		mut added := 0
		mut d := add_days(today(), 4)
		for added < 10 {
			wd := weekday_of(d)
			if wd == 6 || wd == 0 || added % 4 == 3 {
				a.db.insert('departures', {
					'excursion_id': id.str()
					'date':         d
					'status':       'open'
				}) or {}
				added++
			}
			d = add_days(d, 1)
		}
	}
	a.seed_services()
	a.seed_rules()
	users := [
		['admin@easypoint.mx', 'Administración Easypoint', 'admin', '0', '0'],
		['soporte@easypoint.mx', 'Soporte Easypoint', 'support', '0', '0'],
		['ventas@easypoint.mx', 'Ventas Easypoint', 'sales', '0', '0'],
		['chofer@easypoint.mx', 'Chofer Ruta Centro', 'driver', '0', '0'],
		['punto@easypoint.mx', 'Operador Papelería Don Chuy', 'operator', point_ids[0].str(), '0'],
		['proveedor@easypoint.mx', 'Aventuras Sierra Gorda', 'provider', '0', prov_ids[0].str()],
	]
	for u in users {
		a.db.insert('users', {
			'email': u[0], 'password_hash': hash, 'name': u[1], 'role': u[2], 'point_id': u[3], 'provider_id': u[4], 'active': '1'
		}) or {}
	}
	// paquetes de muestra
	for i, pid in point_ids {
		if i > 2 {
			break
		}
		a.db.insert('shipments', {
			'tracking_id': 'EP${rand_code(7)}'
			'status':      ['at_point', 'in_transit', 'pending'][i]
			'point_id':    pid.str()
		}) or {}
	}
	_ = exc_ids
}

// 0 = domingo … 6 = sábado
fn weekday_of(d string) int {
	// 1970-01-01 fue jueves (4)
	days := days_between('1970-01-01', d)
	mut w := (4 + days) % 7
	if w < 0 {
		w += 7
	}
	return w
}
