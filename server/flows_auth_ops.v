module main

import crypto.sha256

// Sesión, y flujos del punto (operador) y del chofer. Toda regla de dinero se recalcula en el servidor.

// ── sesión ──────────────────────────────────────────────────────────────────
fn (mut a App) user_json(u User) string {
	return '{"id":${u.id},"email":${jstr(u.email)},"name":${jstr(u.name)},"role":${jstr(u.role)},"point_id":${u.point_id},"provider_id":${u.provider_id},"phone":${jstr(u.phone)}}'
}

fn (mut a App) login(r &Req) Resp {
	b := body_map(r)
	email := (b['email'] or { '' }).trim_space().to_lower()
	pass := b['password'] or { '' }
	if a.over_limit(r, 'login:${email}', 8, 900) || a.over_limit(r, 'login', env_or('EP_LOGIN_GLOBAL_LIMIT', '60').int(), 900) {
		return fail_code(429, 'rate_limited', 'Demasiados intentos. Espera unos minutos.')
	}
	row := a.db.one('SELECT * FROM users WHERE email=${q(email)} AND active=1 LIMIT 1') or { empty_row() }
	ok := row.len > 0 && verify_password(pass, row['password_hash'])
	if !ok {
		a.hit(r, 'login:${email}', 900)
		a.hit(r, 'login', 900)
		a.audit(email, 'login_failed', 'users', 0, r.ip)
		return fail_code(401, 'invalid_credentials', 'Correo o contraseña incorrectos.')
	}
	u := row_user(row)
	a.db.exec('UPDATE users SET last_login_at=${q(now_dt())} WHERE id=${u.id}') or {}
	if u.point_id > 0 {
		a.db.exec('UPDATE points SET last_activity_at=${q(now_dt())} WHERE id=${u.point_id}') or {}
	}
	tok := jwt_mint(a.tsec(), u.id, u.role, 14 * 86400)
	return json_ok('{"token":${jstr(tok)},"user":${a.user_json(u)}}')
}

fn (mut a App) change_password(u User, r &Req) Resp {
	b := body_map(r)
	row := a.db.get('users', u.id) or { empty_row() }
	if !verify_password(b['current'] or { '' }, row['password_hash']) {
		return fail_code(403, 'invalid_credentials', 'La contraseña actual no coincide.')
	}
	np := b['new'] or { '' }
	if np.len < 8 {
		return fail_code(400, 'weak_password', 'Usa al menos 8 caracteres.')
	}
	a.db.exec('UPDATE users SET password_hash=${q(hash_password(np))} WHERE id=${u.id}') or {}
	return json_ok('{"ok":true}')
}

fn (mut a App) reset_request(r &Req) Resp {
	if a.limited(r, 'reset', 5, 900) {
		return fail(429, 'rate_limited')
	}
	email := (body_map(r)['email'] or { '' }).trim_space().to_lower()
	row := a.db.one('SELECT * FROM users WHERE email=${q(email)} AND active=1') or { empty_row() }
	if row.len > 0 {
		tok := rand_token(20)
		a.db.exec('UPDATE users SET reset_token=${q(sha_hex(tok))}, reset_expires=${q(add_hours_dt(now_dt(), 1))} WHERE id=${row['id'].i64()}') or {}
		a.notify(NotifyIn{
			email:    email
			name:     row['name']
			template: 'password_reset'
			vars:     {
				'name': row['name']
				'link': '${a.app_url()}/app/#/reset?token=${tok}'
			}
			prefer:   'email'
			dedupe:   'reset:${row['id']}:${tok[..8]}'
		})
	}
	return json_ok('{"ok":true}') // no revela si el correo existe
}

fn sha_hex(s string) string {
	return sha256.hexhash(s)
}

fn (mut a App) reset_confirm(r &Req) Resp {
	b := body_map(r)
	tok := b['token'] or { '' }
	np := b['password'] or { '' }
	if tok.len < 20 || np.len < 8 {
		return fail_code(400, 'invalid', 'Datos incompletos.')
	}
	row := a.db.one("SELECT id FROM users WHERE reset_token=${q(sha_hex(tok))} AND reset_expires > ${q(now_dt())} AND reset_token<>'' LIMIT 1") or {
		empty_row()
	}
	if row.len == 0 {
		return fail_code(400, 'expired', 'El enlace venció. Solicita uno nuevo.')
	}
	a.db.exec("UPDATE users SET password_hash=${q(hash_password(np))}, reset_token='', reset_expires=NULL WHERE id=${row['id'].i64()}") or {}
	return json_ok('{"ok":true}')
}

// ── punto (operador) ────────────────────────────────────────────────────────
fn (mut a App) point_for(u User, b map[string]string) (i64, string) {
	mut pid := u.point_id
	if u.role == 'admin' {
		if x := b['point_id'] {
			if x.i64() > 0 {
				pid = x.i64()
			}
		}
	}
	if pid == 0 {
		return 0, ''
	}
	p := a.db.get('points', pid) or { empty_row() }
	return pid, p['name']
}

fn (mut a App) ops_booking_lookup(u User, r &Req) Resp {
	code := (r.query['code'] or { '' }).trim_space()
	bk := a.booking_by_code(code)
	if bk.len == 0 {
		return fail_code(404, 'not_found', 'No encontramos esa reserva.')
	}
	o := pick(bk, ['code', 'excursion_name', 'destination', 'excursion_date', 'customer_name', 'customer_phone', 'people',
		'total', 'amount_paid', 'balance', 'payment_status', 'status', 'stage'])
	wal := a.wallet_balance(bk['customer_phone'])
	js := a.schema.row_json(o)
	return json_ok(js[..js.len - 1] + ',"wallet_balance":${wal:.2f}}')
}

// Abono en efectivo recibido en el punto: queda retenido hasta que pase el chofer.
fn (mut a App) ops_cash_payment(u User, r &Req) Resp {
	b := body_map(r)
	pid, pname := a.point_for(u, b)
	if pid == 0 {
		return fail_code(400, 'no_point', 'Tu usuario no está ligado a un punto.')
	}
	bk := a.booking_by_code(b['code'] or { '' })
	if bk.len == 0 {
		return fail_code(404, 'not_found', 'No encontramos esa reserva.')
	}
	amount := (b['amount'] or { '0' }).f64()
	if amount <= 0 {
		return fail_code(400, 'invalid_amount', 'Indica el monto recibido.')
	}
	remaining := bk['balance'].f64()
	if amount > remaining + 0.005 {
		return fail_code(400, 'amount_exceeds_balance', 'El abono excede el saldo (${fmt_money(remaining)}).')
	}
	res := a.apply_payment(PayIn{
		booking_id: bk['id'].i64()
		amount:     amount
		method:     'cash'
		channel:    'point_cash'
		label:      'Abono en punto: ${bk['customer_name']} (${bk['code']})'
		point_id:   pid
		point_name: pname
		ledger:     'held_at_point'
		actor:      u.email
	})
	if !res.ok {
		return fail_code(409, res.err, 'No se pudo registrar el abono.')
	}
	big := a.cfg_f('cash.large_payment_flag', 8000)
	if amount >= big {
		a.flag('medium', 'large_cash', 'payments', res.ledger_id, 'Abono en efectivo de ${mxn(amount)} en ${pname}', 'bigcash:${res.ledger_id}')
	}
	fresh := a.booking_by_code(bk['code'])
	return json_status(201, '{"ok":true,"payment_id":${res.ledger_id},"amount_paid":${fresh['amount_paid'].f64():.2f},"balance":${fresh['balance'].f64():.2f},"payment_status":${jstr(fresh['payment_status'])},"status":${jstr(fresh['status'])}}')
}

fn (mut a App) commission_for(kind string, point_id i64, amount f64) f64 {
	if kind != 'excursion' || point_id == 0 {
		return 0
	}
	p := a.db.get('points', point_id) or { return 0 }
	c := if p['commission_type'] == 'fixed' { p['commission_amount'].f64() } else { round2(amount * p['commission_rate'].f64() / 100.0) }
	return if c > amount { amount } else { c }
}

fn (mut a App) ops_service_order(u User, r &Req) Resp {
	b := body_map(r)
	pid, pname := a.point_for(u, b)
	if pid == 0 {
		return fail_code(400, 'no_point', 'Tu usuario no está ligado a un punto.')
	}
	sv := a.db.get('services', (b['service_id'] or { '0' }).i64()) or { empty_row() }
	if sv.len == 0 || sv['active'] != '1' {
		return fail_code(404, 'service_not_found', 'Servicio no disponible.')
	}
	amount := (b['amount'] or { '0' }).f64()
	if amount <= 0 {
		return fail_code(400, 'invalid_amount', 'Indica el monto de la venta.')
	}
	mut commission := if sv['commission_type'] == 'fixed' { sv['commission_amount'].f64() } else { round2(amount * sv['commission_rate'].f64() / 100.0) }
	if commission > amount {
		commission = amount
	}
	id := a.db.insert('service_orders', {
		'service_id':     sv['id']
		'service_name':   sv['name']
		'category':       sv['category']
		'point_id':       pid.str()
		'point_name':     pname
		'customer_name':  b['customer_name'] or { '' }
		'customer_phone': b['customer_phone'] or { '' }
		'amount':         qf(amount)
		'commission':     qf(commission)
		'status':         'completed'
		'notes':          b['notes'] or { '' }
	}) or { return fail(500, 'db_error') }
	a.db.insert('payments', {
		'kind':       'service'
		'ref':        id.str()
		'label':      sv['name']
		'point_id':   pid.str()
		'point_name': pname
		'amount':     qf(amount)
		'commission': qf(commission)
		'net':        qf(amount - commission)
		'method':     'cash'
		'status':     'held_at_point'
	}) or {}
	a.db.exec('UPDATE points SET last_activity_at=${q(now_dt())} WHERE id=${pid}') or {}
	return json_status(201, '{"ok":true,"id":${id},"commission":${commission:.2f}}')
}

fn (mut a App) ops_guide_sale(u User, r &Req) Resp {
	b := body_map(r)
	pid, pname := a.point_for(u, b)
	if pid == 0 {
		return fail_code(400, 'no_point', 'Tu usuario no está ligado a un punto.')
	}
	carrier := if (b['carrier'] or { 'estafeta' }) == 'dhl' { 'dhl' } else { 'estafeta' }
	service := if (b['service'] or { 'standard' }) == 'express' { 'express' } else { 'standard' }
	weight := (b['weight_kg'] or { '1' }).f64()
	l := (b['length_cm'] or { '0' }).f64()
	w := (b['width_cm'] or { '0' }).f64()
	h := (b['height_cm'] or { '0' }).f64()
	ocp := b['origin_cp'] or { '' }
	dcp := b['dest_cp'] or { '' }
	same := ocp.len >= 3 && dcp.len >= 3 && ocp[..3] == dcp[..3]
	price, billable := a.guide_price(carrier, service, weight, l, w, h, same)
	declared := (b['declared_value'] or { '0' }).f64()
	insured := (b['insured'] or { '0' }) == '1' && declared > 0
	ins_fee := if insured { round2(max_f(a.cfg_f('guides.insurance_min', 20), declared * a.cfg_f('guides.insurance_pct', 1.5) / 100.0)) } else { 0.0 }
	total := price + ins_fee
	commission := guide_commission(billable)
	pay_now := (b['paid'] or { '1' }) == '1'
	id := a.db.insert('shipping_guides', {
		'carrier':        carrier
		'service':        service
		'origin_cp':      ocp
		'dest_cp':        dcp
		'origin_address': b['origin_address'] or { '' }
		'dest_address':   b['dest_address'] or { '' }
		'sender_name':    b['sender_name'] or { '' }
		'sender_phone':   b['sender_phone'] or { '' }
		'recipient_name': b['recipient_name'] or { '' }
		'recipient_phone': b['recipient_phone'] or { '' }
		'weight_kg':      weight.str()
		'length_cm':      l.str()
		'width_cm':       w.str()
		'height_cm':      h.str()
		'declared_value': qf(declared)
		'insured':        if insured { '1' } else { '0' }
		'insurance_fee':  qf(ins_fee)
		'price':          qf(total)
		'commission':     qf(commission)
		'status':         if pay_now { 'paid' } else { 'quoted' }
		'payment_status': if pay_now { 'paid' } else { 'pending' }
		'payment_method': if pay_now { 'cash' } else { '' }
		'paid_at':        if pay_now { now_dt() } else { '' }
		'point_id':       pid.str()
		'point_name':     pname
		'notes':          b['notes'] or { '' }
	}) or { return fail(500, 'db_error') }
	if pay_now {
		a.db.insert('payments', {
			'kind':       'guide'
			'ref':        id.str()
			'label':      'Guía ${carrier.to_upper()}'
			'point_id':   pid.str()
			'point_name': pname
			'amount':     qf(total)
			'commission': qf(commission)
			'net':        qf(total - commission)
			'method':     'cash'
			'status':     'held_at_point'
		}) or {}
	}
	a.db.exec('UPDATE points SET last_activity_at=${q(now_dt())} WHERE id=${pid}') or {}
	return json_status(201, '{"ok":true,"id":${id},"price":${total:.2f},"commission":${commission:.2f},"billable_kg":${billable:.2f}}')
}

fn (mut a App) ops_guide_generate(u User, id i64, r &Req) Resp {
	g := a.db.get('shipping_guides', id) or { empty_row() }
	if g.len == 0 || (u.role == 'operator' && g['point_id'].i64() != u.point_id) {
		return fail(404, 'not_found')
	}
	if g['status'] !in ['paid', 'generated'] {
		return fail_code(400, 'not_paid', 'La guía debe estar pagada para generarse.')
	}
	tn := (body_map(r)['tracking_number'] or { '' }).trim_space()
	if tn.len < 4 {
		return fail_code(400, 'tracking_required', 'Captura el número de guía del transportista.')
	}
	a.db.update('shipping_guides', id, {
		'tracking_number': tn
		'status':          'generated'
	}) or {}
	a.close_tasks('guide:${id}')
	a.event('guide', id, g['status'], 'generated', u.email, tn)
	return json_ok('{"ok":true}')
}

fn (mut a App) ops_shipment(u User, r &Req) Resp {
	b := body_map(r)
	pid, _ := a.point_for(u, b)
	tid := (b['tracking_id'] or { '' }).trim_space().to_upper()
	if tid.len < 4 {
		return fail_code(400, 'tracking_required', 'Escanea o captura el número de rastreo.')
	}
	if a.db.count('shipments', 'tracking_id=${q(tid)}') > 0 {
		return fail_code(409, 'duplicate', 'Ese paquete ya está registrado.')
	}
	id := a.db.insert('shipments', {
		'tracking_id':     tid
		'status':          'at_point'
		'point_id':        pid.str()
		'recipient_name':  b['recipient_name'] or { '' }
		'recipient_phone': b['recipient_phone'] or { '' }
		'recipient_email': b['recipient_email'] or { '' }
		'carrier':         b['carrier'] or { '' }
		'source':          'point'
	}) or { return fail(500, 'db_error') }
	a.shipment_changed(id, 'at_point')
	return json_status(201, '{"ok":true,"id":${id}}')
}

fn (mut a App) ops_shipment_status(u User, id i64, r &Req) Resp {
	s := a.db.get('shipments', id) or { empty_row() }
	if s.len == 0 || (u.role == 'operator' && s['point_id'].i64() != u.point_id) {
		return fail(404, 'not_found')
	}
	st := body_map(r)['status'] or { '' }
	if st !in ['pending', 'in_transit', 'at_point', 'delivered'] {
		return fail_code(400, 'bad_status', 'Estado no válido.')
	}
	a.db.update('shipments', id, {
		'status': st
	}) or {}
	a.shipment_changed(id, st)
	a.event('shipment', id, s['status'], st, u.email, '')
	return json_ok('{"ok":true}')
}

// Cambió un paquete: avisa a quien pidió alertas de rastreo y al destinatario.
fn (mut a App) shipment_changed(id i64, status string) {
	s := a.db.get('shipments', id) or { return }
	label := match status {
		'at_point' { 'ya está listo para recoger en tu punto Easypoint' }
		'in_transit' { 'va en camino' }
		'delivered' { 'fue entregado' }
		else { 'se registró' }
	}
	link := '${a.app_url()}/website/#/rastreo?code=${s['tracking_id']}'
	txt := 'Tu paquete ${s['tracking_id']} ${label}. Rastréalo: ${link}'
	alerts := a.db.rows('SELECT DISTINCT email FROM tracking_alerts WHERE tracking_id=${q(s['tracking_id'])}') or { []Row{} }
	for al in alerts {
		a.queue_raw('email', al['email'], 'Tu paquete ${s['tracking_id']}', txt, 'shipment', id, 'shp:${id}:${status}:${al['email']}')
	}
	if s['recipient_email'] != '' {
		a.queue_raw('email', s['recipient_email'], 'Tu paquete ${s['tracking_id']}', txt, 'shipment', id, 'shp:${id}:${status}:r')
	}
	if phone10(s['recipient_phone']).len == 10 {
		a.queue_raw('whatsapp', phone10(s['recipient_phone']), 'Tu paquete', txt, 'shipment', id, 'shp:${id}:${status}:w')
	}
}

fn (mut a App) queue_raw(channel string, to string, subject string, body string, entity string, entity_id i64, dedupe string) {
	if a.key_exists('outbox', dedupe) {
		return
	}
	a.db.insert('outbox', {
		'channel':    channel
		'recipient':  to
		'template':   'raw'
		'subject':    subject
		'body':       body
		'link':       if channel == 'whatsapp' { wa_link(to, body) } else { '' }
		'status':     'queued'
		'entity':     entity
		'entity_id':  entity_id.str()
		'dedupe_key': dedupe
	}) or {}
	a.key_add('outbox', dedupe)
}

fn (mut a App) ops_wallet_apply(u User, r &Req) Resp {
	b := body_map(r)
	bk := a.booking_by_code(b['code'] or { '' })
	if bk.len == 0 {
		return fail_code(404, 'not_found', 'Reserva no encontrada.')
	}
	avail := a.wallet_balance(bk['customer_phone'])
	owed := bk['balance'].f64()
	mut want := (b['amount'] or { '0' }).f64()
	if want <= 0 || want > avail {
		want = avail
	}
	if want > owed {
		want = owed
	}
	if want <= 0 {
		return json_ok('{"applied":0,"balance":${avail:.2f},"reason":"nothing_to_apply"}')
	}
	used := a.debit(bk['customer_phone'], want, 'manual_applied', bk['code'])
	if used <= 0 {
		return json_ok('{"applied":0,"balance":${avail:.2f},"reason":"nothing_to_apply"}')
	}
	res := a.apply_payment(PayIn{
		booking_id: bk['id'].i64()
		amount:     used
		method:     'credit'
		channel:    'wallet'
		label:      'Crédito aplicado'
		actor:      u.email
	})
	if !res.ok {
		a.credit(bk['customer_phone'], bk['customer_name'], used, 'credit_restored', bk['code'])
		return fail_code(409, res.err, 'No se pudo aplicar el crédito.')
	}
	return json_ok('{"applied":${used:.2f},"balance":${a.wallet_balance(bk['customer_phone']):.2f}}')
}

// ── chofer ──────────────────────────────────────────────────────────────────
fn haversine(lat1 f64, lng1 f64, lat2 f64, lng2 f64) f64 {
	return (lat1 - lat2) * (lat1 - lat2) + (lng1 - lng2) * (lng1 - lng2)
}

// Ruta del día: puntos con efectivo retenido, ordenados por vecino más cercano
// desde la posición del chofer (o desde el punto con más dinero).
fn (mut a App) driver_route(u User, r &Req) Resp {
	rs := a.db.rows("SELECT p.id, p.name, p.address, p.lat, p.lng, p.whatsapp, p.maps_url, p.hours, COUNT(y.id) AS n_count, SUM(y.net) AS n_net, SUM(y.amount) AS n_gross, MIN(y.created_at) AS oldest FROM payments y JOIN points p ON p.id=y.point_id WHERE y.status='held_at_point' AND y.method<>'credit' GROUP BY p.id") or {
		[]Row{}
	}
	mut pts := rs.clone()
	mut ordered := []Row{}
	mut cur_lat := (r.query['lat'] or { '0' }).f64()
	mut cur_lng := (r.query['lng'] or { '0' }).f64()
	has_pos := cur_lat != 0 || cur_lng != 0
	if !has_pos && pts.len > 0 {
		mut best := 0
		for i, p in pts {
			if p['n_net'].f64() > pts[best]['n_net'].f64() {
				best = i
			}
		}
		cur_lat = pts[best]['lat'].f64()
		cur_lng = pts[best]['lng'].f64()
	}
	for pts.len > 0 {
		mut bi := 0
		mut bd := 1e18
		for i, p in pts {
			d := haversine(cur_lat, cur_lng, p['lat'].f64(), p['lng'].f64())
			if d < bd {
				bd = d
				bi = i
			}
		}
		mut nxt := pts[bi]
		nxt['n_stop'] = (ordered.len + 1).str()
		nxt['n_days'] = (if nxt['oldest'] != '' { int(hours_since_dt(nxt['oldest']) / 24.0) } else { 0 }).str()
		ordered << nxt
		cur_lat = nxt['lat'].f64()
		cur_lng = nxt['lng'].f64()
		pts.delete(bi)
	}
	on_hand := a.db.scalar("SELECT COALESCE(SUM(collected_amount),0) FROM payments WHERE status='collected' AND collected_by=${u.id}") or { '0' }.f64()
	return json_ok('{"stops":${a.schema.rows_json(ordered)},"on_hand":${on_hand:.2f},"driver_limit":${a.cfg_f('cash.driver_limit', 5000):.0f}}')
}

// Recolecta todo el efectivo retenido de un punto (o pagos específicos).
fn (mut a App) driver_collect(u User, r &Req) Resp {
	b := body_map(r)
	pid := (b['point_id'] or { '0' }).i64()
	if pid == 0 {
		return fail_code(400, 'point_required', 'Indica el punto.')
	}
	rows := a.db.rows("SELECT * FROM payments WHERE point_id=${pid} AND status='held_at_point' AND method<>'credit' ORDER BY id") or {
		[]Row{}
	}
	if rows.len == 0 {
		return fail_code(404, 'nothing_to_collect', 'Ese punto no tiene efectivo retenido.')
	}
	mut net_total := 0.0
	mut calc := []map[string]f64{}
	for p in rows {
		amount := p['amount'].f64()
		mut com := p['commission'].f64()
		if p['kind'] == 'excursion' {
			com = a.commission_for('excursion', pid, amount)
		}
		if com > amount {
			com = amount
		}
		net := if amount > com { amount - com } else { 0.0 }
		calc << {
			'com': com
			'net': net
		}
		net_total += net
	}
	collected := if (b['collected_amount'] or { '' }) == '' { net_total } else { b['collected_amount'].f64() }
	rounding := round2(collected - net_total)
	if rounding > 10 || rounding < -10 {
		return fail_code(400, 'rounding_exceeds', 'El redondeo no puede exceder \$10 (una decena).')
	}
	now := now_dt()
	mut stmts := []string{}
	for i, p in rows {
		rnd := if i == 0 { rounding } else { 0.0 }
		stmts << "UPDATE payments SET status='collected', commission=${qf(calc[i]['com'])}, net=${qf(calc[i]['net'])}, collected_by=${u.id}, collected_by_name=${q(u.name)}, collected_at=${q(now)}, collected_amount=${qf(calc[i]['net'] + rnd)}, rounding=${qf(rnd)} WHERE id=${p['id'].i64()} AND status='held_at_point'"
	}
	a.db.tx(stmts) or { return fail(500, 'db_error') }
	a.close_tasks('collect:${pid}:')
	a.event('point', pid, 'efectivo_retenido', 'recolectado', u.email, mxn(collected))
	return json_ok('{"ok":true,"count":${rows.len},"net":${net_total:.2f},"collected":${collected:.2f},"rounding":${rounding:.2f}}')
}

// Corte: el chofer entrega todo lo recolectado al administrador.
fn (mut a App) driver_corte(u User) Resp {
	rows := a.db.rows("SELECT * FROM payments WHERE status='collected' AND collected_by=${u.id}") or { []Row{} }
	if rows.len == 0 {
		return json_ok('{"folio":"","total":0,"count":0}')
	}
	mut gross := 0.0
	mut net := 0.0
	mut collected := 0.0
	for p in rows {
		gross += p['amount'].f64()
		net += p['net'].f64()
		collected += p['collected_amount'].f64()
	}
	folio := 'CORTE-${today().replace('-', '')}-${u.id}-${rand_code(3)}'
	now := now_dt()
	a.db.tx([
		"INSERT INTO settlements (kind, ref, ref_name, period, gross, fee, net, folio, status, notes, created_at) VALUES ('driver_corte', ${q(u.id.str())}, ${q(u.name)}, ${q(today())}, ${qf(gross)}, ${qf(gross - net)}, ${qf(collected)}, ${q(folio)}, 'pending', ${q('${rows.len} pagos')}, ${q(now)})",
		"UPDATE payments SET status='delivered', delivered_at=${q(now)}, corte_folio=${q(folio)} WHERE status='collected' AND collected_by=${u.id}",
	]) or { return fail(500, 'db_error') }
	a.close_tasks('deliver:${u.id}:')
	a.event('driver', u.id, 'en_ruta', 'corte', u.email, folio)
	return json_ok('{"folio":${jstr(folio)},"total":${collected:.2f},"count":${rows.len}}')
}
