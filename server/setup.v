module main

import time

// Asistente de configuración inicial del entorno REAL (el de demostración vive aparte, ver demo.v).
// Modelo: lista de pasos con estado + detalle (como el asistente de BestTorni). Cada paso valida lo que guarda y la lista
// indica qué falta para operar de verdad. Nada de esto aplica a la demo.
//
//   GET  /api/setup/status      público   ¿hay administrador? ¿configuración terminada? ¿demo disponible?
//   POST /api/setup/admin       público   crea el PRIMER administrador (sólo si no existe ninguno; EP_SETUP_TOKEN si está definido)
//   GET  /api/setup/checklist   admin     pasos + auditoría por áreas
//   POST /api/setup/business    admin     marca, datos fiscales y contacto
//   POST /api/setup/payments    admin     modo de cobro (pasarela | transferencia) y cuenta de depósito
//   POST /api/setup/params      admin     economía: preset y parámetros (comisiones, políticas, límites)
//   POST /api/setup/point       admin     primer punto + su operador
//   POST /api/setup/provider    admin     proveedor de excursiones + su acceso
//   POST /api/setup/user        admin     chofer, ventas, soporte u otro operador
//   POST /api/setup/channels    admin     WhatsApp, reseñas, URL pública
//   POST /api/setup/finish      admin     cierra la configuración (exige los pasos obligatorios)
//   POST /api/setup/purge-demo  admin     borra datos de prueba que hayan quedado en la base real (confirmación escrita)

const demo_emails = ['admin@easypoint.mx', 'punto@easypoint.mx', 'chofer@easypoint.mx', 'proveedor@easypoint.mx', 'ventas@easypoint.mx', 'soporte@easypoint.mx']

// Claves que el asistente puede escribir en bloque (grupos de parámetros del negocio).
const param_groups = ['policy.', 'pricing.', 'club.', 'referral.', 'cash.', 'support.', 'settlement.', 'guides.', 'growth.', 'ops.', 'econ.']

// Perfiles de economía: puntos de partida razonables que el dueño ajusta después.
fn econ_preset(name string) map[string]string {
	return match name {
		'arranque' {
			// crecer red y confianza primero: incentivos altos, precio estable
			{
				'pricing.dynamic_enabled': 'false'
				'pricing.protect_pct':     '5'
				'club.price_month':        '79'
				'club.cashback_pct':       '5'
				'referral.reward_referrer': '100'
				'referral.reward_referee':  '100'
				'settlement.instant_fee_pct': '1.5'
			}
		}
		'rentable' {
			// margen primero: precio dinámico, Protege y Club en su punto
			{
				'pricing.dynamic_enabled': 'true'
				'pricing.protect_pct':     '8'
				'club.price_month':        '129'
				'club.cashback_pct':       '4'
				'referral.reward_referrer': '75'
				'referral.reward_referee':  '75'
				'settlement.instant_fee_pct': '2'
			}
		}
		else {
			// equilibrio: los valores por defecto
			{
				'pricing.dynamic_enabled': 'false'
				'pricing.protect_pct':     '6'
				'club.price_month':        '99'
				'club.cashback_pct':       '5'
				'referral.reward_referrer': '100'
				'referral.reward_referee':  '100'
				'settlement.instant_fee_pct': '1.5'
			}
		}
	}
}

// Dígito verificador de una CLABE (18 dígitos, pesos 3-7-1).
fn clabe_valid(c string) bool {
	if c.len != 18 {
		return false
	}
	w := [3, 7, 1]
	mut sum := 0
	for i in 0 .. 17 {
		ch := c[i]
		if ch < `0` || ch > `9` {
			return false
		}
		sum += ((int(ch - `0`)) * w[i % 3]) % 10
	}
	dv := (10 - (sum % 10)) % 10
	return c[17] == u8(`0` + dv)
}

fn email_ok(e string) bool {
	return e.len >= 5 && e.contains('@') && e.all_after('@').contains('.') && !e.contains(' ')
}

fn (mut a App) has_admin() bool {
	return a.db.count('users', "role='admin' AND active=1") > 0
}

fn (mut a App) schema_ready() bool {
	return (a.db.scalar("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('users','ep_config','points')") or {
		'0'
	}).int() == 3
}

fn (mut a App) setup_done() bool {
	return a.cfg_b('setup.completed', false)
}

// Clave de la pasarela: variable de entorno primero (producción), si no la guardada por el asistente.
fn (mut a App) mp_token() string {
	t := env_or('MERCADOPAGO_ACCESS_TOKEN', '')
	if t != '' {
		return t
	}
	return a.cfg('secret.mp_token', '')
}

// Modo de cobro efectivo. En la demo siempre se simula; en el entorno real NUNCA se simula:
// si el dueño no eligió un modo, no se cobra (se devuelve 'unset').
fn (mut a App) pay_mode() string {
	m := a.cfg('payments.mode', '')
	if a.in_demo {
		// la demo simula siempre; sólo deja probar la confirmación manual (no mueve dinero). Nunca la pasarela real.
		return if m == 'manual_confirm' { m } else { 'demo' }
	}
	if m == 'gateway' || m == 'manual_confirm' {
		return m
	}
	return 'unset'
}

fn pay_unset() Resp {
	return fail_code(503, 'payments_not_configured', 'Los pagos en línea aún no están disponibles. Escríbenos por WhatsApp para apartar.')
}

fn (mut a App) route_setup(r &Req, segs []string) Resp {
	if a.in_demo {
		return fail_code(403, 'not_in_demo', 'La configuración inicial sólo aplica al entorno real.')
	}
	if segs.len < 3 {
		return fail(404, 'not_found')
	}
	m := r.method
	match segs[2] {
		'status' {
			if m == 'GET' {
				return a.setup_status()
			}
		}
		'admin' {
			if m == 'POST' {
				return a.setup_admin(r)
			}
		}
		else {
			u := a.auth(r) or { return fail_code(401, 'unauthorized', 'Inicia sesión como administrador.') }
			if u.role != 'admin' {
				return fail(403, 'forbidden')
			}
			match segs[2] {
				'checklist' { if m == 'GET' { return a.setup_checklist() } }
				'business' { if m == 'POST' { return a.setup_business(u, r) } }
				'payments' { if m == 'POST' { return a.setup_payments(u, r) } }
				'params' { if m == 'POST' { return a.setup_params(u, r) } }
				'point' { if m == 'POST' { return a.setup_point(u, r) } }
				'provider' { if m == 'POST' { return a.setup_provider(u, r) } }
				'user' { if m == 'POST' { return a.setup_user(u, r) } }
				'channels' { if m == 'POST' { return a.setup_channels(u, r) } }
				'finish' { if m == 'POST' { return a.setup_finish(u) } }
				'purge-demo' { if m == 'POST' { return a.setup_purge(u, r) } }
				else {}
			}
		}
	}
	return fail(404, 'not_found')
}

fn (mut a App) setup_status() Resp {
	ready := a.schema_ready()
	has := ready && a.has_admin()
	done := has && a.setup_done()
	brand := if ready { a.cfg('brand.name', '') } else { '' }
	return json_ok('{"schema_ready":${jbool(ready)},"has_admin":${jbool(has)},"completed":${jbool(done)},"demo_available":${jbool(a.demo_on)},"token_required":${jbool(env_or('EP_SETUP_TOKEN', '') != '')},"brand":${jstr(brand)}}')
}

fn (mut a App) setup_admin(r &Req) Resp {
	if a.limited(r, 'setup_admin', 8, 900) {
		return fail_code(429, 'rate_limited', 'Demasiados intentos. Espera unos minutos.')
	}
	need := env_or('EP_SETUP_TOKEN', '')
	b := body_map(r)
	if need != '' && (b['token'] or { '' }) != need {
		return fail_code(403, 'bad_setup_token', 'El código de instalación no es correcto.')
	}
	// base en blanco: se prepara sola (idempotente)
	a.db.migrate() or { return fail_code(500, 'migrate_failed', 'No se pudo preparar la base de datos: ${err.msg()}') }
	a.seed_config()
	a.seed_services()
	a.seed_rules()
	if a.has_admin() {
		return fail_code(409, 'already_configured', 'Este sitio ya tiene un administrador. Inicia sesión.')
	}
	email := (b['email'] or { '' }).trim_space().to_lower()
	name := (b['name'] or { '' }).trim_space()
	pass := b['password'] or { '' }
	if !email_ok(email) {
		return fail_code(400, 'invalid_email', 'Escribe un correo válido.')
	}
	if name.len < 2 {
		return fail_code(400, 'invalid_name', 'Escribe tu nombre.')
	}
	if pass.len < 10 {
		return fail_code(400, 'weak_password', 'La contraseña debe tener al menos 10 caracteres.')
	}
	if email in demo_emails {
		return fail_code(400, 'reserved_email', 'Usa tu propio correo, no uno de demostración.')
	}
	id := a.db.insert('users', {
		'email':         email
		'password_hash': hash_password(pass)
		'name':          name
		'phone':         phone10(b['phone'] or { '' })
		'role':          'admin'
		'active':        '1'
	}) or { return fail_code(409, 'email_taken', 'Ese correo ya está registrado.') }
	a.audit(email, 'setup_admin', 'users', id, 'primer administrador')
	tok := jwt_mint(a.tsec(), id, 'admin', 12 * 3600)
	return json_ok('{"ok":true,"token":${jstr(tok)},"user":{"id":${id},"email":${jstr(email)},"name":${jstr(name)},"role":"admin","point_id":0,"provider_id":0,"phone":""}}')
}

// ── pasos: validan y guardan ─────────────────────────────────────────────────
fn (mut a App) setup_business(u User, r &Req) Resp {
	b := body_map(r)
	f := fn [b] (k string, n int) string {
		v := (b[k] or { '' }).trim_space()
		return if v.len > n { v[..n] } else { v }
	}
	brand := f('brand_name', 80)
	legal := f('legal_name', 160)
	rfc := f('rfc', 13).to_upper().replace(' ', '')
	email := f('email', 190).to_lower()
	zip := f('zip', 5)
	if brand.len < 2 {
		return fail_code(400, 'invalid', 'Escribe el nombre comercial.')
	}
	if rfc != '' && (rfc.len < 12 || rfc.len > 13) {
		return fail_code(400, 'invalid_rfc', 'El RFC debe tener 12 (persona moral) o 13 caracteres (persona física).')
	}
	if zip != '' && (zip.len != 5 || zip.bytes().any(it < `0` || it > `9`)) {
		return fail_code(400, 'invalid_zip', 'El código postal debe tener 5 dígitos.')
	}
	if email != '' && !email_ok(email) {
		return fail_code(400, 'invalid_email', 'El correo de contacto no es válido.')
	}
	a.set_cfg('brand.name', brand)
	a.set_cfg('biz.legal_name', legal)
	a.set_cfg('biz.rfc', rfc)
	a.set_cfg('biz.regime', f('regime', 3))
	a.set_cfg('biz.zip', zip)
	a.set_cfg('biz.email', email)
	a.set_cfg('biz.phone', phone10(f('phone', 30)))
	a.set_cfg('biz.address', f('address', 300))
	a.set_cfg('biz.configured', 'true')
	a.audit(u.email, 'setup_business', 'ep_config', 0, brand)
	return json_ok('{"ok":true}')
}

fn (mut a App) setup_payments(u User, r &Req) Resp {
	b := body_map(r)
	mode := (b['mode'] or { '' }).trim_space()
	if mode != 'gateway' && mode != 'manual_confirm' {
		return fail_code(400, 'invalid_mode', 'Elige cómo cobrarás: pasarela de pago o transferencia con confirmación.')
	}
	if mode == 'gateway' {
		tok := (b['mp_token'] or { '' }).trim_space()
		if tok != '' {
			a.set_cfg('secret.mp_token', tok)
		}
		if a.mp_token() == '' {
			return fail_code(400, 'missing_token', 'Pega el Access Token de Mercado Pago (o defínelo en el servidor como MERCADOPAGO_ACCESS_TOKEN).')
		}
	} else {
		clabe := (b['clabe'] or { '' }).trim_space().replace(' ', '')
		bank := (b['bank'] or { '' }).trim_space()
		who := (b['beneficiary'] or { '' }).trim_space()
		if !clabe_valid(clabe) {
			return fail_code(400, 'invalid_clabe', 'La CLABE no es válida: son 18 dígitos y el último es verificador.')
		}
		if bank.len < 2 || who.len < 3 {
			return fail_code(400, 'invalid', 'Indica el banco y el nombre del beneficiario.')
		}
		a.set_cfg('payments.clabe', clabe)
		a.set_cfg('payments.bank', bank)
		a.set_cfg('payments.beneficiary', who)
		ins := (b['instructions'] or { '' }).trim_space()
		if ins != '' {
			a.set_cfg('payments.instructions', ins)
		}
	}
	a.set_cfg('payments.mode', mode)
	a.audit(u.email, 'setup_payments', 'ep_config', 0, mode)
	return json_ok('{"ok":true,"mode":${jstr(mode)}}')
}

fn (mut a App) setup_params(u User, r &Req) Resp {
	b := body_map(r)
	mut n := 0
	preset := (b['preset'] or { '' }).trim_space()
	if preset != '' {
		for k, v in econ_preset(preset) {
			a.set_cfg(k, v)
			n++
		}
	}
	for k, v in b {
		if k == 'preset' {
			continue
		}
		mut allowed := false
		for g in param_groups {
			if k.starts_with(g) {
				allowed = true
			}
		}
		if !allowed || a.db.count('ep_config', 'ckey=${q(k)}') == 0 {
			continue
		}
		if v.len > 400 {
			continue
		}
		a.set_cfg(k, v)
		n++
	}
	a.set_cfg('setup.economics_reviewed', 'true')
	a.audit(u.email, 'setup_params', 'ep_config', 0, '${preset} ${n}')
	return json_ok('{"ok":true,"updated":${n}}')
}

// Crea un usuario con contraseña temporal (se muestra una sola vez). Devuelve (id, contraseña) o un error.
fn (mut a App) new_user(name string, email string, role string, phone string, point_id i64, provider_id i64) !(i64, string) {
	e := email.trim_space().to_lower()
	if !email_ok(e) {
		return error('Escribe un correo válido.')
	}
	if e in demo_emails {
		return error('Usa un correo propio, no uno de demostración.')
	}
	pass := rand_token(5) + rand_code(4)
	id := a.db.insert('users', {
		'email':         e
		'password_hash': hash_password(pass)
		'name':          name
		'phone':         phone10(phone)
		'role':          role
		'point_id':      point_id.str()
		'provider_id':   provider_id.str()
		'active':        '1'
	}) or { return error('Ese correo ya está registrado.') }
	return id, pass
}

fn (mut a App) setup_point(u User, r &Req) Resp {
	b := body_map(r)
	name := (b['name'] or { '' }).trim_space()
	if name.len < 2 {
		return fail_code(400, 'invalid', 'Escribe el nombre del punto.')
	}
	rate := if (b['commission_rate'] or { '' }) == '' { '10' } else { b['commission_rate'] }
	pid := a.db.insert('points', {
		'name':            name
		'address':         b['address'] or { '' }
		'whatsapp':        phone10(b['whatsapp'] or { '' })
		'hours':           b['hours'] or { '' }
		'maps_url':        b['maps_url'] or { '' }
		'lat':             (b['lat'] or { '0' })
		'lng':             (b['lng'] or { '0' })
		'commission_type': 'percent'
		'commission_rate': rate
		'cash_limit':      b['cash_limit'] or { '0' }
		'active':          '1'
	}) or { return fail(500, 'db_error') }
	mut out := '{"ok":true,"point_id":${pid}'
	op_email := (b['operator_email'] or { '' }).trim_space()
	if op_email != '' {
		uid, pass := a.new_user(b['operator_name'] or { name }, op_email, 'operator', b['whatsapp'] or { '' }, pid, 0) or {
			return json_ok('{"ok":true,"point_id":${pid},"warning":${jstr(err.msg())}}')
		}
		out += ',"user":{"id":${uid},"email":${jstr(op_email.to_lower())},"temp_password":${jstr(pass)}}'
	}
	a.audit(u.email, 'setup_point', 'points', pid, name)
	return json_status(201, out + '}')
}

fn (mut a App) setup_provider(u User, r &Req) Resp {
	b := body_map(r)
	name := (b['name'] or { '' }).trim_space()
	if name.len < 2 {
		return fail_code(400, 'invalid', 'Escribe el nombre del proveedor.')
	}
	clabe := (b['clabe'] or { '' }).trim_space().replace(' ', '')
	if clabe != '' && !clabe_valid(clabe) {
		return fail_code(400, 'invalid_clabe', 'La CLABE del proveedor no es válida.')
	}
	pid := a.db.insert('providers', {
		'name':        name
		'whatsapp':    phone10(b['whatsapp'] or { '' })
		'email':       (b['email'] or { '' }).trim_space().to_lower()
		'fee_type':    'percent'
		'fee_rate':    if (b['fee_rate'] or { '' }) == '' { '15' } else { b['fee_rate'] }
		'clabe':       clabe
		'bank_name':   b['bank_name'] or { '' }
		'beneficiary': b['beneficiary'] or { '' }
		'payout_days': b['payout_days'] or { a.cfg('settlement.payout_days', '2') }
		'active':      '1'
	}) or { return fail(500, 'db_error') }
	mut out := '{"ok":true,"provider_id":${pid}'
	em := (b['email'] or { '' }).trim_space()
	if em != '' {
		uid, pass := a.new_user(name, em, 'provider', b['whatsapp'] or { '' }, 0, pid) or {
			return json_ok('{"ok":true,"provider_id":${pid},"warning":${jstr(err.msg())}}')
		}
		out += ',"user":{"id":${uid},"email":${jstr(em.to_lower())},"temp_password":${jstr(pass)}}'
	}
	a.audit(u.email, 'setup_provider', 'providers', pid, name)
	return json_status(201, out + '}')
}

fn (mut a App) setup_user(u User, r &Req) Resp {
	b := body_map(r)
	role := (b['role'] or { '' }).trim_space()
	if role !in ['driver', 'sales', 'support', 'operator', 'admin'] {
		return fail_code(400, 'invalid_role', 'Rol no válido.')
	}
	name := (b['name'] or { '' }).trim_space()
	if name.len < 2 {
		return fail_code(400, 'invalid', 'Escribe el nombre.')
	}
	pt := (b['point_id'] or { '0' }).i64()
	if role == 'operator' && (pt <= 0 || a.db.count('points', 'id=${pt}') == 0) {
		return fail_code(400, 'invalid_point', 'Elige el punto del operador.')
	}
	uid, pass := a.new_user(name, b['email'] or { '' }, role, b['phone'] or { '' }, pt, 0) or {
		return fail_code(400, 'invalid', err.msg())
	}
	a.audit(u.email, 'setup_user', 'users', uid, role)
	return json_status(201, '{"ok":true,"user":{"id":${uid},"email":${jstr((b['email'] or { '' }).trim_space().to_lower())},"role":${jstr(role)},"temp_password":${jstr(pass)}}}')
}

fn (mut a App) setup_channels(u User, r &Req) Resp {
	b := body_map(r)
	wa := phone10(b['whatsapp'] or { '' })
	if wa.len < 10 {
		return fail_code(400, 'invalid', 'Indica el WhatsApp de contacto (10 dígitos).')
	}
	a.set_cfg('brand.whatsapp', wa)
	rv := (b['review_url'] or { '' }).trim_space()
	if rv != '' && !rv.starts_with('https://') {
		return fail_code(400, 'invalid', 'El enlace de reseñas debe empezar con https://')
	}
	a.set_cfg('brand.review_url', rv)
	url := (b['url'] or { '' }).trim_space().trim_right('/')
	if url != '' {
		if !url.starts_with('https://') && !url.starts_with('http://') {
			return fail_code(400, 'invalid', 'La URL pública debe empezar con https://')
		}
		a.set_cfg('brand.url', url)
	}
	a.set_cfg('setup.channels', 'true')
	a.audit(u.email, 'setup_channels', 'ep_config', 0, '')
	return json_ok('{"ok":true}')
}

// ── lista de verificación ────────────────────────────────────────────────────
struct Step {
	key      string
	label    string
	done     bool
	detail   string
	required bool
}

fn (s Step) json() string {
	return '{"key":${jstr(s.key)},"label":${jstr(s.label)},"done":${jbool(s.done)},"required":${jbool(s.required)},"detail":${jstr(s.detail)}}'
}

fn (mut a App) demo_leftovers() int {
	mut n := 0
	for e in demo_emails {
		n += a.db.count('users', 'email=${q(e)}')
	}
	return n
}

fn (mut a App) checklist_steps() []Step {
	mut steps := []Step{}
	// 1 negocio
	brand := a.cfg('brand.name', '')
	cfgd := a.cfg_b('biz.configured', false)
	steps << Step{'business', 'Tu negocio', brand != '' && cfgd, if brand != '' && cfgd { '${brand} · ${a.cfg('biz.legal_name', '')}'.trim(' ·') } else { 'Falta el nombre comercial y los datos de contacto' }, true}
	// 2 pagos
	mode := a.cfg('payments.mode', '')
	mut pdone := false
	mut pdet := 'Elige cómo cobrarás; mientras tanto nadie puede pagar en línea'
	if mode == 'gateway' {
		pdone = a.mp_token() != ''
		pdet = if pdone { 'Pasarela Mercado Pago activa' } else { 'Falta el Access Token de Mercado Pago' }
	} else if mode == 'manual_confirm' {
		cl := a.cfg('payments.clabe', '')
		pdone = clabe_valid(cl)
		pdet = if pdone { 'Transferencia · ${a.cfg('payments.bank', '')} · CLABE …${cl[14..]}' } else { 'Falta una CLABE válida' }
	}
	steps << Step{'payments', 'Cómo cobras', pdone, pdet, true}
	// 3 economía
	steps << Step{'economics', 'Tu modelo de ingresos', a.cfg_b('setup.economics_reviewed', false), if a.cfg_b('setup.economics_reviewed', false) {
		'Protege ${a.cfg('pricing.protect_pct', '6')}% · Club \$${a.cfg('club.price_month', '99')}/mes · pago a proveedor en ${a.cfg('settlement.payout_days', '2')} días'
	} else {
		'Revisa comisiones, Protege, Club y políticas (hay perfiles listos)'
	}, true}
	// 4 puntos
	pts := a.db.count('points', 'active=1')
	ops := a.db.count('users', "role='operator' AND active=1")
	steps << Step{'points', 'Tu primer punto', pts > 0 && ops > 0, if pts == 0 {
		'Aún no hay puntos'
	} else if ops == 0 {
		'${pts} punto(s), pero ninguno tiene operador'
	} else {
		'${pts} punto(s) · ${ops} operador(es)'
	}, true}
	// 5 proveedores
	prov := a.db.count('providers', 'active=1')
	steps << Step{'providers', 'Proveedores de excursiones', prov > 0, if prov > 0 { '${prov} proveedor(es)' } else { 'Sin proveedores: no habrá excursiones que vender (puedes agregarlos después)' }, false}
	// 6 equipo
	drv := a.db.count('users', "role='driver' AND active=1")
	sup := a.db.count('users', "role='support' AND active=1")
	sal := a.db.count('users', "role='sales' AND active=1")
	steps << Step{'team', 'Equipo (chofer, soporte, ventas)', drv > 0 && sup > 0, 'chofer ${drv} · soporte ${sup} · ventas ${sal}', false}
	// 7 canales
	wa := a.cfg('brand.whatsapp', '')
	steps << Step{'channels', 'WhatsApp y reseñas', wa.len >= 10, if wa.len >= 10 { 'WhatsApp ${wa} · reseñas ${if a.cfg('brand.review_url', '') != '' { 'sí' } else { 'sin enlace' }}' } else { 'El WhatsApp es el canal de avisos y soporte' }, true}
	// 8 automatización
	lt := a.cfg('sys.last_tick', '')
	fresh := lt != '' && lt >= add_minutes_dt(now_dt(), -90)
	steps << Step{'automation', 'Motor de automatización', fresh, if lt == '' {
		'Aún no corre. Programa el cron: ep --tick cada 5 min y ep --tick-full cada hora'
	} else if fresh {
		'Última corrida ${lt}'
	} else {
		'Sin correr desde ${lt}: revisa el cron'
	}, false}
	// 9 demo
	left := a.demo_leftovers()
	steps << Step{'demo', 'Sin datos de prueba', left == 0, if left == 0 { 'La base real está limpia' } else { '${left} cuenta(s) de demostración en la base real' }, false}
	return steps
}

fn add_minutes_dt(dt string, mins int) string {
	t := time.parse(dt) or { return dt }
	return t.add(i64(mins) * time.minute).format_ss().replace('T', ' ')
}

fn (mut a App) setup_checklist() Resp {
	steps := a.checklist_steps()
	mut js := []string{}
	mut req_left := 0
	for s in steps {
		js << s.json()
		if s.required && !s.done {
			req_left++
		}
	}
	return json_ok('{"steps":[${js.join(',')}],"required_left":${req_left},"completed":${jbool(a.setup_done())},"ready":${jbool(req_left == 0)},"company":{"brand":${jstr(a.cfg('brand.name', ''))},"legal_name":${jstr(a.cfg('biz.legal_name', ''))},"rfc":${jstr(a.cfg('biz.rfc', ''))},"regime":${jstr(a.cfg('biz.regime', ''))},"zip":${jstr(a.cfg('biz.zip', ''))},"email":${jstr(a.cfg('biz.email', ''))},"phone":${jstr(a.cfg('biz.phone', ''))},"address":${jstr(a.cfg('biz.address', ''))}},"payments":{"mode":${jstr(a.cfg('payments.mode', ''))},"bank":${jstr(a.cfg('payments.bank', ''))},"beneficiary":${jstr(a.cfg('payments.beneficiary', ''))},"has_token":${jbool(a.mp_token() != '')}},"channels":{"whatsapp":${jstr(a.cfg('brand.whatsapp', ''))},"review_url":${jstr(a.cfg('brand.review_url', ''))},"url":${jstr(a.cfg('brand.url', ''))}}}')
}

fn (mut a App) setup_finish(u User) Resp {
	steps := a.checklist_steps()
	mut missing := []string{}
	for s in steps {
		if s.required && !s.done {
			missing << s.label
		}
	}
	if missing.len > 0 {
		return fail_code(409, 'incomplete', 'Falta completar: ${missing.join(', ')}.')
	}
	a.set_cfg('setup.completed', 'true')
	a.set_cfg('setup.completed_at', now_dt())
	a.audit(u.email, 'setup_finish', 'ep_config', 0, '')
	return json_ok('{"ok":true}')
}

// Borra lo operativo que haya quedado en la base REAL (demo sembrada por error o pruebas), conservando configuración,
// catálogo de servicios, reglas de precio y la cuenta del administrador que lo pide.
fn (mut a App) setup_purge(u User, r &Req) Resp {
	if (body_map(r)['confirm'] or { '' }).trim_space() != 'BORRAR DATOS DE PRUEBA' {
		return fail_code(400, 'confirm_required', 'Escribe exactamente: BORRAR DATOS DE PRUEBA')
	}
	keep := ['ep_config', 'schema_migrations', 'services', 'pricing_rules', 'users', 'audit_log', 'rate_limits']
	mut stmts := ['SET FOREIGN_KEY_CHECKS=0']
	for t, _ in a.schema.tables {
		if t in keep {
			continue
		}
		stmts << 'TRUNCATE TABLE ${t}'
	}
	keep_ids := '${u.id}'
	stmts << 'DELETE FROM users WHERE id<>${keep_ids}'
	stmts << 'SET FOREIGN_KEY_CHECKS=1'
	a.db.exec(stmts.join(';\n')) or { return fail_code(500, 'purge_failed', err.msg()) }
	a.set_cfg('setup.completed', 'false')
	a.set_cfg('setup.economics_reviewed', 'false')
	a.audit(u.email, 'setup_purge', 'all', 0, 'datos de prueba eliminados')
	return json_ok('{"ok":true,"note":"Se conservó tu cuenta. Los demás usuarios, puntos y movimientos se eliminaron."}')
}
