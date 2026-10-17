module main

// Reservas de excursiones: alta atómica con cupo, pagos (una sola función para todos los canales),
// voucher público y autoservicio del cliente (cambio de fecha, cancelación, reseña).

fn empty_row() Row {
	return Row(map[string]string{})
}

fn pick(src Row, keys []string) Row {
	mut o := empty_row()
	for k in keys {
		if k in src {
			o[k] = src[k]
		}
	}
	return o
}

fn (mut a App) voucher_url(code string, token string) string {
	return '${a.app_url()}/website/#/voucher?code=${url_encode(code)}&t=${url_encode(token)}'
}

fn stage_of(b Row) string {
	st := b['status']
	total := b['total'].f64()
	paid := b['amount_paid'].f64()
	if st == 'completed' {
		return 'completado'
	}
	if st == 'cancelled' {
		return if b['payment_status'] == 'credit' { 'credito' } else { 'cancelado' }
	}
	if b['checked_in'] == '1' {
		return 'abordado'
	}
	if total > 0 && paid >= total {
		return 'pagado'
	}
	if paid > 0 {
		return 'abonado'
	}
	return 'reservado'
}

fn (mut a App) restage(id i64, actor string) {
	b := a.db.get('bookings', id) or { return }
	if b.len == 0 {
		return
	}
	next := stage_of(b)
	if next == b['stage'] {
		return
	}
	a.db.exec('UPDATE bookings SET stage=${q(next)} WHERE id=${id}') or {}
	a.event('booking', id, b['stage'], next, actor, '')
}

fn (mut a App) booking_vars(b Row, exc Row) map[string]string {
	return {
		'name':    if b['customer_name'] != '' { b['customer_name'] } else { 'viajero' }
		'code':    b['code']
		'exc':     if b['excursion_name'] != '' { b['excursion_name'] } else { exc['name'] }
		'date':    b['excursion_date']
		'paid':    mxn(b['amount_paid'].f64())
		'balance': mxn(b['balance'].f64())
		'total':   mxn(b['total'].f64())
		'link':    a.voucher_url(b['code'], b['token'])
		'deposit': mxn(exc['deposit_amount'].f64())
		'meeting': if exc['meeting_point'] != '' { exc['meeting_point'] } else { 'te lo confirma tu guía' }
	}
}

fn (mut a App) notify_booking(b Row, exc Row, template string, extra map[string]string, dedupe string) int {
	mut vars := a.booking_vars(b, exc)
	for k, v in extra {
		vars[k] = v
	}
	pref := match b['reminder_channel'] {
		'email' { 'email' }
		'whatsapp' { 'whatsapp' }
		else { 'both' }
	}
	return a.notify(NotifyIn{
		email:     b['customer_email']
		phone:     b['customer_phone']
		name:      vars['name']
		template:  template
		vars:      vars
		entity:    'booking'
		entity_id: b['id'].i64()
		dedupe:    dedupe
		prefer:    pref
	})
}

// ── pagos ───────────────────────────────────────────────────────────────────
pub struct PayIn {
pub:
	booking_id  i64
	amount      f64
	method      string = 'card'
	channel     string = 'online'
	label       string
	point_id    i64
	point_name  string
	gateway_ref string
	ledger      string // held_at_point | delivered
	actor       string = 'cliente'
}

pub struct PayOut {
pub:
	ok       bool
	err      string
	applied  f64
	ledger_id i64
}

// Una sola ruta para registrar un abono, sea online, efectivo en punto, transferencia o crédito.
// Atómica: sólo aplica si la reserva sigue viva y el abono no excede el saldo.
fn (mut a App) apply_payment(p PayIn) PayOut {
	amt := round2(p.amount)
	if amt <= 0 {
		return PayOut{
			err: 'invalid_amount'
		}
	}
	if p.gateway_ref != '' && a.db.count('payments', 'gateway_ref=${q(p.gateway_ref)}') > 0 {
		return PayOut{
			err: 'duplicate_payment'
		}
	}
	now := now_dt()
	status := if p.ledger != '' { p.ledger } else { 'delivered' }
	delivered := if status == 'delivered' { q(now) } else { 'NULL' }
	script := "UPDATE bookings SET amount_paid = amount_paid + ${qf(amt)}, balance = GREATEST(total - amount_paid, 0), payment_status = IF(total > 0 AND amount_paid >= total, 'paid', 'partial'), status = IF(status='new','confirmed',status), confirmed_channel = IF(confirmed_channel='', ${q(p.channel)}, confirmed_channel), payment_method = ${q(p.method)}, paid_at = ${q(now)}, updated_at = ${q(now)} WHERE id=${p.booking_id} AND status NOT IN ('cancelled','completed') AND payment_status NOT IN ('credit','refunded') AND total > 0 AND amount_paid + ${qf(amt)} <= total + 0.005;
SET @n = ROW_COUNT();
INSERT INTO payments (kind, ref, booking_id, label, point_id, point_name, amount, commission, net, method, status, gateway_ref, delivered_at, created_at) SELECT 'excursion', code, id, ${q(p.label)}, ${p.point_id}, ${q(p.point_name)}, ${qf(amt)}, 0, ${qf(amt)}, ${q(p.method)}, ${q(status)}, ${q(p.gateway_ref)}, ${delivered}, ${q(now)} FROM bookings WHERE id=${p.booking_id} AND @n > 0;
SET @pid = IF(@n > 0, LAST_INSERT_ID(), 0);
SELECT @n AS n, @pid AS pid"
	rs := a.db.rows(script) or {
		return PayOut{
			err: 'db_error'
		}
	}
	if rs.len == 0 || rs[0]['n'].int() == 0 {
		return PayOut{
			err: 'not_applicable'
		}
	}
	a.restage(p.booking_id, p.actor)
	if p.point_id > 0 {
		a.db.exec('UPDATE points SET last_activity_at=${q(now)} WHERE id=${p.point_id}') or {}
	}
	return PayOut{
		ok:        true
		applied:   amt
		ledger_id: rs[0]['pid'].i64()
	}
}

fn (mut a App) excursion_full(id i64) Row {
	return a.db.one('SELECT e.*, p.name AS provider_name FROM excursions e LEFT JOIN providers p ON p.id=e.provider_id WHERE e.id=${id}') or {
		empty_row()
	}
}

fn (mut a App) booking_by_code(code string) Row {
	c := code.trim_space()
	if c == '' {
		return empty_row()
	}
	return a.db.one('SELECT * FROM bookings WHERE code=${q(c.to_upper())} OR (${qn(c)}>0 AND id=${qn(c)}) LIMIT 1') or {
		empty_row()
	}
}

// ── alta de reserva ─────────────────────────────────────────────────────────
fn (mut a App) create_booking(r &Req) Resp {
	if a.limited(r, 'book', 25, 60) {
		return fail_code(429, 'rate_limited', 'Demasiados intentos. Espera un momento.')
	}
	b := body_map(r)
	name := b['customer_name'].trim_space()
	phone := b['customer_phone'].trim_space()
	email := b['customer_email'].trim_space()
	if name.len < 2 {
		return fail_code(400, 'name_required', 'Indica tu nombre.')
	}
	if phone10(phone).len < 10 && !is_email(email) {
		return fail_code(400, 'contact_required', 'Indica un WhatsApp de 10 dígitos o un correo.')
	}
	exc_id := (b['excursion_id'] or { b['excursion_ref'] or { '0' } }).i64()
	exc := a.excursion_full(exc_id)
	if exc.len == 0 || exc['active'] != '1' {
		return fail_code(404, 'excursion_not_found', 'La excursión no está disponible.')
	}
	date := (b['date'] or { b['excursion_date'] or { '' } }).trim_space()
	if !is_date(date) || date < today() {
		return fail_code(400, 'date_invalid', 'Elige una fecha futura.')
	}
	dep := a.db.one('SELECT * FROM departures WHERE excursion_id=${exc_id} AND date=${q(date)}') or { empty_row() }
	if dep.len == 0 || dep['status'] != 'open' {
		return fail_code(400, 'date_unavailable', 'Esa fecha no está disponible para esta excursión.')
	}
	mut people := (b['people'] or { '1' }).int()
	if people < 1 {
		people = 1
	}
	if people > 40 {
		return fail_code(400, 'people_max', 'Para grupos de más de 40 personas escríbenos por WhatsApp.')
	}
	club := a.is_club(phone)
	protect := (b['protect'] or { '0' }) == '1'
	promo := b['promo_code'] or { '' }
	qt := a.quote(exc, date, people, QuoteOpts{
		promo:   promo
		protect: protect
		club:    club
	})
	if qt.capacity > 0 && qt.taken + people > qt.capacity {
		return fail_code(409, 'sold_out', 'Esa fecha ya no tiene cupo disponible.')
	}
	// referido: el código debe existir, no ser propio, y el cliente no haber viajado antes
	mut ref_used := (b['referral_code'] or { '' }).trim_space().to_upper()
	if ref_used != '' {
		referrer := a.db.one('SELECT phone FROM customers WHERE referral_code=${q(ref_used)}') or { empty_row() }
		self := a.find_customer(phone)
		if referrer.len == 0 || phone10(referrer['phone']) == phone10(phone) || (self.len > 0 && self['trips'].int() > 0) {
			ref_used = ''
		}
	}
	applied_promo := if promo != '' && qt.adjustments.any(it.kind == 'promo_code') { promo.to_upper() } else { '' }
	cust := a.upsert_customer(phone, name, email, b['utm_source'] or { 'web' }, ref_used)
	_ = cust
	mut code := ''
	mut booking_id := i64(0)
	for _ in 0 .. 4 {
		code = 'EP-BK-' + rand_code(6)
		token := 'vtok_' + rand_token(12)
		data := {
			'code':               code
			'token':              token
			'excursion_id':       exc_id.str()
			'departure_id':       dep['id']
			'excursion_name':     exc['name']
			'destination':        exc['destination']
			'excursion_date':     date
			'customer_name':      name
			'customer_phone':     phone
			'customer_email':     email
			'people':             people.str()
			'list_total':         qf(qt.list_total)
			'discount':           qf(qt.discount)
			'protect':            if protect { '1' } else { '0' }
			'protect_fee':        qf(qt.protect_fee)
			'total':              qf(qt.total)
			'amount_paid':        '0'
			'balance':            qf(qt.total)
			'payment_status':     'pending'
			'status':             'new'
			'stage':              'reservado'
			'promo_code':         applied_promo
			'referral_code_used': ref_used
			'reminder_optin':     b['reminder_optin'] or { '0' }
			'reminder_cadence':   b['reminder_cadence'] or { 'biweekly' }
			'reminder_channel':   b['reminder_channel'] or { 'both' }
			'reminder_dates':     build_reminder_dates(b['reminder_cadence'] or { 'biweekly' }, b['reminder_dates'] or { '' }, date)
			'utm':                b['utm'] or { '' }
			'notes':              b['notes'] or { '' }
		}
		cols, vals := a.db.insert_parts('bookings', data)
		lk := 'ep_book_${exc_id}_${date}'
		guard := if qt.capacity > 0 {
			"(SELECT COALESCE(SUM(people),0) FROM bookings WHERE excursion_id=${exc_id} AND excursion_date=${q(date)} AND status<>'cancelled') + ${people} <= ${qt.capacity}"
		} else {
			'1=1'
		}
		script := "SELECT GET_LOCK(${q(lk)}, 5) INTO @l;
INSERT INTO bookings (${cols}) SELECT ${vals} FROM DUAL WHERE ${guard};
SET @n = ROW_COUNT();
SET @id = LAST_INSERT_ID();
SELECT RELEASE_LOCK(${q(lk)}) INTO @r;
SELECT @n AS n, @id AS id"
		rs := a.db.rows(script) or {
			if err.msg().contains('Duplicate') {
				continue
			}
			return fail_code(500, 'db_error', 'No pudimos crear la reserva.')
		}
		if rs.len > 0 && rs[0]['n'].int() == 1 {
			booking_id = rs[0]['id'].i64()
			break
		}
		return fail_code(409, 'sold_out', 'Esa fecha ya no tiene cupo disponible.')
	}
	if booking_id == 0 {
		return fail_code(500, 'db_error', 'No pudimos crear la reserva.')
	}
	if applied_promo != '' {
		a.db.exec('UPDATE pricing_rules SET uses=uses+1 WHERE kind=\'promo_code\' AND UPPER(code)=${q(applied_promo)}') or {}
	}
	a.event('booking', booking_id, '', 'reservado', 'cliente', 'Reserva creada')
	// crédito del monedero: se aplica solo (sin reembolsos en efectivo, el crédito se usa primero)
	mut applied_credit := 0.0
	if (b['use_credit'] or { '1' }) != '0' {
		avail := a.wallet_balance(phone)
		if avail > 0 {
			want := if avail < qt.total { avail } else { qt.total }
			used := a.debit(phone, want, 'auto_applied', code)
			if used > 0 {
				res := a.apply_payment(PayIn{
					booking_id: booking_id
					amount:     used
					method:     'credit'
					channel:    'wallet'
					label:      'Crédito aplicado (auto)'
					actor:      'sistema'
				})
				if res.ok {
					applied_credit = used
				} else {
					a.credit(phone, name, used, 'credit_restored', code)
				}
			}
		}
	}
	bk := a.db.get('bookings', booking_id) or { empty_row() }
	a.notify_booking(bk, exc, 'booking_received', map[string]string{}, 'rx:${booking_id}')
	return json_status(201, '{"ok":true,"booking":${a.schema.row_json(a.public_booking(bk, exc, true))},"quote":${qt.to_json()},"applied_credit":${applied_credit:.2f},"voucher_url":${jstr(a.voucher_url(bk['code'], bk['token']))}}')
}

// Calendario de recordatorios de abono (semanal / quincenal / fechas elegidas por el cliente).
fn build_reminder_dates(cadence string, custom string, date string) string {
	if cadence == 'custom' {
		mut ds := []string{}
		for part in custom.replace('\n', ',').replace(';', ',').split(',') {
			p := part.trim_space()
			if is_date(p) {
				ds << p
			}
		}
		ds.sort()
		return ds.join(',')
	}
	step := if cadence == 'weekly' { 7 } else { 14 }
	mut out := []string{}
	for i in 1 .. 9 {
		d := add_days(today(), step * i)
		if is_date(date) && d >= date {
			break
		}
		out << d
	}
	return out.join(',')
}

// Vista pública (sin PII interna). show_token sólo para quien creó o demostró propiedad.
fn (mut a App) public_booking(b Row, exc Row, show_token bool) Row {
	mut o := pick(b, ['code', 'excursion_id', 'excursion_name', 'destination', 'excursion_date', 'customer_name',
		'people', 'list_total', 'discount', 'protect', 'protect_fee', 'total', 'amount_paid', 'balance',
		'payment_status', 'status', 'stage', 'checked_in', 'checked_in_at', 'created_at', 'rating', 'reschedules',
		'promo_code', 'reminder_optin', 'reminder_cadence', 'reminder_channel', 'reminder_dates'])
	o['customer_phone'] = b['customer_phone']
	o['customer_email'] = b['customer_email']
	if show_token {
		o['token'] = b['token']
	}
	for k in ['provider_name', 'duration', 'policy', 'image_url', 'meeting_point', 'departure_time'] {
		o[k] = exc[k] or { '' }
	}
	days_to := if is_date(b['excursion_date']) { days_between(today(), b['excursion_date']) } else { -999 }
	live := b['status'] in ['new', 'confirmed']
	min_days := a.cfg_i('policy.reschedule_min_days', 3)
	o['n_days_to'] = days_to.str()
	o['b_can_reschedule'] = if live && days_to >= min_days { '1' } else { '0' }
	o['b_can_cancel'] = if live && days_to >= 0 { '1' } else { '0' }
	o['b_can_review'] = if b['status'] == 'completed' && b['rating'].int() == 0 { '1' } else { '0' }
	return o
}

// ── consulta pública del voucher ────────────────────────────────────────────
fn (mut a App) voucher_lookup(r &Req) Resp {
	if a.limited(r, 'voucher', 40, 60) {
		return fail_code(429, 'rate_limited', 'Demasiadas consultas. Espera un momento.')
	}
	code := (r.query['code'] or { '' }).trim_space()
	phone := digits_only(r.query['phone'] or { '' })
	token := (r.query['t'] or { '' }).trim_space()
	if code == '' && phone == '' {
		return fail_code(400, 'missing_identifier', 'Indica folio de voucher o teléfono.')
	}
	if code == '' && phone.len < 8 {
		return fail_code(400, 'invalid_phone', 'El teléfono para consulta debe tener al menos 8 dígitos.')
	}
	mut rows := []Row{}
	if code != '' {
		b := a.booking_by_code(code)
		if b.len > 0 {
			rows << b
		}
	} else {
		rows = a.db.rows('SELECT * FROM bookings WHERE customer_phone LIKE ${q('%' + phone10(phone) + '%')} ORDER BY id DESC LIMIT 10') or {
			[]Row{}
		}
	}
	if rows.len == 0 {
		return fail_code(404, 'not_found', 'No se encontró ninguna reservación con esos datos.')
	}
	mut parts := []string{}
	for b in rows {
		exc := a.db.one('SELECT e.*, p.name AS provider_name FROM excursions e LEFT JOIN providers p ON p.id=e.provider_id WHERE e.id=${b['excursion_id'].i64()}') or {
			empty_row()
		}
		// el token sólo se entrega a quien lo presenta o buscó por su teléfono
		owns := (token != '' && token == b['token']) || code == ''
		mut pb := a.public_booking(b, exc, owns)
		pb['b_owner'] = if owns { '1' } else { '0' }
		mut extra := ''
		if owns {
			cust := a.find_customer(b['customer_phone'])
			wal := a.wallet_balance(b['customer_phone'])
			tl := a.db.rows("SELECT to_state, note, created_at FROM pipeline_events WHERE entity='booking' AND entity_id=${b['id'].i64()} ORDER BY id") or {
				[]Row{}
			}
			extra = ',"wallet_balance":${wal:.2f},"referral_code":${jstr(cust['referral_code'] or { '' })},"club":${a.is_club(b['customer_phone'])},"timeline":${a.schema.rows_json(tl)}'
		}
		js := a.schema.row_json(pb)
		parts << js[..js.len - 1] + extra + '}'
	}
	return json_ok('{"items":[${parts.join(',')}]}')
}

// ── pago / abono desde el voucher ───────────────────────────────────────────
fn (mut a App) voucher_pay(r &Req) Resp {
	if a.limited(r, 'pay', 20, 60) {
		return fail_code(429, 'rate_limited', 'Demasiados intentos. Espera un momento.')
	}
	b := body_map(r)
	code := (b['code'] or { b['id'] or { '' } }).trim_space()
	if code == '' {
		return fail_code(400, 'missing_code', 'Falta el código de reserva o folio.')
	}
	bk := a.booking_by_code(code)
	if bk.len == 0 {
		return fail_code(404, 'not_found', 'Reservación no encontrada.')
	}
	if bk['status'] == 'cancelled' {
		return fail_code(400, 'booking_cancelled', 'No se pueden realizar abonos a una reservación cancelada.')
	}
	total := bk['total'].f64()
	paid := bk['amount_paid'].f64()
	if total > 0 && paid >= total {
		return fail_code(400, 'already_paid', 'Esta reservación ya se encuentra liquidada en su totalidad.')
	}
	remaining := round2(total - paid)
	mut amount := (b['amount'] or { '0' }).f64()
	if amount <= 0 {
		exc := a.db.get('excursions', bk['excursion_id'].i64()) or { empty_row() }
		dep := exc['deposit_amount'].f64() * bk['people'].f64()
		amount = if dep > 0 && paid == 0 && dep < remaining { dep } else { remaining }
	}
	if amount <= 0 {
		return fail_code(400, 'invalid_amount', 'El monto a abonar debe ser mayor a \$0.')
	}
	if amount > remaining + 0.005 {
		return fail_code(400, 'amount_exceeds_balance', 'El monto excede el saldo restante (${fmt_money(remaining)}).')
	}
	method := b['method'] or { 'card_online' }
	mode := a.cfg('payments.mode', 'demo')
	if mode == 'gateway' {
		tok := env_or('MERCADOPAGO_ACCESS_TOKEN', '')
		if tok == '' {
			return fail_code(503, 'gateway_unavailable', 'La pasarela de pago no está configurada.')
		}
		ext := '${bk['code']}|${rand_token(4)}'
		url, pref := mp_create_preference(tok, 'Easypoint ${bk['excursion_name']} (${bk['code']})', amount, ext, a.voucher_url(bk['code'], bk['token']), '${a.app_url()}/api/webhooks/mercadopago') or {
			return fail_code(502, 'gateway_error', 'No pudimos abrir la pasarela de pago.')
		}
		return json_ok('{"ok":true,"mode":"gateway","checkout_url":${jstr(url)},"preference":${jstr(pref)},"amount":${amount:.2f}}')
	}
	if mode == 'manual_confirm' {
		ref := 'EP-' + rand_code(6)
		a.db.insert('payments', {
			'kind': 'excursion', 'ref': bk['code'], 'booking_id': bk['id'], 'label': 'Transferencia por confirmar: ${bk['customer_name']}'
			'amount': qf(amount), 'net': qf(amount), 'method': 'transfer', 'status': 'pending_confirm', 'gateway_ref': ref
		}) or {}
		a.task(TaskIn{
			kind:      'confirm_transfer'
			role:      'admin'
			priority:  'high'
			title:     'Confirmar transferencia ${fmt_money(amount)} · ${bk['code']}'
			detail:    'Referencia ${ref}. Verifica el depósito y confirma.'
			entity:    'booking'
			entity_id: bk['id'].i64()
			dedupe:    'transfer:${ref}'
			action:    'confirm_transfer'
		})
		return json_ok('{"ok":true,"mode":"manual_confirm","reference":${jstr(ref)},"amount":${amount:.2f},"instructions":${jstr(a.cfg('payments.instructions', 'Deposita a la CLABE indicada por WhatsApp e indica tu referencia.'))}}')
	}
	// demo: pago simulado inmediato (sólo para pruebas / demostraciones)
	res := a.apply_payment(PayIn{
		booking_id: bk['id'].i64()
		amount:     amount
		method:     method
		channel:    'online_abono'
		label:      'Abono online: ${bk['customer_name']} (${bk['code']})'
		actor:      'cliente'
	})
	if !res.ok {
		return fail_code(409, res.err, 'No se pudo aplicar el abono.')
	}
	fresh := a.booking_by_code(bk['code'])
	return json_ok('{"ok":true,"mode":"demo","voucher_code":${jstr(fresh['code'])},"total":${fresh['total'].f64():.2f},"amount_paid":${fresh['amount_paid'].f64():.2f},"balance":${fresh['balance'].f64():.2f},"payment_status":${jstr(fresh['payment_status'])},"status":${jstr(fresh['status'])},"receipt":{"date":${jstr(now_dt())},"amount_added":${amount:.2f},"method":${jstr(method)}}}')
}

// ── autoservicio del cliente (requiere el token del voucher) ────────────────
fn (mut a App) owned_booking(b map[string]string) (Row, Row, ?Resp) {
	code := b['code'] or { '' }
	token := b['token'] or { b['t'] or { '' } }
	bk := a.booking_by_code(code)
	if bk.len == 0 || token == '' || token != bk['token'] {
		return empty_row(), empty_row(), fail_code(403, 'invalid_token', 'No pudimos validar tu voucher. Abre el enlace que te enviamos.')
	}
	exc := a.db.get('excursions', bk['excursion_id'].i64()) or { empty_row() }
	return bk, exc, none
}

fn (mut a App) voucher_reschedule(r &Req) Resp {
	if a.limited(r, 'resched', 15, 60) {
		return fail_code(429, 'rate_limited', 'Demasiados intentos.')
	}
	b := body_map(r)
	bk, exc, bad := a.owned_booking(b)
	if bad != none {
		return bad
	}
	if bk['status'] !in ['new', 'confirmed'] {
		return fail_code(400, 'not_reschedulable', 'Esta reserva ya no se puede mover.')
	}
	days_to := days_between(today(), bk['excursion_date'])
	if days_to < a.cfg_i('policy.reschedule_min_days', 3) {
		return fail_code(400, 'too_late', 'Ya es muy tarde para cambiar la fecha.')
	}
	date := (b['date'] or { '' }).trim_space()
	if !is_date(date) || date <= today() || date == bk['excursion_date'] {
		return fail_code(400, 'date_invalid', 'Elige otra fecha futura.')
	}
	dep := a.db.one('SELECT * FROM departures WHERE excursion_id=${bk['excursion_id'].i64()} AND date=${q(date)}') or {
		empty_row()
	}
	if dep.len == 0 || dep['status'] != 'open' {
		return fail_code(400, 'date_unavailable', 'Esa fecha no está disponible.')
	}
	people := bk['people'].int()
	mut cap := exc['max_capacity'].int()
	if dep['capacity'].int() > 0 {
		cap = dep['capacity'].int()
	}
	free := bk['protect'] == '1' || a.is_club(bk['customer_phone']) || bk['reschedules'].int() == 0 && a.cfg_b('policy.first_reschedule_free', true)
	fee := if free { 0.0 } else { a.cfg_f('policy.reschedule_fee', 150) }
	lk := 'ep_book_${bk['excursion_id']}_${date}'
	guard := if cap > 0 {
		"(SELECT COALESCE(SUM(people),0) FROM bookings WHERE excursion_id=${bk['excursion_id'].i64()} AND excursion_date=${q(date)} AND status<>'cancelled') + ${people} <= ${cap}"
	} else {
		'1=1'
	}
	script := "SELECT GET_LOCK(${q(lk)}, 5) INTO @l;
UPDATE bookings SET excursion_date=${q(date)}, departure_id=${dep['id'].i64()}, reschedules=reschedules+1, total=total+${qf(fee)}, balance=GREATEST(total-amount_paid,0), payment_status=IF(total>0 AND amount_paid>=total,'paid',IF(amount_paid>0,'partial','pending')), updated_at=${q(now_dt())} WHERE id=${bk['id'].i64()} AND status IN ('new','confirmed') AND ${guard};
SET @n = ROW_COUNT();
SELECT RELEASE_LOCK(${q(lk)}) INTO @r;
SELECT @n AS n"
	rs := a.db.rows(script) or { return fail_code(500, 'db_error', 'No pudimos cambiar la fecha.') }
	if rs.len == 0 || rs[0]['n'].int() == 0 {
		return fail_code(409, 'sold_out', 'Esa fecha ya no tiene cupo disponible.')
	}
	a.event('booking', bk['id'].i64(), bk['excursion_date'], date, 'cliente', 'Cambio de fecha${if fee > 0 { ' (cargo ' + fmt_money(fee) + ')' } else { ' gratis' }}')
	a.restage(bk['id'].i64(), 'cliente')
	fresh := a.booking_by_code(bk['code'])
	a.notify_booking(fresh, exc, 'reschedule_done', map[string]string{}, 'resch:${bk['id']}:${date}')
	return json_ok('{"ok":true,"fee":${fee:.2f},"booking":${a.schema.row_json(a.public_booking(fresh, exc, true))}}')
}

fn (mut a App) voucher_cancel(r &Req) Resp {
	if a.limited(r, 'cancel', 10, 60) {
		return fail_code(429, 'rate_limited', 'Demasiados intentos.')
	}
	b := body_map(r)
	bk, exc, bad := a.owned_booking(b)
	if bad != none {
		return bad
	}
	if bk['status'] !in ['new', 'confirmed'] {
		return fail_code(400, 'not_cancellable', 'Esta reserva ya no se puede cancelar.')
	}
	days_to := days_between(today(), bk['excursion_date'])
	if days_to < 0 {
		return fail_code(400, 'too_late', 'La fecha de la salida ya pasó.')
	}
	paid := bk['amount_paid'].f64()
	mut refund := 0.0
	mut credit_amt := paid
	mut outcome := ''
	if bk['protect'] == '1' && days_to >= 7 && paid > 0 {
		pct := a.cfg_f('policy.protect_refund_pct', 80)
		refund = round2(paid * pct / 100.0)
		credit_amt = round2(paid - refund)
		outcome = 'Con Easypoint Protege solicitamos el reembolso de ${mxn(refund)} a tu forma de pago original y ${mxn(credit_amt)} quedaron como crédito.'
	} else if paid > 0 {
		outcome = 'Tus ${mxn(paid)} quedaron como crédito Easypoint, vigente ${a.cfg_i('policy.credit_validity_months', 12)} meses, para otra experiencia.'
	} else {
		outcome = 'No tenías abonos; liberamos tu lugar.'
	}
	a.db.exec("UPDATE bookings SET status='cancelled', payment_status=IF(${qf(paid)}>0,'credit',payment_status), closed_reason='cancelled_by_customer', updated_at=${q(now_dt())} WHERE id=${bk['id'].i64()} AND status IN ('new','confirmed')") or {
		return fail_code(500, 'db_error', 'No pudimos cancelar.')
	}
	if credit_amt > 0 {
		a.credit(bk['customer_phone'], bk['customer_name'], credit_amt, 'credit_from_booking', bk['code'])
	}
	if refund > 0 {
		tid := a.db.insert('support_tickets', {
			'code':          'TK-' + rand_code(5)
			'kind':          'refund_request'
			'subject_ref':   bk['code']
			'booking_id':    bk['id']
			'customer_name': bk['customer_name']
			'customer_phone': bk['customer_phone']
			'customer_email': bk['customer_email']
			'message':       'Reembolso Protege por cancelación: ${mxn(refund)} (${a.cfg_f('policy.protect_refund_pct', 80):.0f}% de ${mxn(paid)}).'
			'priority':      'high'
			'compensation':  qf(refund)
		}) or { 0 }
		a.task(TaskIn{
			kind:      'refund_protect'
			role:      'admin'
			priority:  'high'
			title:     'Reembolso Protege ${mxn(refund)} · ${bk['code']}'
			detail:    'El cliente canceló con ≥7 días. Reembolsa a su forma de pago original y marca el ticket.'
			entity:    'support_tickets'
			entity_id: tid
			dedupe:    'refund:${bk['id']}'
			action:    'open_ticket'
		})
	}
	a.restage(bk['id'].i64(), 'cliente')
	a.event('booking', bk['id'].i64(), bk['status'], 'cancelled', 'cliente', outcome)
	a.notify_booking(a.booking_by_code(bk['code']), exc, 'booking_cancelled', {
		'outcome': outcome
	}, 'cancel:${bk['id']}')
	return json_ok('{"ok":true,"credit":${credit_amt:.2f},"refund_requested":${refund:.2f},"message":${jstr(outcome)}}')
}

fn (mut a App) voucher_review(r &Req) Resp {
	b := body_map(r)
	bk, exc, bad := a.owned_booking(b)
	if bad != none {
		return bad
	}
	if bk['status'] != 'completed' || bk['rating'].int() != 0 {
		return fail_code(400, 'not_reviewable', 'Esta experiencia no admite reseña.')
	}
	rating := (b['rating'] or { '0' }).int()
	if rating < 1 || rating > 5 {
		return fail_code(400, 'rating_invalid', 'Califica de 1 a 5.')
	}
	text := (b['text'] or { '' }).trim_space()
	a.db.update('bookings', bk['id'].i64(), {
		'rating':      rating.str()
		'review_text': text
	}) or {}
	exc_id := bk['excursion_id'].i64()
	a.db.exec("UPDATE excursions e SET rating_avg=(SELECT ROUND(AVG(rating),2) FROM bookings WHERE excursion_id=e.id AND rating>0), rating_count=(SELECT COUNT(*) FROM bookings WHERE excursion_id=e.id AND rating>0) WHERE e.id=${exc_id}") or {}
	a.event('booking', bk['id'].i64(), '', 'resena_${rating}', 'cliente', text)
	mut public_ok := false
	if rating <= 3 {
		// canal privado: la queja se resuelve antes de hacerse pública
		tid := a.db.insert('support_tickets', {
			'code':          'TK-' + rand_code(5)
			'kind':          'complaint'
			'subject_ref':   bk['code']
			'booking_id':    bk['id']
			'customer_name': bk['customer_name']
			'customer_phone': bk['customer_phone']
			'customer_email': bk['customer_email']
			'message':       'Reseña ${rating}/5 de ${bk['excursion_name']}: ${text}'
			'priority':      'high'
		}) or { 0 }
		a.task(TaskIn{
			kind:      'ticket'
			role:      'admin'
			priority:  'urgent'
			title:     'Reseña baja ${rating}/5 · ${bk['excursion_name']}'
			detail:    text
			entity:    'support_tickets'
			entity_id: tid
			dedupe:    'ticket:${tid}'
			action:    'open_ticket'
		})
	} else {
		public_ok = true
		bonus := a.cfg_f('growth.review_bonus', 20)
		if bonus > 0 {
			a.credit(bk['customer_phone'], bk['customer_name'], bonus, 'review_bonus', bk['code'])
		}
	}
	_ = exc
	return json_ok('{"ok":true,"public_review_prompt":${public_ok},"review_url":${jstr(a.cfg('brand.review_url', ''))}}')
}

// ── cancelar una salida completa (clima / proveedor / cupo mínimo) ──────────
fn (mut a App) cancel_departure(exc_id i64, date string, reason string, actor string) (int, f64, f64) {
	exc := a.db.get('excursions', exc_id) or { empty_row() }
	rows := a.db.rows("SELECT * FROM bookings WHERE excursion_id=${exc_id} AND excursion_date=${q(date)} AND status IN ('new','confirmed')") or {
		[]Row{}
	}
	provider_fault := reason == 'proveedor'
	bonus_pct := if provider_fault { a.cfg_f('settlement.provider_cancel_bonus_pct', 10) } else { 0.0 }
	until := add_months_dt(now_dt(), a.cfg_i('policy.credit_validity_months', 12))[..10]
	mut n := 0
	mut credited := 0.0
	mut bonus_total := 0.0
	for b in rows {
		paid := b['amount_paid'].f64()
		bonus := round2(paid * bonus_pct / 100.0)
		if paid > 0 {
			a.credit(b['customer_phone'], b['customer_name'], paid, 'credit_from_booking', b['code'])
			if bonus > 0 {
				a.credit(b['customer_phone'], b['customer_name'], bonus, 'bonus_departure_cancelled', b['code'])
			}
		}
		a.db.exec("UPDATE bookings SET status='cancelled', payment_status=IF(${qf(paid)}>0,'credit',payment_status), closed_reason=${q('departure_cancelled:' + reason)}, updated_at=${q(now_dt())} WHERE id=${b['id'].i64()}") or {}
		a.restage(b['id'].i64(), actor)
		a.event('booking', b['id'].i64(), 'activa', 'cancelada', actor, 'Salida cancelada: ${reason}')
		reason_txt := match reason {
			'clima' { 'condiciones climáticas' }
			'cupo_minimo' { 'cupo mínimo no alcanzado' }
			else { 'decisión del proveedor' }
		}
		a.notify_booking(b, exc, 'departure_cancelled', {
			'reason':    reason_txt
			'amount':    mxn(paid)
			'bonus_txt': if bonus > 0 { ' + ${mxn(bonus)} de bono por la molestia' } else { '' }
			'until':     until
		}, 'depcancel:${b['id']}')
		n++
		credited += paid
		bonus_total += bonus
	}
	a.db.exec("UPDATE departures SET status='cancelled', note=${q('Cancelada: ' + reason)} WHERE excursion_id=${exc_id} AND date=${q(date)}") or {}
	a.close_tasks('dep:${exc_id}:${date}')
	a.event('departure', exc_id, 'programada', 'cancelada', actor, '${date} · ${reason}')
	return n, credited, bonus_total
}
