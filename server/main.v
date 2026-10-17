module main

import os

// Easypoint v2 · un solo binario:
//   CGI (producción, detrás de shim.php)   : detecta GATEWAY_INTERFACE
//   ep --migrate | --seed | --seed-demo     : esquema y datos
//   ep --tick | --tick-full                 : motor de automatización (cron)
//   ep --serve [puerto]                     : servidor standalone (desarrollo, no incluye en -d cgi)
//   ep --make-admin correo [clave]          : crea un administrador

fn main() {
	if env_or('EP_ENV_FILE', '') != '' {
		load_env_file(env_or('EP_ENV_FILE', ''))
	}
	args := os.args[1..]
	if os.getenv('GATEWAY_INTERFACE') != '' {
		run_cgi()
		return
	}
	mut app := new_app() or {
		eprintln('config: ${err}')
		exit(2)
	}
	if args.len == 0 {
		println('uso: ep --migrate | --seed | --seed-demo | --tick | --tick-full | --serve [puerto] | --make-admin correo [clave]')
		return
	}
	match args[0] {
		'--migrate' {
			n := app.db.migrate() or {
				eprintln('migrate: ${err}')
				exit(1)
			}
			println('migraciones aplicadas: ${n}')
		}
		'--seed' {
			n := app.db.migrate() or {
				eprintln('migrate: ${err}')
				exit(1)
			}
			c := app.seed_config()
			app.seed_services()
			app.seed_rules()
			println('migraciones: ${n} · parámetros nuevos: ${c}')
		}
		'--seed-demo' {
			app.db.migrate() or {
				eprintln('migrate: ${err}')
				exit(1)
			}
			c := app.seed_config()
			app.seed_demo()
			println('parámetros: ${c} · demo sembrado')
		}
		'--tick', '--tick-full' {
			st := app.tick(args[0] == '--tick-full')
			println(st.to_json())
		}
		'--make-admin' {
			if args.len < 2 {
				eprintln('uso: --make-admin correo [clave]')
				exit(2)
			}
			pass := if args.len > 2 { args[2] } else { rand_code(12) }
			id := app.db.insert('users', {
				'email':         args[1].to_lower()
				'password_hash': hash_password(pass)
				'name':          'Administrador'
				'role':          'admin'
				'active':        '1'
			}) or {
				eprintln('error: ${err}')
				exit(1)
			}
			println('admin #${id} ${args[1]} · clave: ${pass}')
		}
		'--serve' {
			serve_standalone(mut app, if args.len > 1 { args[1].int() } else { 8080 })
		}
		else {
			eprintln('argumento desconocido: ${args[0]}')
			exit(2)
		}
	}
}

fn handle_safe(mut app App, r &Req) Resp {
	// una falla en un handler nunca tumba el proceso: responde 500 y sigue
	return recover_value[Resp](fn [mut app, r] () Resp {
		return app.route(r)
	}) or { fail_code(500, 'internal_error', 'Algo salió mal de nuestro lado. Intenta de nuevo.') }
}

fn run_cgi() {
	mut app := new_app() or {
		fail(500, 'config').send_cgi()
		return
	}
	req := parse_cgi_request(app.base)
	if req.method == 'OPTIONS' {
		Resp{
			status: 204
		}.send_cgi()
		return
	}
	handle_safe(mut app, &req).send_cgi()
}
