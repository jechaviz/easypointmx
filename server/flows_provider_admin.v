module main

// Flujos del proveedor y del administrador.

// ── proveedor ───────────────────────────────────────────────────────────────
fn (mut a App) provider_scope_ok(u User, exc_id i64) bool {
	if u.role == 'admin' {
		return true
	}
	return a.db.count('excursions', 'id=${exc_id} AND provider_id=${u.provider_id}') > 0
}

fn (mut a App) provider_dashboard(u User, r &Req) Resp {
	pid := if u.role == 'admin' { (r.query['provider_id'] or { '0' }).i64() } else { u.provider_id }
	if pid == 0 {
		return fail_code(400, 'no_provider', 'Tu usuario no está ligado a un proveedor.')
	}
	prov := a.db.get('providers', pid) or { empty_row() }
	deps := a.db.rows("SELECT d.id, d.excursion_id, d.date, d.status, e.name AS excursion_name, COALESCE(NULLIF(d.capacity,0), e.max_capacity) AS n_capacity, e.min_people, (SELECT COALESCE(SUM(b.people),0) FROM bookings b WHERE b.excursion_id=d.excursion_id AND b.excursion_date=d.date AND b.status<>'cancelled') AS n_seats, (SELECT COALESCE(SUM(b.amount_paid),0) FROM bookings b WHERE b.excursion_id=d.excursion_id AND b.excursion_date=d.date AND b.status<>'cancelled') AS n_collected, (SELECT COALESCE(SUM(b.balance),0) FROM bookings b WHERE b.excursion_id=d.excursion_id AND b.excursion_date=d.date AND b.status<>'cancelled') AS n_pending FROM departures d JOIN excursions e ON e.id=d.excursion_id WHERE e.provider_id=${pid} AND d.date>=DATE_SUB(UTC_DATE(), INTERVAL 7 DAY) AND d.status IN ('open','completed') ORDER BY d.date LIMIT 60") or {
		[]Row{}
	}
	pending := a.db.sum('settlements', 'net', "kind='provider' AND ref=${q(pid.str())} AND status='pending'")
	paid := a.db.sum('settlements', 'net', "kind='provider' AND ref=${q(pid.str())} AND status='paid'")
	fees := a.db.sum('settlements', 'fee', "kind='provider' AND ref=${q(pid.str())}")
	setts := a.db.rows("SELECT * FROM settlements WHERE kind='provider' AND ref=${q(pid.str())} ORDER BY id DESC LIMIT 12") or {
		[]Row{}
	}
	exc := a.db.rows('SELECT id, name, destination, price, max_capacity, active, rating_avg, rating_count FROM excursions WHERE provider_id=${pid} ORDER BY id DESC') or {
		[]Row{}
	}
	return json_ok('{"provider":${a.schema.row_json(pick(prov, ['id', 'name', 'fee_type', 'fee_rate', 'fee_amount', 'clabe', 'bank_name', 'beneficiary', 'rating', 'payout_days']))},"departures":${a.schema.rows_json(deps)},"excursions":${a.schema.rows_json(exc)},"settlements":${a.schema.rows_json(setts)},"totals":{"pending_net":${pending:.2f},"paid_net":${paid:.2f},"fees":${fees:.2f}}}')
}

fn (mut a App) provider_manifest(u User, r &Req) Resp {
	exc_id := (r.query['excursion_id'] or { '0' }).i64()
	date := r.query['date'] or { '' }
	if !a.provider_scope_ok(u, exc_id) || !is_date(date) {
		return fail(404, 'not_found')
	}
	rows := a.db.rows("SELECT code, customer_name, customer_phone, people, total, amount_paid, balance, payment_status, status, checked_in, checked_in_at, protect, notes FROM bookings WHERE excursion_id=${exc_id} AND excursion_date=${q(date)} AND status<>'cancelled' ORDER BY customer_name") or {
		[]Row{}
	}
	mut seats := 0
	mut paid := 0.0
	mut bal := 0.0
	mut boarded := 0
	for b in rows {
		seats += b['people'].int()
		paid += b['amount_paid'].f64()
		bal += b['balance'].f64()
		if b['checked_in'] == '1' {
			boarded += b['people'].int()
		}
	}
	return json_ok('{"passengers":${a.schema.rows_json(rows)},"summary":{"seats":${seats},"boarded":${boarded},"paid":${paid:.2f},"balance":${bal:.2f},"bookings":${rows.len}}}')
}

fn (mut a App) provider_checkin(u User, r &Req) Resp {
	b := body_map(r)
	bk := a.booking_by_code(b['code'] or { b['token'] or { '' } })
	if bk.len == 0 {
		// también acepta el token del QR
		t := (b['token'] or { '' }).trim_space()
		if t != '' {
			tb := a.db.one('SELECT * FROM bookings WHERE token=${q(t)}') or { empty_row() }
			if tb.len > 0 {
				return a.do_checkin(u, tb)
			}
		}
		return fail_code(404, 'not_found', 'Voucher no encontrado.')
	}
	return a.do_checkin(u, bk)
}

fn (mut a App) do_checkin(u User, bk Row) Resp {
	if !a.provider_scope_ok(u, bk['excursion_id'].i64()) {
		return fail_code(403, 'forbidden', 'Este voucher no es de tus salidas.')
	}
	if bk['status'] == 'cancelled' {
		return fail_code(400, 'cancelled', 'La reserva está cancelada.')
	}
	if bk['checked_in'] == '1' {
		return fail_code(409, 'already_checked_in', 'Este pasajero ya abordó.')
	}
	a.db.exec("UPDATE bookings SET checked_in=1, checked_in_at=${q(now_dt())} WHERE id=${bk['id'].i64()}") or {}
	a.restage(bk['id'].i64(), u.email)
	bal := bk['balance'].f64()
	return json_ok('{"ok":true,"name":${jstr(bk['customer_name'])},"people":${bk['people'].int()},"balance":${bal:.2f},"collect_balance":${bal > 0}}')
}

// Cierra la salida: marca reservas pagadas como completadas y genera la liquidación al proveedor.
fn (mut a App) complete_departure(exc_id i64, date string, actor string) (string, f64, f64, f64, int) {
	dep := a.db.one('SELECT * FROM departures WHERE excursion_id=${exc_id} AND date=${q(date)}') or { empty_row() }
	if dep.len == 0 || dep['status'] == 'completed' {
		return '', 0, 0, 0, 0
	}
	exc := a.db.get('excursions', exc_id) or { empty_row() }
	prov := a.db.get('providers', exc['provider_id'].i64()) or { empty_row() }
	rows := a.db.rows("SELECT * FROM bookings WHERE excursion_id=${exc_id} AND excursion_date=${q(date)} AND status='confirmed' AND payment_status='paid'") or {
		[]Row{}
	}
	mut gross := 0.0
	for b in rows {
		gross += b['total'].f64() - b['protect_fee'].f64()
	}
	count := rows.len
	a.db.exec("UPDATE bookings SET status='completed', stage='completado', updated_at=${q(now_dt())} WHERE excursion_id=${exc_id} AND excursion_date=${q(date)} AND status='confirmed' AND payment_status='paid'") or {}
	for b in rows {
		a.event('booking', b['id'].i64(), b['stage'], 'completado', actor, 'Salida completada')
	}
	a.db.exec("UPDATE departures SET status='completed', completed_at=${q(now_dt())} WHERE id=${dep['id'].i64()}") or {}
	// partidas con saldo al cierre = riesgo (el pasajero abordó sin liquidar)
	left := a.db.rows("SELECT id, code, balance FROM bookings WHERE excursion_id=${exc_id} AND excursion_date=${q(date)} AND status='confirmed' AND payment_status<>'paid'") or {
		[]Row{}
	}
	for b in left {
		a.flag('medium', 'balance_at_completion', 'booking', b['id'].i64(), 'Reserva ${b['code']} cerró con saldo ${mxn(b['balance'].f64())}', 'balclose:${b['id']}')
	}
	if gross <= 0 || count == 0 {
		a.close_tasks('dep:${exc_id}:${date}')
		return '', 0, 0, 0, 0
	}
	fee := if prov['fee_type'] == 'fixed' { prov['fee_amount'].f64() * f64(count) } else { round2(gross * (if prov['fee_rate'].f64() > 0 { prov['fee_rate'].f64() } else { 15.0 }) / 100.0) }
	net := if gross > fee { gross - fee } else { 0.0 }
	folio := 'LIQ-PR-${prov['id'].int():03}-${date.replace('-', '')}-${exc_id}'
	pay_on := add_days(today(), if prov['payout_days'].int() > 0 { prov['payout_days'].int() } else { a.cfg_i('settlement.payout_days', 2) })
	a.db.insert('settlements', {
		'kind':     'provider'
		'ref':      prov['id']
		'ref_name': prov['name']
		'period':   date
		'gross':    qf(gross)
		'fee':      qf(fee)
		'net':      qf(net)
		'folio':    folio
		'status':   'pending'
		'notes':    '${exc['name']} · ${count} reservas · CLABE ${prov['clabe']} ${prov['bank_name']} · pago ${pay_on}'
	}) or {}
	a.notify(NotifyIn{
		email:    prov['email']
		phone:    prov['whatsapp']
		name:     prov['name']
		template: 'provider_payout'
		vars:     {
			'name':   prov['name']
			'folio':  folio
			'net':    mxn(net)
			'gross':  mxn(gross)
			'fee':    mxn(fee)
			'pay_on': pay_on
		}
		dedupe:   'payout:${folio}'
	})
	a.close_tasks('dep:${exc_id}:${date}')
	a.event('departure', exc_id, 'programada', 'completada', actor, '${date} · ${folio}')
	return folio, gross, fee, net, count
}

fn (mut a App) provider_complete(u User, r &Req) Resp {
	b := body_map(r)
	exc_id := (b['excursion_id'] or { '0' }).i64()
	date := b['date'] or { '' }
	if !a.provider_scope_ok(u, exc_id) || !is_date(date) {
		return fail(404, 'not_found')
	}
	if date > today() {
		return fail_code(400, 'too_early', 'La salida aún no ocurre.')
	}
	folio, gross, fee, net, count := a.complete_departure(exc_id, date, u.email)
	if folio == '' && count == 0 {
		return json_ok('{"ok":true,"completed":0,"folio":"","note":"Sin reservas pagadas por liquidar."}')
	}
	return json_ok('{"ok":true,"completed":${count},"folio":${jstr(folio)},"gross":${gross:.2f},"fee":${fee:.2f},"net":${net:.2f}}')
}

fn (mut a App) provider_dates(u User, r &Req) Resp {
	b := body_map(r)
	exc_id := (b['excursion_id'] or { '0' }).i64()
	if !a.provider_scope_ok(u, exc_id) {
		return fail(404, 'not_found')
	}
	raw := (b['dates'] or { '' }).replace('[', '').replace(']', '').replace('"', '').replace('\n', ',').replace(';', ',')
	mut n := 0
	for part in raw.split(',') {
		d := part.trim_space()
		if !is_date(d) || d < today() {
			continue
		}
		a.db.exec("INSERT IGNORE INTO departures (excursion_id, date, status, created_at) VALUES (${exc_id}, ${q(d)}, 'open', ${q(now_dt())})") or {
			continue
		}
		n++
	}
	return json_ok('{"ok":true,"processed":${n}}')
}

// ── administración ──────────────────────────────────────────────────────────
fn (mut a App) admin_user_create(u User, r &Req) Resp {
	b := body_map(r)
	email := (b['email'] or { '' }).trim_space().to_lower()
	role := b['role'] or { 'operator' }
	if !is_email(email) || role !in ['admin', 'support', 'sales', 'operator', 'driver', 'provider'] {
		return fail_code(400, 'invalid', 'Correo o rol no válido.')
	}
	if a.db.count('users', 'email=${q(email)}') > 0 {
		return fail_code(409, 'duplicate', 'Ese correo ya existe.')
	}
	mut pass := b['password'] or { '' }
	temp := pass == ''
	if temp {
		pass = rand_code(10)
	}
	id := a.db.insert('users', {
		'email':         email
		'password_hash': hash_password(pass)
		'name':          b['name'] or { '' }
		'phone':         b['phone'] or { '' }
		'role':          role
		'point_id':      b['point_id'] or { '0' }
		'provider_id':   b['provider_id'] or { '0' }
		'active':        '1'
	}) or { return fail(500, 'db_error') }
	a.audit(u.email, 'create_user', 'users', id, role)
	return json_status(201, '{"ok":true,"id":${id},"temp_password":${jstr(if temp { pass } else { '' })}}')
}

fn (mut a App) application_approve(u User, id i64) Resp {
	app := a.db.get('partner_applications', id) or { empty_row() }
	if app.len == 0 {
		return fail(404, 'not_found')
	}
	if app['status'] == 'approved' {
		return fail_code(409, 'already', 'Ya fue aprobada.')
	}
	pid := a.db.insert('points', {
		'name':     app['business_name']
		'address':  app['address']
		'whatsapp': app['whatsapp']
		'maps_url': app['maps_url']
		'hours':    app['horarios']
		'active':   '1'
	}) or { return fail(500, 'db_error') }
	mut temp := ''
	email := app['email']
	if is_email(email) && a.db.count('users', 'email=${q(email.to_lower())}') == 0 {
		temp = rand_code(10)
		a.db.insert('users', {
			'email':         email.to_lower()
			'password_hash': hash_password(temp)
			'name':          if app['contact_name'] != '' { app['contact_name'] } else { app['business_name'] }
			'phone':         app['contact_phone']
			'role':          'operator'
			'point_id':      pid.str()
			'active':        '1'
		}) or {}
		a.notify(NotifyIn{
			email:    email
			phone:    app['whatsapp']
			name:     app['contact_name']
			template: 'point_welcome'
			vars:     {
				'name':  if app['contact_name'] != '' { app['contact_name'] } else { app['business_name'] }
				'point': app['business_name']
				'link':  '${a.app_url()}/app/'
			}
			dedupe:   'pt-welcome:${pid}'
		})
	}
	a.db.update('partner_applications', id, {
		'status':   'approved'
		'point_id': pid.str()
	}) or {}
	a.close_tasks('app:${id}')
	a.audit(u.email, 'approve_application', 'partner_applications', id, 'point ${pid}')
	return json_ok('{"ok":true,"point_id":${pid},"temp_password":${jstr(temp)}}')
}

fn (mut a App) application_reject(u User, id i64, r &Req) Resp {
	a.db.update('partner_applications', id, {
		'status':     'rejected'
		'owner_note': body_map(r)['note'] or { '' }
	}) or {}
	a.close_tasks('app:${id}')
	return json_ok('{"ok":true}')
}

// Liquidación de comisiones por punto: agrupa pagos entregados sin liquidar (idempotente).
fn (mut a App) settlements_run(u User, r &Req) Resp {
	period := (body_map(r)['period'] or { today() }).trim_space()
	pts := a.db.rows("SELECT point_id, point_name, COUNT(*) AS n_count, SUM(amount) AS n_gross, SUM(commission) AS n_fee, SUM(net) AS n_net FROM payments WHERE status='delivered' AND method<>'credit' AND settled_folio='' AND point_id>0 AND kind IN ('excursion','guide','service') GROUP BY point_id, point_name") or {
		[]Row{}
	}
	mut created := 0
	for p in pts {
		folio := 'LIQ-P-${p['point_id']}-${period.replace('-', '')}-${rand_code(3)}'
		a.db.tx([
			"INSERT INTO settlements (kind, ref, ref_name, period, gross, fee, net, folio, status, notes, created_at) VALUES ('point', ${q(p['point_id'])}, ${q(p['point_name'])}, ${q(period)}, ${qf(p['n_gross'].f64())}, ${qf(p['n_fee'].f64())}, ${qf(p['n_fee'].f64())}, ${q(folio)}, 'pending', ${q('${p['n_count']} pagos · comisión del punto')}, ${q(now_dt())})",
			"UPDATE payments SET settled_folio=${q(folio)} WHERE status='delivered' AND method<>'credit' AND settled_folio='' AND point_id=${p['point_id'].i64()} AND kind IN ('excursion','guide','service')",
		]) or { continue }
		created++
	}
	a.audit(u.email, 'settlements_run', 'settlements', 0, '${period}: ${created}')
	return json_ok('{"created":${created}}')
}

fn (mut a App) settlement_pay(u User, id i64) Resp {
	s := a.db.get('settlements', id) or { empty_row() }
	if s.len == 0 {
		return fail(404, 'not_found')
	}
	if s['status'] == 'paid' {
		return fail_code(409, 'already', 'Ya estaba pagada.')
	}
	a.db.exec("UPDATE settlements SET status='paid', paid_at=${q(now_dt())} WHERE id=${id}") or {}
	a.close_tasks('pay:${id}')
	a.audit(u.email, 'settlement_paid', 'settlements', id, s['folio'])
	return json_ok('{"ok":true}')
}

fn (mut a App) ticket_resolve(u User, id i64, r &Req) Resp {
	t := a.db.get('support_tickets', id) or { empty_row() }
	if t.len == 0 {
		return fail(404, 'not_found')
	}
	b := body_map(r)
	res := (b['resolution'] or { '' }).trim_space()
	if res.len < 3 {
		return fail_code(400, 'resolution_required', 'Describe cómo se resolvió.')
	}
	mut comp := (b['compensation'] or { '0' }).f64()
	cap := a.cfg_f('support.auto_credit_cap', 300)
	if u.role != 'admin' && comp > cap {
		return fail_code(403, 'over_cap', 'Compensaciones mayores a ${mxn(cap)} requieren al administrador.')
	}
	if comp < 0 {
		comp = 0
	}
	if comp > 0 && t['customer_phone'] != '' {
		a.credit(t['customer_phone'], t['customer_name'], comp, 'support_compensation', t['code'])
	}
	a.db.update('support_tickets', id, {
		'status':            'resolved'
		'resolution':        res
		'compensation':      qf(comp)
		'first_response_at': if t['first_response_at'] == '' { now_dt() } else { t['first_response_at'] }
	}) or {}
	a.notify(NotifyIn{
		email:    t['customer_email']
		phone:    t['customer_phone']
		name:     t['customer_name']
		template: 'ticket_resolved'
		vars:     {
			'name':       if t['customer_name'] != '' { t['customer_name'] } else { 'cliente' }
			'code':       t['code']
			'resolution': res
			'comp_txt':   if comp > 0 { ' Te abonamos ${mxn(comp)} de crédito.' } else { '' }
		}
		dedupe:   'tk-res:${id}'
	})
	a.close_tasks('ticket:${id}')
	a.audit(u.email, 'ticket_resolved', 'support_tickets', id, '')
	return json_ok('{"ok":true,"compensation":${comp:.2f}}')
}

fn (mut a App) ticket_first_response(u User, id i64) Resp {
	a.db.exec("UPDATE support_tickets SET first_response_at=${q(now_dt())}, status=IF(status IN ('open','escalated'),'in_progress',status) WHERE id=${id} AND first_response_at IS NULL") or {}
	return json_ok('{"ok":true}')
}

fn (mut a App) confirm_payment(u User, id i64) Resp {
	p := a.db.get('payments', id) or { empty_row() }
	if p.len == 0 || p['status'] != 'pending_confirm' {
		return fail_code(404, 'not_found', 'No hay un pago por confirmar con ese folio.')
	}
	if p['kind'] == 'club' {
		parts := a.db.one("SELECT label FROM payments WHERE id=${id}") or { empty_row() }
		_ = parts
		name := p['label'].replace('Club ', '')
		ph := a.db.one("SELECT payload FROM tasks WHERE dedupe_key=${q('club:' + p['gateway_ref'])}") or { empty_row() }
		phone := ph['payload'].all_before('|')
		if phone != '' {
			a.activate_club(phone, name, '', p['amount'].f64())
		}
		a.db.exec("UPDATE payments SET status='delivered', delivered_at=${q(now_dt())} WHERE id=${id}") or {}
		a.close_tasks('club:${p['gateway_ref']}')
		return json_ok('{"ok":true,"club":true}')
	}
	res := a.apply_payment(PayIn{
		booking_id: p['booking_id'].i64()
		amount:     p['amount'].f64()
		method:     'transfer'
		channel:    'transfer'
		label:      'Transferencia confirmada'
		actor:      u.email
	})
	if !res.ok {
		return fail_code(409, res.err, 'No se pudo aplicar el pago a la reserva.')
	}
	a.db.exec("UPDATE payments SET status='cancelled' WHERE id=${id}") or {}
	a.close_tasks('transfer:${p['gateway_ref']}')
	return json_ok('{"ok":true}')
}

fn (mut a App) admin_cancel_departure(u User, r &Req) Resp {
	b := body_map(r)
	exc_id := (b['excursion_id'] or { '0' }).i64()
	date := b['date'] or { '' }
	reason := if (b['reason'] or { 'proveedor' }) in ['proveedor', 'clima', 'cupo_minimo'] { b['reason'] } else { 'proveedor' }
	if !a.provider_scope_ok(u, exc_id) || !is_date(date) {
		return fail(404, 'not_found')
	}
	n, credited, bonus := a.cancel_departure(exc_id, date, reason, u.email)
	a.audit(u.email, 'cancel_departure', 'excursions', exc_id, '${date} ${reason} ${n}')
	return json_ok('{"ok":true,"bookings":${n},"credited":${credited:.2f},"bonus":${bonus:.2f}}')
}

fn (mut a App) admin_config_list() Resp {
	mut rows := a.db.rows('SELECT * FROM ep_config ORDER BY grp, ckey') or { []Row{} }
	for mut row in rows {
		// los secretos (token de la pasarela) nunca salen por la API
		if row['ckey'].starts_with('secret.') && row['cvalue'] != '' {
			row['cvalue'] = '••••'
		}
	}
	return json_ok('{"items":${a.schema.rows_json(rows)}}')
}

fn (mut a App) admin_config_set(u User, r &Req) Resp {
	b := body_map(r)
	mut n := 0
	for k, v in b {
		if k.starts_with('secret.') || k.starts_with('sys.') || k.starts_with('setup.') {
			continue // se cambian sólo por el asistente
		}
		if a.db.count('ep_config', 'ckey=${q(k)}') > 0 {
			a.set_cfg(k, v)
			n++
		}
	}
	a.audit(u.email, 'config', 'ep_config', 0, b.keys().join(','))
	return json_ok('{"ok":true,"updated":${n}}')
}

fn (mut a App) partner_create(u User, r &Req) Resp {
	b := body_map(r)
	name := (b['name'] or { '' }).trim_space()
	if name.len < 2 {
		return fail_code(400, 'invalid', 'Nombre requerido.')
	}
	prefix := rand_code(8).to_lower()
	secret := rand_token(16)
	key := 'epk_${prefix}_${secret}'
	id := a.db.insert('api_partners', {
		'name':           name
		'contact_email':  b['contact_email'] or { '' }
		'key_prefix':     prefix
		'key_hash':       sha_hex(key)
		'webhook_url':    b['webhook_url'] or { '' }
		'fee_per_parcel': b['fee_per_parcel'] or { '0' }
		'active':         '1'
	}) or { return fail(500, 'db_error') }
	a.audit(u.email, 'partner_create', 'api_partners', id, name)
	return json_status(201, '{"ok":true,"id":${id},"api_key":${jstr(key)},"note":"Guarda esta llave: no se vuelve a mostrar."}')
}

fn (mut a App) outbox_mark_sent(u User, id i64) Resp {
	a.db.exec("UPDATE outbox SET status='sent', sent_at=${q(now_dt())} WHERE id=${id} AND status IN ('manual','queued','failed')") or {}
	return json_ok('{"ok":true}')
}

// ── API de socios e-commerce (X-API-Key) ────────────────────────────────────
fn (mut a App) partner_auth(r &Req) ?Row {
	key := (r.headers['x-api-key'] or { '' }).trim_space()
	if !key.starts_with('epk_') {
		return none
	}
	parts := key.split('_')
	if parts.len < 3 {
		return none
	}
	p := a.db.one('SELECT * FROM api_partners WHERE key_prefix=${q(parts[1])} AND active=1') or { return none }
	if p.len == 0 || p['key_hash'] != sha_hex(key) {
		return none
	}
	return p
}

fn (mut a App) partner_shipment(p Row, r &Req) Resp {
	b := body_map(r)
	tid := (b['tracking_id'] or { '' }).trim_space().to_upper()
	pid := (b['point_id'] or { '0' }).i64()
	if tid.len < 4 || pid == 0 || a.db.count('points', 'id=${pid} AND active=1') == 0 {
		return fail_code(400, 'invalid', 'tracking_id y point_id válido son requeridos.')
	}
	if a.db.count('shipments', 'tracking_id=${q(tid)}') > 0 {
		return fail_code(409, 'duplicate', 'tracking_id ya existe.')
	}
	id := a.db.insert('shipments', {
		'tracking_id':     tid
		'status':          'pending'
		'point_id':        pid.str()
		'recipient_name':  b['recipient_name'] or { '' }
		'recipient_phone': b['recipient_phone'] or { '' }
		'recipient_email': b['recipient_email'] or { '' }
		'carrier':         b['carrier'] or { '' }
		'source':          'partner:${p['id']}'
	}) or { return fail(500, 'db_error') }
	a.db.exec('UPDATE api_partners SET parcels=parcels+1 WHERE id=${p['id'].i64()}') or {}
	return json_status(201, '{"ok":true,"id":${id},"tracking_id":${jstr(tid)}}')
}
