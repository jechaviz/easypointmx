module main

// Tabla de rutas. Públicas sin sesión; el resto exige JWT y rol.

fn (mut a App) route(r &Req) Resp {
	segs := r.path.trim('/').split('/')
	if segs.len < 2 || segs[0] != 'api' {
		return fail(404, 'not_found')
	}
	m := r.method
	// entorno: la demostración (X-EP-Demo válido) usa su propia base; todo lo demás, la real
	if segs[1] != 'demo' {
		if bad := a.select_env(r) {
			return bad
		}
	}
	match segs[1] {
		'demo' {
			return a.route_demo(r, segs)
		}
		'setup' {
			return a.route_setup(r, segs)
		}
		'health' {
			return json_ok('{"ok":true,"service":"easypoint","version":"2.0.0","time":${jstr(now_dt())}}')
		}
		'public' {
			return a.route_public(r, segs)
		}
		'auth' {
			return a.route_auth(r, segs)
		}
		'webhooks' {
			if segs.len == 3 && segs[2] == 'mercadopago' && m == 'POST' {
				return a.webhook_mercadopago(r)
			}
			return fail(404, 'not_found')
		}
		'v1' {
			return a.route_partner(r, segs)
		}
		else {}
	}
	// ── todo lo demás requiere sesión ──
	u := a.auth(r) or { return fail_code(401, 'unauthorized', 'Inicia sesión para continuar.') }
	match segs[1] {
		'r' {
			if segs.len < 3 {
				return fail(404, 'not_found')
			}
			return a.crud_dispatch(u, r, segs)
		}
		'tasks' {
			if m == 'GET' && segs.len == 2 {
				return a.tasks_list(u, r)
			}
			if (m == 'PATCH' || m == 'PUT' || m == 'POST') && segs.len == 3 {
				return a.task_update(u, segs[2].i64(), r)
			}
			return fail(404, 'not_found')
		}
		'ops' {
			return a.route_ops(u, r, segs)
		}
		'driver' {
			if u.role !in ['driver', 'admin'] {
				return fail(403, 'forbidden')
			}
			if segs.len == 3 {
				match segs[2] {
					'route' { return a.driver_route(u, r) }
					'collect' { if m == 'POST' { return a.driver_collect(u, r) } }
					'corte' { if m == 'POST' { return a.driver_corte(u) } }
					else {}
				}
			}
			return fail(404, 'not_found')
		}
		'provider' {
			if u.role !in ['provider', 'admin'] {
				return fail(403, 'forbidden')
			}
			if segs.len == 3 {
				match segs[2] {
					'dashboard' { return a.provider_dashboard(u, r) }
					'manifest' { return a.provider_manifest(u, r) }
					'checkin' { if m == 'POST' { return a.provider_checkin(u, r) } }
					'complete' { if m == 'POST' { return a.provider_complete(u, r) } }
					'dates' { if m == 'POST' { return a.provider_dates(u, r) } }
					'cancel-departure' { if m == 'POST' { return a.admin_cancel_departure(u, r) } }
					else {}
				}
			}
			return fail(404, 'not_found')
		}
		'admin' {
			return a.route_admin(u, r, segs)
		}
		else {
			return fail(404, 'not_found')
		}
	}
}

fn (mut a App) route_public(r &Req, segs []string) Resp {
	m := r.method
	if segs.len < 3 {
		return fail(404, 'not_found')
	}
	match segs[2] {
		'config' { return a.public_config() }
		'points' { return a.public_points() }
		'services' { return a.public_services() }
		'excursions' {
			if segs.len == 3 {
				return a.public_excursions()
			}
			if segs.len == 5 && segs[4] == 'availability' {
				return a.public_availability(segs[3].i64())
			}
		}
		'quote' { return a.public_quote(r) }
		'reviews' { return a.public_reviews() }
		'referral' { return a.referral_check(r) }
		'track' {
			if segs.len == 4 {
				return a.public_track(segs[3])
			}
			if segs.len == 3 && m == 'POST' {
				return a.track_alert(r)
			}
		}
		'bookings' {
			if m == 'POST' && segs.len == 3 {
				return a.create_booking(r)
			}
		}
		'voucher' {
			if segs.len == 3 && m == 'GET' {
				return a.voucher_lookup(r)
			}
			if segs.len == 4 && m == 'POST' {
				match segs[3] {
					'pay' { return a.voucher_pay(r) }
					'reschedule' { return a.voucher_reschedule(r) }
					'cancel' { return a.voucher_cancel(r) }
					'review' { return a.voucher_review(r) }
					else {}
				}
			}
		}
		'guides' {
			if segs.len == 4 && segs[3] == 'quote' {
				return a.guide_quote(r)
			}
		}
		'applications' {
			if m == 'POST' {
				return a.create_application(r)
			}
		}
		'tickets' {
			if m == 'POST' {
				return a.create_ticket(r)
			}
		}
		'leads' {
			if m == 'POST' {
				return a.create_lead(r)
			}
		}
		'club' {
			if m == 'POST' {
				return a.club_join(r)
			}
		}
		else {}
	}
	return fail(404, 'not_found')
}

fn (mut a App) route_auth(r &Req, segs []string) Resp {
	m := r.method
	if segs.len < 3 {
		return fail(404, 'not_found')
	}
	match segs[2] {
		'login' {
			if m == 'POST' {
				return a.login(r)
			}
		}
		'me' {
			u := a.auth(r) or { return fail(401, 'unauthorized') }
			return json_ok('{"user":${a.user_json(u)}}')
		}
		'refresh' {
			u := a.auth(r) or { return fail(401, 'unauthorized') }
			return json_ok('{"token":${jstr(jwt_mint(a.tsec(), u.id, u.role, 14 * 86400))},"user":${a.user_json(u)}}')
		}
		'password' {
			u := a.auth(r) or { return fail(401, 'unauthorized') }
			if m == 'POST' {
				return a.change_password(u, r)
			}
		}
		'reset-request' {
			if m == 'POST' {
				return a.reset_request(r)
			}
		}
		'reset' {
			if m == 'POST' {
				return a.reset_confirm(r)
			}
		}
		else {}
	}
	return fail(404, 'not_found')
}

fn (mut a App) route_ops(u User, r &Req, segs []string) Resp {
	m := r.method
	if segs.len < 3 {
		return fail(404, 'not_found')
	}
	op_roles := ['operator', 'admin']
	match segs[2] {
		'home' {
			return a.ops_home(u)
		}
		'economics' {
			if u.role != 'admin' {
				return fail(403, 'forbidden')
			}
			return a.economics((r.query['days'] or { '30' }).int())
		}
		'series' {
			if u.role != 'admin' {
				return fail(403, 'forbidden')
			}
			return a.ops_series((r.query['days'] or { '14' }).int())
		}
		'finance' {
			if u.role != 'admin' {
				return fail(403, 'forbidden')
			}
			return a.finance_summary()
		}
		'booking' {
			if u.role in ['operator', 'admin', 'support'] {
				return a.ops_booking_lookup(u, r)
			}
		}
		'cash-payment' {
			if m == 'POST' && u.role in op_roles {
				return a.ops_cash_payment(u, r)
			}
		}
		'service-order' {
			if m == 'POST' && u.role in op_roles {
				return a.ops_service_order(u, r)
			}
		}
		'guide' {
			if u.role in op_roles && m == 'POST' {
				if segs.len == 3 {
					return a.ops_guide_sale(u, r)
				}
				if segs.len == 5 && segs[4] == 'generate' {
					return a.ops_guide_generate(u, segs[3].i64(), r)
				}
			}
		}
		'shipment' {
			if u.role in op_roles && m == 'POST' {
				if segs.len == 3 {
					return a.ops_shipment(u, r)
				}
				if segs.len == 5 && segs[4] == 'status' {
					return a.ops_shipment_status(u, segs[3].i64(), r)
				}
			}
		}
		'wallet' {
			if u.role in ['operator', 'admin', 'support'] {
				if segs.len == 3 && m == 'GET' {
					b := a.booking_by_code(r.query['code'] or { '' })
					phone := if b.len > 0 { b['customer_phone'] } else { r.query['phone'] or { '' } }
					if phone == '' {
						return fail(404, 'not_found')
					}
					return json_ok('{"phone":${jstr(phone)},"balance":${a.wallet_balance(phone):.2f}}')
				}
				if segs.len == 4 && segs[3] == 'apply' && m == 'POST' {
					return a.ops_wallet_apply(u, r)
				}
			}
		}
		else {}
	}
	return fail(404, 'not_found')
}

fn (mut a App) route_admin(u User, r &Req, segs []string) Resp {
	m := r.method
	// soporte puede resolver tickets; todo lo demás es del administrador
	if segs.len == 5 && segs[2] == 'tickets' && u.role in ['admin', 'support'] {
		id := segs[3].i64()
		if segs[4] == 'resolve' && m == 'POST' {
			return a.ticket_resolve(u, id, r)
		}
		if segs[4] == 'respond' && m == 'POST' {
			return a.ticket_first_response(u, id)
		}
	}
	if segs.len == 5 && segs[2] == 'applications' && u.role in ['admin', 'sales'] {
		id := segs[3].i64()
		if segs[4] == 'approve' && m == 'POST' {
			return a.application_approve(u, id)
		}
		if segs[4] == 'reject' && m == 'POST' {
			return a.application_reject(u, id, r)
		}
	}
	if u.role != 'admin' {
		return fail_code(403, 'forbidden', 'Sólo el administrador puede hacer esto.')
	}
	if segs.len < 3 {
		return fail(404, 'not_found')
	}
	match segs[2] {
		'users' {
			if m == 'POST' && segs.len == 3 {
				return a.admin_user_create(u, r)
			}
		}
		'settlements' {
			if segs.len == 4 && segs[3] == 'run' && m == 'POST' {
				return a.settlements_run(u, r)
			}
			if segs.len == 5 && segs[4] == 'pay' && m == 'POST' {
				return a.settlement_pay(u, segs[3].i64())
			}
		}
		'payments' {
			if segs.len == 5 && segs[4] == 'confirm' && m == 'POST' {
				return a.confirm_payment(u, segs[3].i64())
			}
		}
		'departures' {
			if segs.len == 4 && segs[3] == 'cancel' && m == 'POST' {
				return a.admin_cancel_departure(u, r)
			}
		}
		'config' {
			if m == 'GET' {
				return a.admin_config_list()
			}
			if m == 'POST' {
				return a.admin_config_set(u, r)
			}
		}
		'partners' {
			if m == 'POST' && segs.len == 3 {
				return a.partner_create(u, r)
			}
		}
		'outbox' {
			if segs.len == 5 && segs[4] == 'sent' && m == 'POST' {
				return a.outbox_mark_sent(u, segs[3].i64())
			}
		}
		'tick' {
			if m == 'POST' {
				mut st := a.tick(true)
				return json_ok(st.to_json())
			}
		}
		else {}
	}
	return fail(404, 'not_found')
}

fn (mut a App) route_partner(r &Req, segs []string) Resp {
	p := a.partner_auth(r) or { return fail_code(401, 'invalid_api_key', 'X-API-Key no válida.') }
	if segs.len < 3 {
		return fail(404, 'not_found')
	}
	match segs[2] {
		'points' {
			return a.public_points()
		}
		'shipments' {
			if r.method == 'POST' {
				return a.partner_shipment(p, r)
			}
		}
		'track' {
			if segs.len == 4 {
				return a.public_track(segs[3])
			}
		}
		else {}
	}
	return fail(404, 'not_found')
}
