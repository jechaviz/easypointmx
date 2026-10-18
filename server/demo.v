module main

import crypto.hmac
import time

// Entorno de DEMOSTRACIÓN, aislado del real: otra base de datos (EP_DEMO_DB_NAME, por defecto <base>_demo),
// pagos simulados y cuentas ficticias. Sólo se entra con contraseña en /demo (EP_DEMO_PASSWORD, por defecto "midemo").
// El token de la demo (cabecera X-EP-Demo) se firma con un secreto derivado, y las sesiones creadas dentro de la demo
// también: ninguna sirve en el entorno real.

fn (a &App) demo_password() string {
	return env_or('EP_DEMO_PASSWORD', 'midemo')
}

// Selecciona el entorno de la petición según X-EP-Demo. Devuelve una respuesta de error si el token no sirve.
fn (mut a App) select_env(r &Req) ?Resp {
	tok := (r.headers['x-ep-demo'] or { '' }).trim_space()
	if tok == '' {
		a.set_env(false)
		return none
	}
	if !a.demo_on {
		a.set_env(false)
		return fail_code(503, 'demo_unavailable', 'La demostración no está habilitada en este servidor.')
	}
	if jwt_verify(a.secret + ':demogate', tok) != 1 {
		a.set_env(false)
		return fail_code(401, 'demo_expired', 'La demostración expiró. Vuelve a entrar en /demo.')
	}
	a.set_env(true)
	return none
}

// Asegura que la base de demostración exista, tenga esquema y datos.
fn (mut a App) ensure_demo() ! {
	a.set_env(true)
	defer {
		a.set_env(false)
	}
	has := a.db.scalar('SELECT COUNT(*) FROM points') or { '' }
	if has == '' {
		a.db.migrate()!
	}
	if (a.db.scalar('SELECT COUNT(*) FROM points') or { '0' }).int() == 0 {
		a.seed_config()
		a.seed_demo()
		a.set_cfg('payments.mode', 'demo')
	}
}

// Vacía y vuelve a sembrar la demostración (sólo la base demo).
fn (mut a App) reset_demo() ! {
	a.set_env(true)
	defer {
		a.set_env(false)
	}
	a.db.migrate()!
	mut stmts := []string{}
	for t, _ in a.schema.tables {
		stmts << 'TRUNCATE TABLE ${t}'
	}
	a.db.exec(stmts.join(';\n'))!
	a.cfgcache = map[string]string{}
	a.cfgload = false
	a.seed_config()
	a.seed_demo()
	a.set_cfg('payments.mode', 'demo')
}

fn (mut a App) route_demo(r &Req, segs []string) Resp {
	a.set_env(false)
	if segs.len < 3 {
		return fail(404, 'not_found')
	}
	match segs[2] {
		'status' {
			return json_ok('{"available":${jbool(a.demo_on)},"password_required":true}')
		}
		'login' {
			if r.method != 'POST' {
				return fail(405, 'method_not_allowed')
			}
			if !a.demo_on {
				return fail_code(503, 'demo_unavailable', 'La demostración no está habilitada en este servidor.')
			}
			if a.over_limit(r, 'demo', 6, 900) {
				return fail_code(429, 'rate_limited', 'Demasiados intentos. Espera unos minutos.')
			}
			pw := body_map(r)['password'] or { '' }
			if !hmac.equal(pw.bytes(), a.demo_password().bytes()) {
				a.hit(r, 'demo', 900)
				time.sleep(300 * time.millisecond)
				return fail_code(401, 'invalid_password', 'Contraseña incorrecta.')
			}
			a.ensure_demo() or {
				return fail_code(503, 'demo_unavailable', 'No se pudo preparar la base de demostración: ${err.msg()}')
			}
			ttl := 12 * 3600
			tok := jwt_mint(a.secret + ':demogate', 1, 'demo', ttl)
			pass := env_or('EP_SEED_PASSWORD', 'Demo12345!')
			accounts := [['admin@easypoint.mx', 'Administrador'], ['punto@easypoint.mx', 'Punto (papelería)'],
				['chofer@easypoint.mx', 'Chofer'], ['proveedor@easypoint.mx', 'Proveedor de excursiones'],
				['ventas@easypoint.mx', 'Ventas'], ['soporte@easypoint.mx', 'Soporte']]
			mut acc := []string{}
			for x in accounts {
				acc << '{"email":${jstr(x[0])},"label":${jstr(x[1])}}'
			}
			return json_ok('{"token":${jstr(tok)},"expires_in":${ttl},"password":${jstr(pass)},"accounts":[${acc.join(',')}]}')
		}
		'as' {
			// entrar con una cuenta ficticia sin teclear su contraseña (sólo con el token de la demo)
			if r.method != 'POST' {
				return fail(405, 'method_not_allowed')
			}
			tok := (r.headers['x-ep-demo'] or { '' }).trim_space()
			if !a.demo_on || jwt_verify(a.secret + ':demogate', tok) != 1 {
				return fail_code(401, 'demo_expired', 'Entra primero en /demo.')
			}
			email := (body_map(r)['email'] or { '' }).trim_space().to_lower()
			if email !in demo_emails {
				return fail(404, 'not_found')
			}
			a.set_env(true)
			row := a.db.one('SELECT * FROM users WHERE email=${q(email)} AND active=1 LIMIT 1') or { empty_row() }
			if row.len == 0 {
				return fail_code(404, 'not_seeded', 'La demostración aún no tiene datos. Pulsa Reiniciar.')
			}
			u := row_user(row)
			return json_ok('{"token":${jstr(jwt_mint(a.tsec(), u.id, u.role, 12 * 3600))},"user":${a.user_json(u)}}')
		}
		'reset' {
			if r.method != 'POST' {
				return fail(405, 'method_not_allowed')
			}
			tok := (r.headers['x-ep-demo'] or { '' }).trim_space()
			if !a.demo_on || jwt_verify(a.secret + ':demogate', tok) != 1 {
				return fail_code(401, 'demo_expired', 'Entra primero en /demo.')
			}
			a.reset_demo() or { return fail_code(500, 'reset_failed', err.msg()) }
			return json_ok('{"ok":true}')
		}
		else {
			return fail(404, 'not_found')
		}
	}
}
