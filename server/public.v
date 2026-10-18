module main

import strings

// API pública (sin sesión): catálogo, cotizador, rastreo, guías, solicitudes, tickets, leads, club.

fn (mut a App) public_config() Resp {
	a.load_cfg()
	mut o := strings.new_builder(1024)
	o.write_string('{')
	mut first := true
	for k, v in a.cfgcache {
		if k.starts_with('ops.') || k.starts_with('econ.') || k.starts_with('cash.') || k.starts_with('settlement.')
			|| k.starts_with('secret.') || k.starts_with('biz.') || k.starts_with('setup.') || k.starts_with('sys.')
			|| k in ['payments.clabe', 'payments.bank', 'payments.beneficiary'] {
			continue
		}
		if !first {
			o.write_string(',')
		}
		first = false
		o.write_string(jstr(k) + ':')
		if v == 'true' || v == 'false' {
			o.write_string(v)
		} else if v != '' && (qn(v) == v) && v != '-' {
			o.write_string(v)
		} else {
			o.write_string(jstr(v))
		}
	}
	o.write_string('}')
	return json_ok(o.str())
}

fn (mut a App) public_points() Resp {
	rs := a.db.rows('SELECT id,name,address,lat,lng,whatsapp,maps_url,hours,tier,rating FROM points WHERE active=1 ORDER BY name') or {
		[]Row{}
	}
	return json_ok(a.schema.rows_json(rs))
}

fn (mut a App) public_services() Resp {
	rs := a.db.rows('SELECT id,name,category,description,unit,provider_name,icon FROM services WHERE active=1 ORDER BY category,name') or {
		[]Row{}
	}
	return json_ok(a.schema.rows_json(rs))
}

// Salidas futuras abiertas con cupo restante (una consulta para todas las excursiones).
fn (mut a App) departures_json(exc_filter string) map[string]string {
	rs := a.db.rows("SELECT d.id, d.excursion_id, d.date, d.status, COALESCE(NULLIF(d.capacity,0), e.max_capacity) AS n_capacity, (SELECT COALESCE(SUM(b.people),0) FROM bookings b WHERE b.excursion_id=d.excursion_id AND b.excursion_date=d.date AND b.status<>'cancelled') AS n_taken FROM departures d JOIN excursions e ON e.id=d.excursion_id WHERE d.date>=UTC_DATE() AND d.status='open' ${exc_filter} ORDER BY d.date") or {
		[]Row{}
	}
	mut by := map[string][]string{}
	for r in rs {
		cap := r['n_capacity'].int()
		taken := r['n_taken'].int()
		remaining := if cap > 0 { if cap - taken > 0 { cap - taken } else { 0 } } else { -1 }
		sold_out := cap > 0 && taken >= cap
		item := '{"id":${r['id']},"date":${jstr(r['date'])},"capacity":${cap},"taken":${taken},"remaining":${if remaining < 0 { 'null' } else { remaining.str() }},"soldOut":${sold_out}}'
		by[r['excursion_id']] << item
	}
	mut out := map[string]string{}
	for k, v in by {
		out[k] = '[' + v.join(',') + ']'
	}
	return out
}

fn (mut a App) public_excursions() Resp {
	rs := a.db.rows('SELECT e.id, e.provider_id, e.name, e.destination, e.description, e.price, e.duration, e.image_url, e.max_capacity, e.min_people, e.deposit_amount, e.cutoff_days, e.policy, e.meeting_point, e.departure_time, e.featured, e.tags, e.rating_avg, e.rating_count, p.name AS provider_name FROM excursions e LEFT JOIN providers p ON p.id=e.provider_id WHERE e.active=1 ORDER BY e.featured DESC, e.id') or {
		[]Row{}
	}
	deps := a.departures_json('')
	mut parts := []string{}
	for r in rs {
		js := a.schema.row_json(r)
		d := deps[r['id']] or { '[]' }
		parts << js[..js.len - 1] + ',"departures":' + d + '}'
	}
	return json_ok('[' + parts.join(',') + ']')
}

fn (mut a App) public_availability(id i64) Resp {
	exc := a.db.get('excursions', id) or { empty_row() }
	if exc.len == 0 {
		return fail(404, 'not_found')
	}
	deps := a.departures_json('AND d.excursion_id=${id}')
	return json_ok('{"excursion_id":${id},"capacity":${exc['max_capacity'].int()},"dates":${deps[id.str()] or { '[]' }}}')
}

fn (mut a App) public_quote(r &Req) Resp {
	exc_id := (r.query['excursion'] or { r.query['excursion_id'] or { '0' } }).i64()
	exc := a.db.get('excursions', exc_id) or { empty_row() }
	if exc.len == 0 || exc['active'] != '1' {
		return fail(404, 'excursion_not_found')
	}
	date := r.query['date'] or { '' }
	phone := r.query['phone'] or { '' }
	qt := a.quote(exc, date, (r.query['people'] or { '1' }).int(), QuoteOpts{
		promo:   r.query['promo'] or { '' }
		protect: (r.query['protect'] or { '0' }) == '1'
		club:    if phone != '' { a.is_club(phone) } else { false }
	})
	return json_ok(qt.to_json())
}

fn (mut a App) referral_check(r &Req) Resp {
	code := (r.query['code'] or { '' }).trim_space().to_upper()
	c := a.db.one('SELECT name FROM customers WHERE referral_code=${q(code)}') or { empty_row() }
	if code == '' || c.len == 0 {
		return json_ok('{"valid":false}')
	}
	return json_ok('{"valid":true,"from":${jstr(first_word(c['name']))},"reward":${a.cfg_f('referral.reward_referee', 100):.0f}}')
}

fn first_word(s string) string {
	return s.trim_space().all_before(' ')
}

// Rastreo público: sólo lo que el destinatario necesita (nunca PII).
fn (mut a App) public_track(code string) Resp {
	c := code.trim_space().to_upper()
	if c == '' {
		return fail(400, 'missing_code')
	}
	s := a.db.one('SELECT s.tracking_id, s.status, s.created_at, s.updated_at, p.name AS point_name, p.address AS point_address, p.hours AS point_hours, p.maps_url AS point_maps FROM shipments s LEFT JOIN points p ON p.id=s.point_id WHERE s.tracking_id=${q(c)}') or {
		empty_row()
	}
	if s.len == 0 {
		return fail(404, 'not_found')
	}
	return json_ok(a.schema.row_json(s))
}

fn (mut a App) track_alert(r &Req) Resp {
	if a.limited(r, 'alert', 10, 60) {
		return fail(429, 'rate_limited')
	}
	b := body_map(r)
	email := (b['email'] or { '' }).trim_space()
	tid := (b['tracking_id'] or { '' }).trim_space().to_upper()
	if !is_email(email) || tid == '' {
		return fail(400, 'invalid')
	}
	a.db.insert('tracking_alerts', {
		'tracking_id': tid
		'email':       email
	}) or {}
	return json_status(201, '{"ok":true}')
}

// ── guías de paquetería ─────────────────────────────────────────────────────
fn volumetric_kg(l f64, w f64, h f64) f64 {
	v := l * w * h
	return if v > 0 { v / 5000.0 } else { 0 }
}

// Tarifa de convenio (configurable). Mismo cálculo para web y mostrador.
fn (mut a App) guide_price(carrier string, service string, weight f64, l f64, w f64, h f64, same_zone bool) (f64, f64) {
	actual := if weight < 0.5 { 0.5 } else { weight }
	vol := volumetric_kg(l, w, h)
	billable := if vol > actual { vol } else { actual }
	base := if carrier == 'dhl' { a.cfg_f('guides.dhl_base', 139) } else { a.cfg_f('guides.estafeta_base', 109) }
	per := if carrier == 'dhl' { a.cfg_f('guides.dhl_perkg', 38) } else { a.cfg_f('guides.estafeta_perkg', 30) }
	mut extra_kg := int(billable + 0.999) - 1
	if extra_kg < 0 {
		extra_kg = 0
	}
	mut price := base + f64(extra_kg) * per
	if service == 'express' {
		price *= a.cfg_f('guides.express_mult', 1.6)
	}
	if !same_zone {
		price *= a.cfg_f('guides.national_mult', 1.4)
	}
	return f64(int(price + 0.5)), billable
}

// Comisión del punto por tramos del peso cobrable.
fn guide_commission(kg f64) f64 {
	if kg <= 1 {
		return 10
	}
	if kg <= 5 {
		return 20
	}
	if kg <= 20 {
		return 35
	}
	return 50
}

fn (mut a App) guide_quote(r &Req) Resp {
	b := body_map(r)
	carrier := if (b['carrier'] or { r.query['carrier'] or { 'estafeta' } }) == 'dhl' { 'dhl' } else { 'estafeta' }
	service := if (b['service'] or { r.query['service'] or { 'standard' } }) == 'express' { 'express' } else { 'standard' }
	weight := (b['weight_kg'] or { r.query['weight_kg'] or { '1' } }).f64()
	l := (b['length_cm'] or { r.query['length_cm'] or { '0' } }).f64()
	w := (b['width_cm'] or { r.query['width_cm'] or { '0' } }).f64()
	h := (b['height_cm'] or { r.query['height_cm'] or { '0' } }).f64()
	ocp := b['origin_cp'] or { r.query['origin_cp'] or { '' } }
	dcp := b['dest_cp'] or { r.query['dest_cp'] or { '' } }
	same := ocp.len >= 3 && dcp.len >= 3 && ocp[..3] == dcp[..3]
	price, billable := a.guide_price(carrier, service, weight, l, w, h, same)
	declared := (b['declared_value'] or { r.query['declared_value'] or { '0' } }).f64()
	ins := if declared > 0 { round2(max_f(a.cfg_f('guides.insurance_min', 20), declared * a.cfg_f('guides.insurance_pct', 1.5) / 100.0)) } else { 0.0 }
	return json_ok('{"carrier":${jstr(carrier)},"service":${jstr(service)},"billable_kg":${billable:.2f},"price":${price:.2f},"insurance_fee":${ins:.2f},"zone":${jstr(if same { 'local' } else { 'nacional' })},"commission":${guide_commission(billable):.2f}}')
}

fn max_f(x f64, y f64) f64 {
	return if x > y { x } else { y }
}

// ── solicitudes de afiliación ───────────────────────────────────────────────
fn score_application(addr string, wa string, phone string, maps string, horarios string, desc string) int {
	mut s := 0
	if addr.len > 8 {
		s += 20
	}
	if phone10(wa).len == 10 {
		s += 20
	}
	if phone10(phone).len == 10 {
		s += 10
	}
	if maps != '' {
		s += 15
	}
	if horarios != '' {
		s += 15
	}
	if desc.len > 20 {
		s += 20
	}
	return s
}

fn (mut a App) create_application(r &Req) Resp {
	if a.limited(r, 'apply', 8, 300) {
		return fail_code(429, 'rate_limited', 'Demasiadas solicitudes.')
	}
	b := body_map(r)
	if (b['website'] or { '' }) != '' { // honeypot
		return json_status(201, '{"ok":true}')
	}
	name := (b['business_name'] or { '' }).trim_space()
	phone := (b['contact_phone'] or { b['whatsapp'] or { '' } }).trim_space()
	if name.len < 3 || phone10(phone).len < 10 {
		return fail_code(400, 'invalid', 'Indica el nombre del negocio y un teléfono de 10 dígitos.')
	}
	score := score_application(b['address'] or { '' }, b['whatsapp'] or { '' }, phone, b['maps_url'] or { '' }, b['horarios'] or { '' }, b['description'] or { '' })
	sla_h := a.cfg_i('ops.application_sla_h', 24)
	id := a.db.insert('partner_applications', {
		'business_name': name
		'contact_name':  b['contact_name'] or { '' }
		'contact_phone': phone
		'whatsapp':      b['whatsapp'] or { phone }
		'email':         b['email'] or { '' }
		'address':       b['address'] or { '' }
		'maps_url':      b['maps_url'] or { '' }
		'description':   b['description'] or { '' }
		'horarios':      b['horarios'] or { '' }
		'kind':          b['kind'] or { 'point' }
		'status':        'pending'
		'score':         score.str()
		'sla_due':       add_hours_dt(now_dt(), sla_h)
		'utm':           b['utm'] or { '' }
	}) or { return fail(500, 'db_error') }
	a.notify(NotifyIn{
		email:     b['email'] or { '' }
		phone:     phone
		name:      b['contact_name'] or { name }
		template:  'application_received'
		vars:      {
			'name':  b['contact_name'] or { name }
			'point': name
			'hours': sla_h.str()
		}
		entity:    'application'
		entity_id: id
		dedupe:    'app-rx:${id}'
	})
	a.task(TaskIn{
		kind:      'application'
		role:      'sales'
		priority:  if score >= 70 { 'high' } else { 'normal' }
		title:     'Contactar aspirante: ${name} (score ${score})'
		detail:    b['address'] or { '' }
		entity:    'application'
		entity_id: id
		dedupe:    'app:${id}'
		action:    'whatsapp'
		payload:   wa_link(b['whatsapp'] or { phone }, 'Hola, recibimos la solicitud de ${name} para ser punto Easypoint. ¿Platicamos?')
		due_at:    add_hours_dt(now_dt(), sla_h)
	})
	return json_status(201, '{"ok":true,"id":${id},"score":${score}}')
}

// ── tickets (embudo privado de quejas) ──────────────────────────────────────
fn classify_priority(kind string, text string) string {
	if contains_any(text, ['estaf', 'fraude', 'doble cobro', 'cobraron', 'no me llega', 'demanda', 'profeco', 'denuncia']) {
		return 'urgent'
	}
	if kind == 'complaint' || contains_any(text, ['reembolso', 'dinero', 'cancel', 'queja', 'mal servicio']) {
		return 'high'
	}
	return 'normal'
}

fn (mut a App) create_ticket(r &Req) Resp {
	if a.limited(r, 'ticket', 8, 300) {
		return fail_code(429, 'rate_limited', 'Demasiados mensajes.')
	}
	b := body_map(r)
	if (b['website'] or { '' }) != '' {
		return json_status(201, '{"ok":true}')
	}
	msg := (b['message'] or { '' }).trim_space()
	if msg.len < 5 {
		return fail_code(400, 'invalid', 'Cuéntanos qué pasó.')
	}
	kind := if (b['kind'] or { 'question' }) in ['complaint', 'question', 'refund_request', 'other'] { b['kind'] } else { 'question' }
	prio := classify_priority(kind, msg + ' ' + (b['subject_ref'] or { '' }))
	first_h := a.cfg_i('support.sla_first_response_h', 2)
	hours := if prio == 'urgent' && first_h > 1 { 1 } else { first_h }
	code := 'TK-' + rand_code(5)
	mut bid := i64(0)
	ref := (b['subject_ref'] or { '' }).trim_space()
	if ref != '' {
		bk := a.booking_by_code(ref)
		if bk.len > 0 {
			bid = bk['id'].i64()
		}
	}
	id := a.db.insert('support_tickets', {
		'code':           code
		'kind':           kind
		'subject_ref':    ref
		'booking_id':     bid.str()
		'customer_name':  b['customer_name'] or { '' }
		'customer_phone': b['customer_phone'] or { '' }
		'customer_email': b['customer_email'] or { '' }
		'message':        msg
		'status':         'open'
		'priority':       prio
		'sla_due':        add_hours_dt(now_dt(), hours)
	}) or { return fail(500, 'db_error') }
	a.notify(NotifyIn{
		email:     b['customer_email'] or { '' }
		phone:     b['customer_phone'] or { '' }
		name:      b['customer_name'] or { '' }
		template:  'ticket_received'
		vars:      {
			'name':  if (b['customer_name'] or { '' }) != '' { b['customer_name'] } else { 'cliente' }
			'hours': hours.str()
			'code':  code
		}
		entity:    'ticket'
		entity_id: id
		dedupe:    'tk-rx:${id}'
	})
	a.task(TaskIn{
		kind:      'ticket'
		role:      'admin'
		priority:  if prio == 'urgent' { 'urgent' } else if prio == 'high' { 'high' } else { 'normal' }
		title:     'Ticket ${code}: ${if ref != '' { ref } else { kind }}'
		detail:    '${b['customer_name'] or { '' }} — ${msg}'
		entity:    'support_tickets'
		entity_id: id
		dedupe:    'ticket:${id}'
		action:    'open_ticket'
		due_at:    add_hours_dt(now_dt(), hours)
	})
	return json_status(201, '{"ok":true,"code":${jstr(code)},"priority":${jstr(prio)}}')
}

// ── leads (captura estilo growth-kit: honeypot + tiempo mínimo + atribución) ─
fn (mut a App) create_lead(r &Req) Resp {
	if a.limited(r, 'lead', 10, 300) {
		return fail_code(429, 'rate_limited', 'Demasiados envíos.')
	}
	b := body_map(r)
	if (b['website'] or { '' }) != '' {
		return json_status(201, '{"ok":true}')
	}
	elapsed := (b['elapsed_ms'] or { '3000' }).int()
	if elapsed < 1200 { // bots que llenan el formulario al instante
		return json_status(201, '{"ok":true}')
	}
	name := (b['name'] or { '' }).trim_space()
	phone := (b['phone'] or { '' }).trim_space()
	email := (b['email'] or { '' }).trim_space()
	if name.len < 2 || (phone10(phone).len < 10 && !is_email(email)) {
		return fail_code(400, 'invalid', 'Indica tu nombre y un WhatsApp o correo.')
	}
	id := a.db.insert('leads', {
		'name':    name
		'phone':   phone
		'email':   email
		'type':    b['type'] or { '' }
		'message': b['message'] or { '' }
		'utm':     b['utm'] or { '' }
		'page':    b['page'] or { '' }
	}) or { return fail(500, 'db_error') }
	a.task(TaskIn{
		kind:      'lead'
		role:      'sales'
		priority:  'high'
		title:     'Nuevo lead: ${name} (${b['type'] or { 'web' }})'
		detail:    b['message'] or { '' }
		entity:    'lead'
		entity_id: id
		dedupe:    'lead:${id}'
		action:    'whatsapp'
		payload:   wa_link(phone, 'Hola ${name}, soy de Easypoint. Vi tu mensaje y quiero ayudarte.')
		due_at:    add_hours_dt(now_dt(), 4)
	})
	return json_status(201, '{"ok":true}')
}

// ── Easypoint Club ──────────────────────────────────────────────────────────
fn (mut a App) club_join(r &Req) Resp {
	if a.limited(r, 'club', 6, 300) {
		return fail(429, 'rate_limited')
	}
	b := body_map(r)
	phone := (b['phone'] or { '' }).trim_space()
	name := (b['name'] or { '' }).trim_space()
	if phone10(phone).len < 10 || name.len < 2 {
		return fail_code(400, 'invalid', 'Indica nombre y WhatsApp.')
	}
	mode := a.pay_mode()
	price := a.cfg_f('club.price_month', 99)
	if mode == 'unset' {
		return pay_unset()
	}
	if mode != 'demo' {
		// en producción la membresía se activa al confirmar el pago (webhook / confirmación manual)
		ref := 'CLUB-' + rand_code(6)
		a.db.insert('payments', {
			'kind': 'club', 'ref': ref, 'label': 'Club ${name}', 'amount': qf(price), 'net': qf(price)
			'method': 'transfer', 'status': 'pending_confirm', 'gateway_ref': ref
		}) or {}
		a.task(TaskIn{
			kind:     'confirm_club'
			role:     'admin'
			priority: 'high'
			title:    'Activar Club para ${name} (${phone10(phone)})'
			detail:   'Pago pendiente ${fmt_money(price)} · ${ref}'
			dedupe:   'club:${ref}'
			action:   'confirm_club'
			payload:  '${phone10(phone)}|${name}'
		})
		return json_ok('{"ok":true,"pending":true,"reference":${jstr(ref)},"price":${price:.2f}}')
	}
	until := a.activate_club(phone, name, b['email'] or { '' }, price)
	return json_ok('{"ok":true,"pending":false,"until":${jstr(until)},"price":${price:.2f}}')
}

fn (mut a App) activate_club(phone string, name string, email string, price f64) string {
	days := a.cfg_i('club.duration_days', 30)
	c := a.upsert_customer(phone, name, email, 'club', '')
	start := if c['club_until'] != '' && c['club_until'] >= today() { c['club_until'] } else { today() }
	until := add_days(start, days)
	a.db.exec("UPDATE customers SET tier='club', club_until=${q(until)} WHERE phone=${q(phone10(phone))}") or {}
	a.db.insert('memberships', {
		'customer_phone': phone10(phone)
		'customer_name':  name
		'starts_at':      start
		'ends_at':        until
		'price':          qf(price)
		'status':         'active'
	}) or {}
	a.notify(NotifyIn{
		email:    email
		phone:    phone
		name:     name
		template: 'club_welcome'
		vars:     {
			'name':     name
			'until':    until
			'cashback': '${a.cfg_f('club.cashback_pct', 5):.0f}'
		}
		dedupe:   'club:${phone10(phone)}:${until}'
	})
	return until
}

// ── webhooks de pasarela ────────────────────────────────────────────────────
fn (mut a App) webhook_mercadopago(r &Req) Resp {
	tok := a.mp_token()
	if tok == '' {
		return fail(503, 'gateway_unavailable')
	}
	b := body_map(r)
	pid := b['data.id'] or { (r.query['data.id'] or { r.query['id'] or { '' } }) }
	mut payment_id := pid
	if payment_id == '' {
		// el cuerpo de MP anida data.id; extracción directa
		payment_id = json_field(r.body, 'id')
	}
	if payment_id == '' {
		return json_ok('{"ok":true}')
	}
	st, ext, amt := mp_payment_status(tok, payment_id) or { return fail(502, 'gateway_error') }
	if st != 'approved' {
		return json_ok('{"ok":true,"status":${jstr(st)}}')
	}
	code := ext.all_before('|')
	bk := a.booking_by_code(code)
	if bk.len == 0 {
		return json_ok('{"ok":true,"ignored":true}')
	}
	res := a.apply_payment(PayIn{
		booking_id:  bk['id'].i64()
		amount:      amt
		method:      'card_mp'
		channel:     'mercadopago'
		label:       'Mercado Pago ${payment_id} · ${bk['customer_name']}'
		gateway_ref: 'mp:${payment_id}'
		actor:       'mercadopago'
	})
	return json_ok('{"ok":true,"applied":${res.ok},"reason":${jstr(res.err)}}')
}

// Reseñas públicas: sólo las de 4-5 estrellas con texto (las demás van al canal privado).
fn (mut a App) public_reviews() Resp {
	rs := a.db.rows("SELECT customer_name, excursion_name, rating, review_text FROM bookings WHERE rating>=4 AND review_text<>'' ORDER BY id DESC LIMIT 6") or {
		[]Row{}
	}
	mut out := []string{}
	for r in rs {
		out << '{"name":${jstr(first_word(r['customer_name']))},"excursion":${jstr(r['excursion_name'])},"rating":${r['rating'].int()},"quote":${jstr(r['review_text'])}}'
	}
	return json_ok('[' + out.join(',') + ']')
}
