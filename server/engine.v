module main

// Motor de automatización. tick() es idempotente (todo lleva dedupe_key): puede correr cada minuto
// por cron (`ep --tick`), a mano desde el panel, o varias veces, sin duplicar nada.

pub struct Stats {
pub mut:
	counts map[string]int
	errors []string
}

fn (mut s Stats) inc(k string) {
	s.counts[k] = (s.counts[k] or { 0 }) + 1
}

fn (mut s Stats) add(k string, n int) {
	s.counts[k] = (s.counts[k] or { 0 }) + n
}

fn exc_from_join(r Row) Row {
	mut e := empty_row()
	e['id'] = r['excursion_id']
	e['name'] = r['x_name']
	e['deposit_amount'] = r['x_deposit']
	e['meeting_point'] = r['x_meeting']
	return e
}

// ── reservas: etapas, recordatorios, vencimiento a crédito, reseñas y premios ─
fn (mut a App) scan_bookings(mut st Stats) {
	deadline_default := a.cfg_i('policy.payment_deadline_days', 3)
	nudge_h := a.cfg_i('policy.nudge_hours_unpaid', 24)
	review_delay := a.cfg_i('growth.review_delay_days', 1)
	club_pct := a.cfg_f('club.cashback_pct', 5)
	grace_h := a.cfg_f('policy.last_minute_grace_hours', 12)
	t := today()
	rows := a.db.rows("SELECT b.*, e.cutoff_days AS x_cutoff, e.deposit_amount AS x_deposit, e.name AS x_name, e.meeting_point AS x_meeting FROM bookings b JOIN excursions e ON e.id=b.excursion_id WHERE b.status<>'cancelled' ORDER BY b.id DESC LIMIT 3000") or {
		[]Row{}
	}
	for b in rows {
		id := b['id'].i64()
		exc := exc_from_join(b)
		date := b['excursion_date']
		total := b['total'].f64()
		paid := b['amount_paid'].f64()
		balance := b['balance'].f64()
		status := b['status']
		cutoff := if b['x_cutoff'].int() > 0 { b['x_cutoff'].int() } else { deadline_default }
		days := if is_date(date) { days_between(t, date) } else { 9999 }
		phone := b['customer_phone']

		// etapa
		next_stage := stage_of(b)
		if next_stage != b['stage'] {
			a.db.exec('UPDATE bookings SET stage=${q(next_stage)} WHERE id=${id}') or {}
			a.event('booking', id, b['stage'], next_stage, 'engine', '')
		}

		if status == 'completed' {
			if b['stats_counted'] != '1' {
				cu := a.find_customer(phone)
				if cu.len > 0 {
					trips := cu['trips'].int() + 1
					spend := cu['lifetime_spend'].f64() + paid
					a.db.exec("UPDATE customers SET trips=${trips}, lifetime_spend=${qf(spend)}, segment=${q(segment_of(trips, spend, 0))}, last_seen=${q(now_dt())} WHERE id=${cu['id'].i64()}") or {}
				}
				a.db.exec('UPDATE bookings SET stats_counted=1 WHERE id=${id}') or {}
			}
			if b['cashback_paid'] != '1' && phone != '' {
				if a.is_club(phone) && club_pct > 0 && paid > 0 {
					cb := round2(paid * club_pct / 100.0)
					a.credit(phone, b['customer_name'], cb, 'club_cashback', b['code'])
					a.event('booking', id, '', 'cashback', 'engine', 'Cashback Club ${club_pct:.0f}%')
					st.add('cashback_mxn', int(cb))
				}
				a.db.exec('UPDATE bookings SET cashback_paid=1 WHERE id=${id}') or {}
			}
			rc := b['referral_code_used']
			if rc != '' && b['referral_rewarded'] != '1' && total >= a.cfg_f('referral.min_booking_total', 800) {
				referrer := a.db.one('SELECT * FROM customers WHERE referral_code=${q(rc)}') or { empty_row() }
				if referrer.len > 0 && phone10(referrer['phone']) != phone10(phone) {
					month := t[..7]
					given := a.db.count('wallet_entries', "reason='referral_reward' AND customer_phone=${q(referrer['phone'])} AND created_at>=${q(month + '-01 00:00:00')}")
					if given < a.cfg_i('referral.monthly_cap', 10) {
						rw1 := a.cfg_f('referral.reward_referrer', 100)
						rw2 := a.cfg_f('referral.reward_referee', 100)
						until := add_months_dt(now_dt(), a.cfg_i('policy.credit_validity_months', 12))[..10]
						a.credit(referrer['phone'], referrer['name'], rw1, 'referral_reward', b['code'])
						a.credit(phone, b['customer_name'], rw2, 'referral_reward', b['code'])
						a.notify(NotifyIn{
							email:    referrer['email']
							phone:    referrer['phone']
							name:     referrer['name']
							template: 'referral_reward'
							vars:     {
								'name':   if referrer['name'] != '' { referrer['name'] } else { 'viajero' }
								'amount': mxn(rw1)
								'reason': '${b['customer_name']} completó su primer viaje con tu código.'
								'until':  until
							}
							dedupe:   'refrw1:${id}'
						})
						a.event('booking', id, '', 'referido_premiado', 'engine', rc)
						st.inc('referral_rewards')
					} else {
						a.flag('low', 'referral_cap', 'customers', referrer['id'].i64(), 'Tope mensual de premios alcanzado para ${rc}', 'refcap:${referrer['id']}:${month}')
					}
				}
				a.db.exec('UPDATE bookings SET referral_rewarded=1 WHERE id=${id}') or {}
			}
			if b['review_requested'] != '1' && days != 9999 && days <= -review_delay {
				open_t := a.db.count('support_tickets', "booking_id=${id} AND status<>'resolved'")
				if open_t == 0 {
					link := a.voucher_url(b['code'], b['token']) + '&review=1'
					if a.notify_booking(b, exc, 'review_request', {
						'link': link
					}, 'review:${id}') > 0 {
						st.inc('review_requests')
					}
					a.db.exec('UPDATE bookings SET review_requested=1 WHERE id=${id}') or {}
				}
			}
			continue
		}
		if days == 9999 {
			continue
		}
		// 1) sin abono tras X horas → empujón
		if paid <= 0 && status == 'new' && days > cutoff && hours_since_dt(b['created_at']) >= nudge_h {
			if a.notify_booking(b, exc, 'nudge_unpaid', map[string]string{}, 'nudge:${id}') > 0 {
				st.inc('nudges')
			}
		}
		// 2) último aviso
		if balance > 0 && days > cutoff && days <= cutoff + 4 {
			if a.notify_booking(b, exc, 'final_reminder', {
				'days':     days.str()
				'deadline': add_days(date, -cutoff)
			}, 'final:${id}') > 0 {
				st.inc('final_reminders')
			}
		}
		// 2b) calendario de abonos elegido por el cliente
		if b['reminder_optin'] == '1' && balance > 0 {
			sent := b['reminders_sent'].split(',')
			mut fresh := []string{}
			for d in b['reminder_dates'].split(',') {
				dd := d.trim_space()
				if is_date(dd) && dd <= t && dd !in sent {
					fresh << dd
				}
			}
			if fresh.len > 0 {
				if a.notify_booking(b, exc, 'final_reminder', {
					'days':     days.str()
					'deadline': add_days(date, -cutoff)
				}, 'plan:${id}:${fresh[0]}') > 0 {
					st.inc('plan_reminders')
				}
				mut all := sent.filter(it != '')
				all << fresh
				a.db.exec('UPDATE bookings SET reminders_sent=${q(all.join(','))} WHERE id=${id}') or {}
			}
		}
		// 3) vencimiento: lo abonado NO se devuelve en efectivo → crédito; sin abono libera el cupo
		if balance > 0 && days <= cutoff && total > 0 && (days <= 0 || hours_since_dt(b['created_at']) >= grace_h) {
			until := add_months_dt(now_dt(), a.cfg_i('policy.credit_validity_months', 12))[..10]
			if paid > 0 && phone != '' {
				a.credit(phone, b['customer_name'], paid, 'credit_from_booking', b['code'])
				a.notify_booking(b, exc, 'expired_to_credit', {
					'amount': mxn(paid)
					'until':  until
				}, 'expire:${id}')
			}
			a.db.exec("UPDATE bookings SET status='cancelled', payment_status=IF(${qf(paid)}>0,'credit',payment_status), closed_reason='expired_unpaid', updated_at=${q(now_dt())} WHERE id=${id}") or {}
			a.restage(id, 'engine')
			a.event('booking', id, 'activa', 'vencida', 'engine', if paid > 0 { 'Abono convertido a crédito' } else { 'Cupo liberado' })
			st.inc('expired')
			continue
		}
		// 4) víspera con todo pagado
		if days == 1 && balance <= 0 {
			a.notify_booking(b, exc, 'voucher_ready', map[string]string{}, 'v1:${id}')
		}
	}
}

// ── salidas: riesgo de cupo mínimo, demanda, manifiestos, cierre ────────────
fn (mut a App) scan_departures(mut st Stats) {
	t := today()
	rows := a.db.rows("SELECT d.excursion_id, d.date, e.name, e.provider_id, e.min_people, e.cutoff_days, COALESCE(NULLIF(d.capacity,0), e.max_capacity) AS n_cap, COALESCE(SUM(CASE WHEN b.status<>'cancelled' THEN b.people ELSE 0 END),0) AS n_seats, SUM(CASE WHEN b.status<>'cancelled' THEN 1 ELSE 0 END) AS n_bookings, SUM(CASE WHEN b.status='completed' THEN 1 ELSE 0 END) AS n_done FROM departures d JOIN excursions e ON e.id=d.excursion_id LEFT JOIN bookings b ON b.excursion_id=d.excursion_id AND b.excursion_date=d.date WHERE d.status='open' AND d.date>=DATE_SUB(UTC_DATE(), INTERVAL 10 DAY) AND d.date<=DATE_ADD(UTC_DATE(), INTERVAL 30 DAY) GROUP BY d.id") or {
		[]Row{}
	}
	for g in rows {
		exc_id := g['excursion_id'].i64()
		date := g['date']
		days := days_between(t, date)
		seats := g['n_seats'].int()
		bookings := g['n_bookings'].int()
		done := g['n_done'].int()
		cap := g['n_cap'].int()
		min_p := g['min_people'].int()
		fill := if cap > 0 { seats * 100 / cap } else { 0 }
		pid := g['provider_id'].i64()
		label := '${g['name']} · ${date}'
		dkey := 'dep:${exc_id}:${date}'
		if bookings == 0 && days >= 0 {
			continue
		}
		if days >= 0 && min_p > 0 && seats < min_p && days <= (if g['cutoff_days'].int() > 3 { g['cutoff_days'].int() } else { 3 }) {
			a.task(TaskIn{
				kind:      'departure_at_risk'
				role:      'admin'
				priority:  if days <= 1 { 'urgent' } else { 'high' }
				title:     'Salida en riesgo: ${label}'
				detail:    '${seats} de ${min_p} lugares mínimos. Decide: promo flash, mover fecha o cancelar con crédito.'
				entity:    'excursion'
				entity_id: exc_id
				dedupe:    '${dkey}:risk'
				action:    'departure_risk'
				payload:   '${exc_id}|${date}'
			})
			if pid > 0 {
				a.task(TaskIn{
					kind:      'departure_at_risk'
					role:      'provider'
					scope_id:  pid
					priority:  'high'
					title:     'Faltan ${min_p - seats} lugares para confirmar ${label}'
					detail:    'Comparte tu salida o acepta una promo flash de Easypoint.'
					entity:    'excursion'
					entity_id: exc_id
					dedupe:    '${dkey}:riskp'
				})
			}
			if days <= 1 && a.cfg_b('ops.auto_cancel_under_min', false) {
				a.cancel_departure(exc_id, date, 'cupo_minimo', 'engine')
				st.inc('auto_cancelled')
				continue
			}
		}
		if days > 7 && cap > 0 && fill >= 85 && pid > 0 {
			a.task(TaskIn{
				kind:      'high_demand'
				role:      'provider'
				scope_id:  pid
				title:     'Alta demanda: ${label} (${fill}% lleno)'
				detail:    'Abre más cupo o una segunda salida; el precio dinámico ya ajusta la tarifa.'
				entity:    'excursion'
				entity_id: exc_id
				dedupe:    '${dkey}:demand'
			})
		}
		if days > 3 && days <= 14 && cap > 0 && fill < 30 {
			a.task(TaskIn{
				kind:      'weak_departure'
				role:      'admin'
				title:     'Salida floja: ${label} (${fill}%)'
				detail:    'Lanza una promo flash o campaña de WhatsApp a clientes afines.'
				entity:    'excursion'
				entity_id: exc_id
				dedupe:    '${dkey}:weak'
				action:    'flash_promo'
			})
		}
		if (days == 0 || days == 1) && pid > 0 && seats > 0 {
			a.task(TaskIn{
				kind:      'manifest'
				role:      'provider'
				scope_id:  pid
				priority:  if days == 0 { 'high' } else { 'normal' }
				title:     '${if days == 0 { 'Sales hoy: ' } else { 'Sales mañana: ' }}${label}'
				detail:    '${seats} pasajeros · revisa el manifiesto y los saldos por cobrar.'
				entity:    'excursion'
				entity_id: exc_id
				dedupe:    '${dkey}:manifest'
				action:    'open_manifest'
				payload:   '${exc_id}|${date}'
			})
		}
		if days <= -1 && done < bookings && pid > 0 {
			a.task(TaskIn{
				kind:      'close_departure'
				role:      'provider'
				scope_id:  pid
				priority:  'high'
				title:     'Confirma que salió: ${label}'
				detail:    'Marca la salida como completada para liberar tu liquidación.'
				entity:    'excursion'
				entity_id: exc_id
				dedupe:    '${dkey}:close'
				action:    'complete_departure'
				payload:   '${exc_id}|${date}'
			})
		}
		if days <= -4 && done < bookings {
			a.task(TaskIn{
				kind:      'close_departure'
				role:      'admin'
				priority:  'high'
				title:     'Salida sin cerrar: ${label}'
				detail:    'El proveedor no confirmó. Verifica con asistencia (check-ins) y cierra manualmente.'
				entity:    'excursion'
				entity_id: exc_id
				dedupe:    '${dkey}:closeadmin'
			})
		}
	}
}

// ── efectivo: puntos, choferes, antifraude ──────────────────────────────────
fn (mut a App) scan_cash(mut st Stats) {
	pt_limit := a.cfg_f('cash.point_limit', 3000)
	max_days := a.cfg_i('cash.point_max_days', 7)
	dr_limit := a.cfg_f('cash.driver_limit', 5000)
	big := a.cfg_f('cash.large_payment_flag', 8000)
	t := today()
	held := a.db.rows("SELECT point_id, point_name, COUNT(*) AS n_count, SUM(net) AS n_net, MAX(id) AS n_last, MIN(created_at) AS oldest FROM payments WHERE status='held_at_point' AND point_id>0 AND method<>'credit' GROUP BY point_id, point_name") or {
		[]Row{}
	}
	for g in held {
		age := int(hours_since_dt(g['oldest']) / 24.0)
		sum := g['n_net'].f64()
		pid := g['point_id'].i64()
		if sum >= pt_limit || age >= max_days {
			if a.task(TaskIn{
				kind:      'collect_cash'
				role:      'driver'
				priority:  if sum >= pt_limit && age >= max_days { 'urgent' } else { 'high' }
				title:     'Recolectar ${mxn(sum)} en ${g['point_name']}'
				detail:    '${g['n_count']} abonos retenidos · el más viejo tiene ${age} día(s).'
				entity:    'point'
				entity_id: pid
				dedupe:    'collect:${pid}:${g['n_last']}'
				action:    'collect_cash'
				payload:   pid.str()
			})
			{
				st.inc('collect_tasks')
			}
		}
		if age >= max_days * 2 {
			a.flag('high', 'stale_cash', 'point', pid, '${g['point_name']} retiene efectivo hace ${age} días', 'stale:${pid}:${t[..7]}')
		}
	}
	bigs := a.db.rows("SELECT id, amount, point_name FROM payments WHERE status='held_at_point' AND method='cash' AND amount>=${qf(big)}") or {
		[]Row{}
	}
	for p in bigs {
		a.flag('medium', 'large_cash', 'payment', p['id'].i64(), 'Abono en efectivo de ${mxn(p['amount'].f64())} en ${p['point_name']}', 'bigcash:${p['id']}')
	}
	drv := a.db.rows("SELECT collected_by, collected_by_name, SUM(collected_amount) AS n_sum, MAX(id) AS n_last, MIN(collected_at) AS oldest FROM payments WHERE status='collected' GROUP BY collected_by, collected_by_name") or {
		[]Row{}
	}
	for g in drv {
		sum := g['n_sum'].f64()
		days_on := int(hours_since_dt(g['oldest']) / 24.0)
		did := g['collected_by'].i64()
		if sum >= dr_limit || days_on >= 2 {
			a.task(TaskIn{
				kind:     'deliver_cash'
				role:     'driver'
				scope_id: did
				priority: if sum >= dr_limit { 'urgent' } else { 'high' }
				title:    'Entrega ${mxn(sum)} al administrador'
				detail:   'Tienes efectivo recolectado${if days_on > 0 { ' desde hace ${days_on} día(s)' } else { '' }}. Cierra tu corte.'
				dedupe:   'deliver:${did}:${g['n_last']}'
				action:   'close_corte'
			})
			a.flag(if sum >= dr_limit * 1.5 { 'high' } else { 'medium' }, 'driver_cash_exposure', 'user', did, '${g['collected_by_name']} trae ${mxn(sum)} sin entregar', 'drvcash:${did}:${t}')
		}
	}
}

// ── soporte: SLA y escalamiento ─────────────────────────────────────────────
fn (mut a App) scan_support(mut st Stats) {
	now := now_dt()
	rows := a.db.rows("SELECT * FROM support_tickets WHERE status IN ('open','in_progress','escalated') ORDER BY id DESC LIMIT 300") or {
		[]Row{}
	}
	for tk in rows {
		id := tk['id'].i64()
		if tk['first_response_at'] == '' && tk['status'] == 'open' && tk['sla_due'] != '' && now > tk['sla_due'] {
			a.db.exec("UPDATE support_tickets SET status='escalated', updated_at=${q(now)} WHERE id=${id}") or {}
			a.event('ticket', id, 'open', 'escalated', 'engine', 'SLA de primera respuesta vencido')
			a.flag('high', 'sla_breach', 'ticket', id, 'Ticket ${tk['code']} sin respuesta fuera de SLA', 'sla:${id}')
			st.inc('escalated')
		}
	}
	for r in a.db.rows("SELECT id FROM support_tickets WHERE status='resolved' AND updated_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)") or {
		[]Row{}
	} {
		a.close_tasks('ticket:${r['id']}')
	}
}

// ── red: puntos inactivos, solicitudes vencidas, guías ──────────────────────
fn (mut a App) scan_network(mut st Stats) {
	inactive_days := a.cfg_i('ops.point_inactive_days', 14)
	t := today()
	pts := a.db.rows("SELECT p.id, p.name, p.whatsapp, p.created_at, GREATEST(COALESCE(p.last_activity_at,'2000-01-01 00:00:00'), COALESCE((SELECT MAX(created_at) FROM payments WHERE point_id=p.id),'2000-01-01 00:00:00'), COALESCE((SELECT MAX(created_at) FROM service_orders WHERE point_id=p.id),'2000-01-01 00:00:00'), COALESCE((SELECT MAX(created_at) FROM shipments WHERE point_id=p.id),'2000-01-01 00:00:00')) AS last_act FROM points p WHERE p.active=1") or {
		[]Row{}
	}
	for p in pts {
		idle := hours_since_dt(p['last_act']) / 24.0
		age := hours_since_dt(p['created_at']) / 24.0
		if idle > f64(inactive_days) && age > f64(inactive_days) {
			a.task(TaskIn{
				kind:      'inactive_point'
				role:      'sales'
				title:     'Reactivar ${p['name']}'
				detail:    'Sin actividad en ${inactive_days}+ días. Llama, ofrece un servicio nuevo o evalúa pausar.'
				entity:    'point'
				entity_id: p['id'].i64()
				dedupe:    'inactive:${p['id']}:${t[..7]}'
				action:    'whatsapp'
				payload:   wa_link(p['whatsapp'], 'Hola, ¿cómo va todo en tu punto Easypoint? Queremos ayudarte a vender más.')
			})
		}
	}
	ttl := a.cfg_i('ops.guide_quote_ttl_h', 48)
	for g in a.db.rows("SELECT id, created_at FROM shipping_guides WHERE status='quoted'") or { []Row{} } {
		if hours_since_dt(g['created_at']) >= f64(ttl) {
			a.db.exec("UPDATE shipping_guides SET status='cancelled' WHERE id=${g['id'].i64()}") or {}
			a.event('guide', g['id'].i64(), 'quoted', 'cancelled', 'engine', 'Cotización vencida')
			st.inc('guides_expired')
		}
	}
	for g in a.db.rows("SELECT * FROM shipping_guides WHERE status='paid'") or { []Row{} } {
		if hours_since_dt(g['created_at']) >= 4 {
			a.task(TaskIn{
				kind:      'generate_guide'
				role:      'operator'
				scope_id:  g['point_id'].i64()
				priority:  'high'
				title:     'Generar guía ${g['carrier'].to_upper()} pagada'
				detail:    '${g['sender_name']} → ${g['recipient_name']}'
				entity:    'guide'
				entity_id: g['id'].i64()
				dedupe:    'guide:${g['id']}'
				action:    'generate_guide'
			})
		}
	}
	// solicitudes: vencidas suben a urgentes
	now := now_dt()
	for ap in a.db.rows("SELECT id, business_name, sla_due FROM partner_applications WHERE status='pending' AND sla_due < ${q(now)}") or {
		[]Row{}
	} {
		a.task(TaskIn{
			kind:      'application_overdue'
			role:      'admin'
			priority:  'urgent'
			title:     'Solicitud sin contactar (SLA vencido): ${ap['business_name']}'
			entity:    'application'
			entity_id: ap['id'].i64()
			dedupe:    'app-late:${ap['id']}'
		})
	}
}

// ── monedero: vencimientos (breakage) y avisos ──────────────────────────────
fn (mut a App) scan_wallets(mut st Stats) {
	now := now_dt()
	in30 := add_days(today(), 30) + ' 23:59:59'
	for w in a.db.rows('SELECT customer_phone, customer_name FROM wallets WHERE balance>0') or { []Row{} } {
		phone := w['customer_phone']
		for p in a.fifo_remaining(phone) {
			if p.expires == '' || p.remaining <= 0 || p.settled {
				continue
			}
			if p.expires <= now {
				used := a.debit(phone, p.remaining, 'expired', p.id.str())
				a.db.exec('UPDATE wallet_entries SET settled=1 WHERE id=${p.id}') or {}
				if used > 0 {
					a.notify(NotifyIn{
						phone:    phone
						name:     w['customer_name']
						template: 'credit_expired'
						vars:     {
							'name':   if w['customer_name'] != '' { w['customer_name'] } else { 'viajero' }
							'amount': mxn(used)
							'link':   '${a.app_url()}/website/'
						}
						dedupe:   'expd:${p.id}'
					})
					a.event('wallet', 0, '', 'credito_vencido', 'engine', '${phone} ${mxn(used)}')
					st.add('breakage_mxn', int(used))
				}
			} else if p.expires <= in30 {
				a.notify(NotifyIn{
					phone:    phone
					name:     w['customer_name']
					template: 'credit_expiring'
					vars:     {
						'name':   if w['customer_name'] != '' { w['customer_name'] } else { 'viajero' }
						'amount': mxn(p.remaining)
						'until':  p.expires[..10]
						'link':   '${a.app_url()}/website/#/excursiones'
					}
					dedupe:   'exp30:${p.id}'
				})
			}
		}
	}
}

// ── clientes: recuperación (winback), costo sólo si lo usan ─────────────────
fn (mut a App) scan_customers(mut st Stats) {
	days := a.cfg_i('growth.winback_days', 120)
	limit := add_days(today(), -days) + ' 00:00:00'
	year := today()[..4]
	for c in a.db.rows('SELECT * FROM customers WHERE trips>=1 AND marketing_opt_in=1 AND last_seen<${q(limit)} LIMIT 200') or {
		[]Row{}
	} {
		dk := 'winback:${c['id']}:${year}'
		if a.key_exists('outbox', dk + ':w') || a.key_exists('outbox', dk + ':e') {
			continue
		}
		code := 'VUELVE-${c['referral_code']}'
		if a.db.count('pricing_rules', 'code=${q(code)}') == 0 {
			a.db.insert('pricing_rules', {
				'label':    'Recuperación ${c['name']}'
				'kind':     'promo_code'
				'amount':   '100'
				'code':     code
				'active':   '1'
				'max_uses': '1'
			}) or {}
		}
		a.notify(NotifyIn{
			email:    c['email']
			phone:    c['phone']
			name:     c['name']
			template: 'winback'
			vars:     {
				'name': if c['name'] != '' { c['name'] } else { 'viajero' }
				'gift': mxn(100)
				'code': code
				'link': '${a.app_url()}/website/#/excursiones'
			}
			dedupe:   dk
		})
		a.db.exec("UPDATE customers SET segment='dormido' WHERE id=${c['id'].i64()}") or {}
		st.inc('winback')
	}
}

// ── liquidaciones pendientes ────────────────────────────────────────────────
fn (mut a App) scan_settlements(mut st Stats) {
	wait := a.cfg_i('settlement.payout_days', 2)
	for s in a.db.rows("SELECT * FROM settlements WHERE status='pending' AND kind='provider'") or { []Row{} } {
		age := hours_since_dt(s['created_at']) / 24.0
		a.task(TaskIn{
			kind:      'pay_settlement'
			role:      'admin'
			priority:  if age >= f64(wait) { 'high' } else { 'normal' }
			title:     'Pagar liquidación ${s['folio']} · ${mxn(s['net'].f64())}'
			detail:    '${s['ref_name']} — ${s['notes']}'
			entity:    'settlement'
			entity_id: s['id'].i64()
			dedupe:    'pay:${s['id']}'
			action:    'pay_settlement'
		})
	}
	for s in a.db.rows("SELECT id FROM settlements WHERE status='paid' AND paid_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)") or {
		[]Row{}
	} {
		a.close_tasks('pay:${s['id']}')
	}
}

// ── antifraude: velocidad de reservas ───────────────────────────────────────
fn (mut a App) scan_risk(mut st Stats) {
	for v in a.db.rows("SELECT customer_phone, COUNT(*) AS n_c FROM bookings WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR) GROUP BY customer_phone HAVING COUNT(*) >= 4") or {
		[]Row{}
	} {
		a.flag('medium', 'booking_velocity', 'customers', 0, '${v['customer_phone']} creó ${v['n_c']} reservas en 1 hora', 'vel:${v['customer_phone']}:${today()}')
	}
	for d in a.db.rows("SELECT customer_phone, COUNT(DISTINCT customer_name) AS n_c FROM bookings WHERE created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) AND customer_phone<>'' GROUP BY customer_phone HAVING COUNT(DISTINCT customer_name) >= 3") or {
		[]Row{}
	} {
		a.flag('low', 'phone_many_names', 'customers', 0, '${d['customer_phone']} aparece con ${d['n_c']} nombres distintos', 'names:${d['customer_phone']}:${today()}')
	}
}

// ── cola de salida + jobs ───────────────────────────────────────────────────
fn (mut a App) run_outbox(mut st Stats) {
	for r in a.db.rows("SELECT * FROM outbox WHERE status='queued' ORDER BY id LIMIT 60") or { []Row{} } {
		s := a.deliver(r)
		st.inc('outbox_' + s)
	}
}

fn (mut a App) run_jobs(mut st Stats) {
	for j in a.db.rows("SELECT * FROM jobs WHERE status='pending' AND run_at<=${q(now_dt())} ORDER BY run_at LIMIT 30") or {
		[]Row{}
	} {
		id := j['id'].i64()
		a.db.exec("UPDATE jobs SET status='running' WHERE id=${id}") or {}
		parts := j['payload'].split('|')
		match j['kind'] {
			'cancel_departure' {
				if parts.len >= 2 {
					a.cancel_departure(parts[0].i64(), parts[1], if parts.len > 2 { parts[2] } else { 'proveedor' }, 'job')
				}
			}
			else {}
		}
		a.db.exec("UPDATE jobs SET status='done' WHERE id=${id}") or {}
		st.inc('jobs')
	}
}

pub fn (mut a App) tick(full bool) Stats {
	mut st := Stats{}
	a.keys_on = true
	a.keyset = map[string]map[string]bool{}
	if full {
		a.scan_bookings(mut st)
		a.scan_departures(mut st)
		a.scan_cash(mut st)
		a.scan_support(mut st)
		a.scan_network(mut st)
		a.scan_wallets(mut st)
		a.scan_customers(mut st)
		a.scan_settlements(mut st)
		a.scan_risk(mut st)
	}
	a.run_jobs(mut st)
	a.run_outbox(mut st)
	a.keys_on = false
	a.set_cfg('sys.last_tick', now_dt())
	return st
}

fn (st Stats) to_json() string {
	mut parts := []string{}
	for k, v in st.counts {
		parts << '${jstr(k)}:${v}'
	}
	return '{"at":${jstr(now_dt())},"counts":{${parts.join(',')}},"errors":[]}'
}
