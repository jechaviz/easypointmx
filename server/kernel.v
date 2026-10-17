module main

// Núcleo del dominio (puerto del kernel de automatización): eventos, tareas por rol, riesgo,
// jobs, bandeja de salida, CRM, monedero con vencimiento y cotizador. Todo idempotente por dedupe_key.

import strings

// ── conjuntos de claves ya vistas (evita un viaje a la base por cada exists()) ─
fn (mut a App) key_exists(table string, key string) bool {
	if key == '' {
		return false
	}
	if a.keys_on {
		if table !in a.keyset {
			a.keyset[table] = map[string]bool{}
			rs := a.db.rows("SELECT dedupe_key FROM ${table} WHERE dedupe_key<>''") or { []Row{} }
			for r in rs {
				a.keyset[table][r['dedupe_key']] = true
			}
		}
		return key in a.keyset[table]
	}
	return a.db.count(table, 'dedupe_key=${q(key)}') > 0
}

fn (mut a App) key_add(table string, key string) {
	if a.keys_on && key != '' && table in a.keyset {
		a.keyset[table][key] = true
	}
}

// ── eventos y auditoría de entidades ────────────────────────────────────────
fn (mut a App) event(entity string, id i64, from string, to string, actor string, note string) {
	a.db.insert('pipeline_events', {
		'entity':     entity
		'entity_id':  id.str()
		'from_state': from
		'to_state':   to
		'actor':      actor
		'note':       if note.len > 290 { note[..290] } else { note }
	}) or {}
}

// ── tareas por rol ──────────────────────────────────────────────────────────
pub struct TaskIn {
pub:
	kind     string
	title    string
	detail   string
	priority string = 'normal'
	role     string = 'admin'
	scope_id i64
	entity   string
	entity_id i64
	dedupe   string
	action   string
	payload  string
	due_at   string
}

fn (mut a App) task(t TaskIn) bool {
	if t.dedupe == '' || a.key_exists('tasks', t.dedupe) {
		return false
	}
	a.db.insert('tasks', {
		'kind':       t.kind
		'title':      t.title
		'detail':     if t.detail.len > 590 { t.detail[..590] } else { t.detail }
		'priority':   t.priority
		'role':       t.role
		'scope_id':   t.scope_id.str()
		'entity':     t.entity
		'entity_id':  t.entity_id.str()
		'status':     'open'
		'due_at':     t.due_at
		'dedupe_key': t.dedupe
		'action':     t.action
		'payload':    t.payload
	}) or { return false }
	a.key_add('tasks', t.dedupe)
	return true
}

fn (mut a App) close_tasks(prefix string) {
	a.db.exec("UPDATE tasks SET status='done', done_at=${q(now_dt())} WHERE dedupe_key LIKE ${q(prefix + '%')} AND status IN ('open','doing')") or {}
}

// ── riesgo ──────────────────────────────────────────────────────────────────
fn (mut a App) flag(severity string, kind string, entity string, entity_id i64, detail string, dedupe string) {
	if dedupe == '' || a.key_exists('risk_flags', dedupe) {
		return
	}
	a.db.insert('risk_flags', {
		'severity':   severity
		'kind':       kind
		'entity':     entity
		'entity_id':  entity_id.str()
		'detail':     detail
		'status':     'open'
		'dedupe_key': dedupe
	}) or {}
	a.key_add('risk_flags', dedupe)
}

// ── jobs diferidos ──────────────────────────────────────────────────────────
fn (mut a App) job(kind string, run_at string, payload string, dedupe string) {
	if dedupe != '' && a.key_exists('jobs', dedupe) {
		return
	}
	a.db.insert('jobs', {
		'kind':       kind
		'run_at':     run_at
		'payload':    payload
		'dedupe_key': dedupe
	}) or {}
	a.key_add('jobs', dedupe)
}

// ── plantillas (es-MX) ──────────────────────────────────────────────────────
fn render_tpl(name string, v map[string]string) (string, string) {
	g := fn [v] (k string) string {
		return v[k] or { '' }
	}
	match name {
		'booking_received' {
			return 'Tu reserva ${g('code')} está apartada', 'Hola ${g('name')}, apartamos tu lugar en ${g('exc')} (${g('date')}). Pagado: ${g('paid')} · Saldo: ${g('balance')}. Tu voucher: ${g('link')}'
		}
		'nudge_unpaid' {
			return 'Tu lugar sigue apartado — ${g('exc')}', 'Hola ${g('name')}, tu lugar en ${g('exc')} (${g('date')}) sigue esperándote. Aparta con un abono desde ${g('deposit')} o paga en efectivo en un punto Easypoint: ${g('link')}'
		}
		'final_reminder' {
			return 'Último aviso de pago — ${g('exc')}', 'Hola ${g('name')}, faltan ${g('days')} días para ${g('exc')}. Saldo: ${g('balance')}. Liquida antes del ${g('deadline')} para conservar tu lugar (si no, tu abono pasa a crédito Easypoint): ${g('link')}'
		}
		'expired_to_credit' {
			return 'Tu abono ahora es crédito Easypoint', 'Hola ${g('name')}, no se completó el pago de ${g('exc')}. No pierdes nada: ${g('amount')} quedaron como crédito vigente hasta ${g('until')} para otra experiencia. Ver mi crédito: ${g('link')}'
		}
		'voucher_ready' {
			return 'Mañana sales: tu voucher', 'Hola ${g('name')}, mañana es ${g('exc')}. Punto de encuentro: ${g('meeting')}. Muestra tu QR: ${g('link')}'
		}
		'review_request' {
			return '¿Cómo te fue en ${g('exc')}?', 'Hola ${g('name')}, ¿cómo estuvo ${g('exc')}? Califica en 10 segundos y te regalamos crédito en tu próxima aventura: ${g('link')}'
		}
		'referral_reward' {
			return 'Ganaste ${g('amount')} en crédito', 'Hola ${g('name')}, ${g('reason')} Tu crédito ya está en tu monedero (vigente hasta ${g('until')}).'
		}
		'credit_expiring' {
			return 'Tu crédito vence pronto', 'Hola ${g('name')}, ${g('amount')} de tu crédito Easypoint vencen el ${g('until')}. Úsalos en tu próxima experiencia: ${g('link')}'
		}
		'credit_expired' {
			return 'Tu crédito venció', 'Hola ${g('name')}, ${g('amount')} de crédito vencieron. Cuando quieras volver a viajar con nosotros, te esperamos: ${g('link')}'
		}
		'winback' {
			return 'Te extrañamos — ${g('gift')} para tu próxima salida', 'Hola ${g('name')}, hace tiempo no viajas con nosotros. Usa el código ${g('code')} y ahorra ${g('gift')} en tu próxima experiencia: ${g('link')}'
		}
		'departure_cancelled' {
			return 'Cambio en tu salida ${g('exc')}', 'Hola ${g('name')}, la salida del ${g('date')} de ${g('exc')} no se realizará (${g('reason')}). Convertimos tus ${g('amount')} en crédito${g('bonus_txt')}, vigente hasta ${g('until')}. Elige nueva fecha: ${g('link')}'
		}
		'ticket_received' {
			return 'Recibimos tu mensaje', 'Hola ${g('name')}, recibimos tu mensaje y lo vemos en las próximas ${g('hours')} horas. Folio ${g('code')}.'
		}
		'ticket_resolved' {
			return 'Resolvimos tu caso', 'Hola ${g('name')}, tu caso ${g('code')} quedó resuelto: ${g('resolution')}${g('comp_txt')}'
		}
		'club_welcome' {
			return 'Bienvenido a Easypoint Club', 'Hola ${g('name')}, tu membresía está activa hasta ${g('until')}: ${g('cashback')}% de cashback, descuento de socio y cambio de fecha gratis.'
		}
		'point_welcome' {
			return 'Tu punto Easypoint está activo', 'Hola ${g('name')}, ${g('point')} ya es parte de la red Easypoint. Entra a ${g('link')} con tu correo para ver tus tareas de hoy.'
		}
		'application_received' {
			return 'Recibimos tu solicitud', 'Hola ${g('name')}, recibimos la solicitud de ${g('point')}. Te contactamos en menos de ${g('hours')} horas.'
		}
		'provider_payout' {
			return 'Liquidación ${g('folio')}', 'Hola ${g('name')}, tu liquidación ${g('folio')} por ${g('net')} (bruto ${g('gross')}, fee ${g('fee')}) está lista. Se paga a tu CLABE el ${g('pay_on')}.'
		}
		'password_reset' {
			return 'Restablece tu contraseña', 'Hola ${g('name')}, usa este enlace para elegir una contraseña nueva (válido 1 hora): ${g('link')}'
		}
		'reschedule_done' {
			return 'Cambiamos tu fecha', 'Hola ${g('name')}, tu reserva ${g('code')} ahora es para el ${g('date')} (${g('exc')}). Voucher: ${g('link')}'
		}
		'booking_cancelled' {
			return 'Reserva cancelada', 'Hola ${g('name')}, cancelamos tu reserva ${g('code')}. ${g('outcome')}'
		}
		else {
			return 'Easypoint', g('text')
		}
	}
}

// ── bandeja de salida ───────────────────────────────────────────────────────
pub struct NotifyIn {
pub:
	email     string
	phone     string
	name      string
	template  string
	vars      map[string]string
	entity    string
	entity_id i64
	dedupe    string
	prefer    string = 'both'
}

fn (mut a App) queue_msg(channel string, to string, n NotifyIn) bool {
	dk := if n.dedupe == '' { '' } else { '${n.dedupe}:${channel[..1]}' }
	if dk != '' && a.key_exists('outbox', dk) {
		return false
	}
	subject, text := render_tpl(n.template, n.vars)
	link := if channel == 'whatsapp' { wa_link(to, text) } else { '' }
	a.db.insert('outbox', {
		'channel':    channel
		'recipient':  to
		'to_name':    n.name
		'template':   n.template
		'subject':    subject
		'body':       text
		'link':       link
		'status':     'queued'
		'entity':     n.entity
		'entity_id':  n.entity_id.str()
		'dedupe_key': dk
	}) or { return false }
	a.key_add('outbox', dk)
	return true
}

// Encola por los canales disponibles. Devuelve cuántos mensajes nuevos se crearon.
fn (mut a App) notify(n NotifyIn) int {
	mut made := 0
	if n.email != '' && is_email(n.email) && (n.prefer == 'both' || n.prefer == 'email') {
		if a.queue_msg('email', n.email, n) {
			made++
		}
	}
	p := phone10(n.phone)
	if p.len == 10 && (n.prefer == 'both' || n.prefer == 'whatsapp') {
		if a.queue_msg('whatsapp', p, n) {
			made++
		}
	}
	return made
}

// Entrega un mensaje: correo (si hay SMTP), WhatsApp por API (si hay) o "manual" con enlace wa.me.
fn (mut a App) deliver(r Row) string {
	id := r['id'].i64()
	attempts := r['attempts'].int() + 1
	mut status := 'queued'
	match r['channel'] {
		'email' {
			status = send_email(r['recipient'], r['subject'], r['body'])
		}
		'whatsapp' {
			status = send_whatsapp(r['recipient'], r['body'])
		}
		else {
			status = 'skipped'
		}
	}
	if status == 'failed' && attempts < 3 {
		status = 'queued'
	}
	mut data := {
		'status':   status
		'attempts': attempts.str()
	}
	if status == 'sent' {
		data['sent_at'] = now_dt()
	}
	a.db.update('outbox', id, data) or {}
	return status
}

// ── CRM ─────────────────────────────────────────────────────────────────────
fn gen_ref_code(name string) string {
	mut base := ''
	for c in name.to_upper() {
		if c >= `A` && c <= `Z` && base.len < 4 {
			base += c.ascii_str()
		}
	}
	if base == '' {
		base = 'EP'
	}
	return base + rand_code(4)
}

fn (mut a App) find_customer(phone string) Row {
	p := phone10(phone)
	if p == '' {
		return Row(map[string]string{})
	}
	return a.db.one('SELECT * FROM customers WHERE phone=${q(p)} LIMIT 1') or { Row(map[string]string{}) }
}

fn (mut a App) upsert_customer(phone string, name string, email string, source string, referred_by string) Row {
	p := phone10(phone)
	if p.len < 8 {
		return Row(map[string]string{})
	}
	c := a.find_customer(p)
	if c.len == 0 {
		code := gen_ref_code(name)
		id := a.db.insert('customers', {
			'phone':          p
			'name':           name
			'email':          email
			'referral_code':  code
			'referred_by':    referred_by
			'tier':           'base'
			'segment':        'nuevo'
			'marketing_opt_in': '1'
			'source':         source
			'first_seen':     now_dt()
			'last_seen':      now_dt()
		}) or { return Row(map[string]string{}) }
		return a.db.get('customers', id) or { Row(map[string]string{}) }
	}
	mut upd := map[string]string{}
	upd['last_seen'] = now_dt()
	if name != '' && c['name'] == '' {
		upd['name'] = name
	}
	if email != '' && c['email'] == '' {
		upd['email'] = email
	}
	if referred_by != '' && c['referred_by'] == '' && c['trips'].int() == 0 {
		upd['referred_by'] = referred_by
	}
	a.db.update('customers', c['id'].i64(), upd) or {}
	return a.db.get('customers', c['id'].i64()) or { c }
}

fn (mut a App) is_club(phone string) bool {
	c := a.find_customer(phone)
	return c.len > 0 && c['tier'] == 'club' && c['club_until'] >= today()
}

fn segment_of(trips int, spend f64, idle_days int) string {
	if trips >= 3 || spend >= 8000 {
		return if idle_days > 180 { 'vip_dormido' } else { 'vip' }
	}
	if trips >= 2 {
		return if idle_days > 120 { 'en_riesgo' } else { 'recurrente' }
	}
	if trips == 1 {
		return if idle_days > 120 { 'dormido' } else { 'primer_viaje' }
	}
	return 'nuevo'
}

// ── monedero (crédito con vencimiento; sin reembolsos en efectivo) ──────────
fn (mut a App) wallet_balance(phone string) f64 {
	return a.db.scalar('SELECT balance FROM wallets WHERE customer_phone=${q(phone)}') or { '0' }.f64()
}

// Abona crédito. Atómico: UPSERT con incremento + asiento con saldo resultante.
fn (mut a App) credit(phone string, name string, amount f64, reason string, ref string) f64 {
	amt := round2(amount)
	if phone.trim_space() == '' || amt <= 0 {
		return 0
	}
	months := a.cfg_i('policy.credit_validity_months', 12)
	exp := add_months_dt(now_dt(), months)
	nm := now_dt()
	rows := a.db.rows('INSERT INTO wallets (customer_phone, customer_name, balance, updated_at) VALUES (${q(phone)}, ${q(name)}, ${qf(amt)}, ${q(nm)}) ON DUPLICATE KEY UPDATE balance = balance + ${qf(amt)}, updated_at=${q(nm)};
INSERT INTO wallet_entries (customer_phone, amount, reason, ref, balance_after, expires_at, settled, created_at) SELECT ${q(phone)}, ${qf(amt)}, ${q(reason)}, ${q(ref)}, balance, ${q(exp)}, 0, ${q(nm)} FROM wallets WHERE customer_phone=${q(phone)};
SELECT balance FROM wallets WHERE customer_phone=${q(phone)}') or { return 0 }
	return if rows.len > 0 { rows[0]['balance'].f64() } else { 0 }
}

// Consume hasta `amount` del saldo sin dejarlo negativo. Devuelve lo realmente usado.
fn (mut a App) debit(phone string, amount f64, reason string, ref string) f64 {
	amt := round2(amount)
	if amt <= 0 {
		return 0
	}
	avail := a.wallet_balance(phone)
	used := if avail < amt { avail } else { amt }
	if used <= 0 {
		return 0
	}
	nm := now_dt()
	rows := a.db.rows('UPDATE wallets SET balance = balance - ${qf(used)}, updated_at=${q(nm)} WHERE customer_phone=${q(phone)} AND balance >= ${qf(used)};
SELECT ROW_COUNT() AS n') or { return 0 }
	if rows.len == 0 || rows[0]['n'].int() == 0 {
		return 0
	}
	a.db.exec('INSERT INTO wallet_entries (customer_phone, amount, reason, ref, balance_after, settled, created_at) SELECT ${q(phone)}, ${qf(-used)}, ${q(reason)}, ${q(ref)}, balance, 1, ${q(nm)} FROM wallets WHERE customer_phone=${q(phone)}') or {}
	return used
}

pub struct Remaining {
pub:
	id        i64
	remaining f64
	expires   string
	settled   bool
}

// FIFO: lo gastado consume primero las entradas más viejas.
fn (mut a App) fifo_remaining(phone string) []Remaining {
	rs := a.db.rows('SELECT id, amount, expires_at, settled FROM wallet_entries WHERE customer_phone=${q(phone)} ORDER BY created_at, id') or {
		return []Remaining{}
	}
	mut spent := 0.0
	for r in rs {
		x := r['amount'].f64()
		if x < 0 {
			spent += -x
		}
	}
	mut out := []Remaining{}
	for r in rs {
		x := r['amount'].f64()
		if x <= 0 {
			continue
		}
		take := if spent < x { spent } else { x }
		spent -= take
		out << Remaining{
			id:        r['id'].i64()
			remaining: round2(x - take)
			expires:   r['expires_at']
			settled:   r['settled'] == '1'
		}
	}
	return out
}

// ── cotizador (misma lógica para web y servidor) ────────────────────────────
pub struct Adj {
pub:
	kind   string
	label  string
	amount f64
	code   string
}

pub struct Quote {
pub mut:
	excursion_id i64
	date         string
	people       int
	unit_price   f64
	list_total   f64
	adjustments  []Adj
	discount     f64
	surge        f64
	protect_fee  f64
	total        f64
	deposit      f64
	fill_pct     int
	days_to      int
	dynamic      bool
	club         bool
	capacity     int
	taken        int
}

fn (q_ Quote) to_json() string {
	mut adj := strings.new_builder(128)
	adj.write_u8(`[`)
	for i, x in q_.adjustments {
		if i > 0 {
			adj.write_u8(`,`)
		}
		adj.write_string('{"kind":${jstr(x.kind)},"label":${jstr(x.label)},"amount":${x.amount:.2f},"code":${jstr(x.code)}}')
	}
	adj.write_u8(`]`)
	return '{"excursion_id":${q_.excursion_id},"date":${jstr(q_.date)},"people":${q_.people},"unit_price":${q_.unit_price:.2f},"list_total":${q_.list_total:.2f},"adjustments":${adj.str()},"discount":${q_.discount:.2f},"surge":${q_.surge:.2f},"protect_fee":${q_.protect_fee:.2f},"total":${q_.total:.2f},"deposit":${q_.deposit:.2f},"fill_pct":${q_.fill_pct},"days_to":${q_.days_to},"dynamic":${q_.dynamic},"club":${q_.club},"capacity":${q_.capacity},"taken":${q_.taken}}'
}

fn (mut a App) seats_taken(exc_id i64, date string) int {
	return a.db.scalar("SELECT COALESCE(SUM(people),0) FROM bookings WHERE excursion_id=${exc_id} AND excursion_date=${q(date)} AND status<>'cancelled'") or {
		'0'
	}.int()
}

pub struct QuoteOpts {
pub:
	promo   string
	protect bool
	club    bool
}

fn (mut a App) quote(exc Row, date string, people_in int, o QuoteOpts) Quote {
	people := if people_in < 1 { 1 } else { people_in }
	exc_id := exc['id'].i64()
	unit := exc['price'].f64()
	subtotal := round2(unit * f64(people))
	mut cap := exc['max_capacity'].int()
	if is_date(date) {
		dep := a.db.one('SELECT capacity FROM departures WHERE excursion_id=${exc_id} AND date=${q(date)}') or {
			Row(map[string]string{})
		}
		if dep.len > 0 && dep['capacity'].int() > 0 {
			cap = dep['capacity'].int()
		}
	}
	taken := if is_date(date) { a.seats_taken(exc_id, date) } else { 0 }
	fill := if cap > 0 { int(f64(taken) / f64(cap) * 100.0) } else { 0 }
	days_to := if is_date(date) { days_between(today(), date) } else { 999 }
	dynamic := a.cfg_b('pricing.dynamic_enabled', false)
	mut adj := []Adj{}
	rules := a.db.rows('SELECT * FROM pricing_rules WHERE active=1') or { []Row{} }
	t := today()
	for r in rules {
		ex := r['excursion_id'].i64()
		if ex != 0 && ex != exc_id {
			continue
		}
		if r['valid_from'] != '' && t < r['valid_from'] {
			continue
		}
		if r['valid_to'] != '' && t > r['valid_to'] {
			continue
		}
		if r['max_uses'].int() > 0 && r['uses'].int() >= r['max_uses'].int() {
			continue
		}
		kind := r['kind']
		pct := r['pct'].f64()
		mut val := 0.0
		match kind {
			'promo_code' {
				if o.promo == '' || o.promo.trim_space().to_upper() != r['code'].trim_space().to_upper() {
					continue
				}
				val = if pct > 0 { -round2(subtotal * pct / 100.0) } else { -r['amount'].f64() }
			}
			'early_bird' {
				if dynamic && days_to >= r['days'].int() {
					val = -round2(subtotal * pct / 100.0)
				}
			}
			'last_minute' {
				if dynamic && days_to <= r['days'].int() && days_to >= 0 && cap > 0 && fill < r['fill_pct'].int() {
					val = -round2(subtotal * pct / 100.0)
				}
			}
			'group' {
				if dynamic && people >= r['min_people'].int() {
					val = -round2(subtotal * pct / 100.0)
				}
			}
			'member' {
				if dynamic && o.club {
					val = -round2(subtotal * pct / 100.0)
				}
			}
			'surge' {
				if dynamic && cap > 0 && fill >= r['fill_pct'].int() {
					val = round2(subtotal * pct / 100.0)
				}
			}
			else {}
		}
		if val != 0 {
			adj << Adj{
				kind:   kind
				label:  r['label']
				amount: val
				code:   if kind == 'promo_code' { r['code'] } else { '' }
			}
		}
	}
	mut disc := 0.0
	mut surge := 0.0
	for x in adj {
		if x.amount < 0 {
			disc += -x.amount
		} else {
			surge += x.amount
		}
	}
	cap_disc := round2(subtotal * a.cfg_f('pricing.max_discount_pct', 25) / 100.0)
	if disc > cap_disc {
		adj << Adj{
			kind:   'cap'
			label:  'Tope de descuento'
			amount: round2(disc - cap_disc)
		}
		disc = cap_disc
	}
	base := round2(subtotal - disc + surge)
	mut protect := 0.0
	if o.protect {
		pf := round2(base * a.cfg_f('pricing.protect_pct', 6) / 100.0)
		pm := a.cfg_f('pricing.protect_min', 30)
		protect = if pf > pm { pf } else { pm }
	}
	total := round2(base + protect)
	dep_each := exc['deposit_amount'].f64()
	mut deposit := 0.0
	if dep_each > 0 {
		deposit = dep_each * f64(people)
		if deposit > total {
			deposit = total
		}
	}
	return Quote{
		excursion_id: exc_id
		date:         date
		people:       people
		unit_price:   unit
		list_total:   subtotal
		adjustments:  adj
		discount:     round2(disc)
		surge:        round2(surge)
		protect_fee:  round2(protect)
		total:        total
		deposit:      deposit
		fill_pct:     fill
		days_to:      if days_to == 999 { -1 } else { days_to }
		dynamic:      dynamic
		club:         o.club
		capacity:     cap
		taken:        taken
	}
}
