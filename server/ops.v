module main

// "Hoy" de cada actor, finanzas y economía unitaria.

fn kpi(key string, label string, value string, hint string, tone string) string {
	return '{"key":${jstr(key)},"label":${jstr(label)},"value":${value},"hint":${jstr(hint)},"tone":${jstr(tone)}}'
}

fn (mut a App) sumq(stmt string) f64 {
	return a.db.scalar(stmt) or { '0' }.f64()
}

fn (mut a App) ops_home(u User) Resp {
	mut ks := []string{}
	t := today()
	match u.role {
		'admin' {
			held := a.sumq("SELECT COALESCE(SUM(net),0) FROM payments WHERE status='held_at_point' AND method<>'credit'")
			route := a.sumq("SELECT COALESCE(SUM(collected_amount),0) FROM payments WHERE status='collected'")
			recv := a.sumq("SELECT COALESCE(SUM(balance),0) FROM bookings WHERE status IN ('new','confirmed')")
			liab := a.sumq('SELECT COALESCE(SUM(balance),0) FROM wallets')
			today_b := a.db.count('bookings', 'DATE(created_at)=${q(t)}')
			upcoming := a.db.count('bookings', "excursion_date BETWEEN ${q(t)} AND ${q(add_days(t, 7))} AND status IN ('new','confirmed')")
			tick_open := a.db.count('support_tickets', "status IN ('open','escalated','in_progress')")
			risk := a.db.count('risk_flags', "status='open'")
			manual := a.db.count('outbox', "status='manual'")
			urgent := a.db.count('tasks', "status IN ('open','doing') AND priority='urgent'")
			ks << kpi('held', 'Efectivo en puntos', '${held:.2f}', 'por recolectar', 'warn')
			ks << kpi('route', 'Efectivo en ruta', '${route:.2f}', 'con choferes', 'warn')
			ks << kpi('receivable', 'Por cobrar', '${recv:.2f}', 'saldos de reservas vivas', 'info')
			ks << kpi('credit', 'Crédito en circulación', '${liab:.2f}', 'pasivo con clientes', 'info')
			ks << kpi('bookings_today', 'Reservas hoy', today_b.str(), '${upcoming} salen en 7 días', 'ok')
			ks << kpi('tickets', 'Tickets abiertos', tick_open.str(), 'embudo privado', if tick_open > 0 { 'warn' } else { 'ok' })
			ks << kpi('risk', 'Banderas de riesgo', risk.str(), 'por revisar', if risk > 0 { 'bad' } else { 'ok' })
			ks << kpi('manual', 'Mensajes por enviar', manual.str(), 'WhatsApp en bandeja', if manual > 0 { 'warn' } else { 'ok' })
			ks << kpi('urgent', 'Tareas urgentes', urgent.str(), 'del motor', if urgent > 0 { 'bad' } else { 'ok' })
		}
		'operator' {
			pid := u.point_id
			held := a.sumq("SELECT COALESCE(SUM(net),0) FROM payments WHERE point_id=${pid} AND status='held_at_point'")
			com := a.sumq("SELECT COALESCE(SUM(commission),0) FROM payments WHERE point_id=${pid} AND created_at>=${q(add_days(t, -30) + ' 00:00:00')}")
			atpt := a.db.count('shipments', "point_id=${pid} AND status='at_point'")
			sales := a.db.count('service_orders', 'point_id=${pid} AND DATE(created_at)=${q(t)}')
			ks << kpi('held', 'Efectivo que retienes', '${held:.2f}', 'el chofer lo recoge', 'warn')
			ks << kpi('commission', 'Tu comisión (30 días)', '${com:.2f}', 'ganancia del punto', 'ok')
			ks << kpi('at_point', 'Paquetes en tu punto', atpt.str(), 'por entregar', 'info')
			ks << kpi('sales_today', 'Ventas de hoy', sales.str(), 'servicios y guías', 'ok')
		}
		'driver' {
			stops := a.db.rows("SELECT point_id FROM payments WHERE status='held_at_point' AND method<>'credit' GROUP BY point_id") or {
				[]Row{}
			}
			onhand := a.sumq("SELECT COALESCE(SUM(collected_amount),0) FROM payments WHERE status='collected' AND collected_by=${u.id}")
			limit := a.cfg_f('cash.driver_limit', 5000)
			ks << kpi('stops', 'Paradas con efectivo', stops.len.str(), 'ruta sugerida', 'info')
			ks << kpi('on_hand', 'Efectivo en tu poder', '${onhand:.2f}', 'límite ${mxn(limit)}', if onhand >= limit { 'bad' } else { 'warn' })
		}
		'provider' {
			pid := u.provider_id
			next := a.db.count('departures', "excursion_id IN (SELECT id FROM excursions WHERE provider_id=${pid}) AND status='open' AND date BETWEEN ${q(t)} AND ${q(add_days(t, 14))}")
			pend := a.sumq("SELECT COALESCE(SUM(net),0) FROM settlements WHERE kind='provider' AND ref=${q(pid.str())} AND status='pending'")
			rating := a.sumq('SELECT COALESCE(AVG(NULLIF(rating_avg,0)),0) FROM excursions WHERE provider_id=${pid}')
			ks << kpi('next', 'Salidas próximas (14 días)', next.str(), 'programadas', 'info')
			ks << kpi('pending', 'Por liquidar', '${pend:.2f}', 'te pagamos en ${a.cfg_i('settlement.payout_days', 2)} días', 'ok')
			ks << kpi('rating', 'Calificación', '${rating:.2f}', 'promedio de tus experiencias', 'ok')
		}
		'sales' {
			apps := a.db.count('partner_applications', "status='pending'")
			leads := a.db.count('leads', "status='new'")
			ks << kpi('apps', 'Aspirantes por contactar', apps.str(), 'afiliación de puntos', 'warn')
			ks << kpi('leads', 'Leads nuevos', leads.str(), 'captados en la web', 'ok')
		}
		else {
			opn := a.db.count('support_tickets', "status IN ('open','escalated','in_progress')")
			esc := a.db.count('support_tickets', "status='escalated'")
			ks << kpi('tickets', 'Tickets abiertos', opn.str(), 'por atender', 'warn')
			ks << kpi('escalated', 'Fuera de SLA', esc.str(), 'prioridad máxima', if esc > 0 { 'bad' } else { 'ok' })
		}
	}
	sc := a.tasks_scope(u)
	w := if sc == '' { '' } else { ' AND ' + sc }
	tasks := a.db.rows("SELECT * FROM tasks WHERE status IN ('open','doing')${w} ORDER BY FIELD(priority,'urgent','high','normal','low'), COALESCE(due_at,'9999-12-31'), id LIMIT 15") or {
		[]Row{}
	}
	return json_ok('{"role":${jstr(u.role)},"name":${jstr(u.name)},"now":${jstr(now_dt())},"kpis":[${ks.join(',')}],"tasks":${a.schema.rows_json(tasks)}}')
}

fn (mut a App) finance_summary() Resp {
	recv := a.sumq("SELECT COALESCE(SUM(balance),0) FROM bookings WHERE status IN ('new','confirmed') AND payment_status IN ('pending','partial')")
	held := a.sumq("SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='held_at_point' AND method<>'credit'")
	coll := a.sumq("SELECT COALESCE(SUM(net),0) FROM payments WHERE status='collected' AND method<>'credit'")
	deliv := a.sumq("SELECT COALESCE(SUM(net),0) FROM payments WHERE status='delivered' AND method<>'credit'")
	circ := a.sumq('SELECT COALESCE(SUM(balance),0) FROM wallets')
	rev_g := a.sumq("SELECT COALESCE(SUM(price),0) FROM shipping_guides WHERE status IN ('paid','generated','in_transit','delivered')")
	rev_e := a.sumq("SELECT COALESCE(SUM(total),0) FROM bookings WHERE payment_status IN ('paid','partial') AND status<>'cancelled'")
	t_open := a.db.count('support_tickets', "status IN ('open','escalated')")
	b_new := a.db.count('bookings', "status='new'")
	g_gen := a.db.count('shipping_guides', "status='paid'")
	p_held := a.db.count('payments', "status='held_at_point'")
	return json_ok('{"receivable":${recv:.2f},"cash_held":${held:.2f},"cash_collected":${coll:.2f},"cash_delivered":${deliv:.2f},"credit_circulation":${circ:.2f},"revenue_guides":${rev_g:.2f},"revenue_excursions":${rev_e:.2f},"pending":{"tickets_open":${t_open},"bookings_new":${b_new},"guides_to_generate":${g_gen},"payments_held":${p_held}}}')
}

fn (mut a App) fee_for(prov Row, base f64) f64 {
	if prov.len == 0 {
		return round2(base * 0.15)
	}
	if prov['fee_type'] == 'fixed' {
		return prov['fee_amount'].f64()
	}
	rate := if prov['fee_rate'].f64() > 0 { prov['fee_rate'].f64() } else { 15.0 }
	return round2(base * rate / 100.0)
}

// Economía unitaria: de dónde sale el dinero, cuánto cuesta crecer y cuánto se custodia.
fn (mut a App) economics(days_in int) Resp {
	days := if days_in < 1 { 30 } else if days_in > 365 { 365 } else { days_in }
	since := add_days(today(), -days) + ' 00:00:00'
	rows := a.db.rows("SELECT b.total, b.protect_fee, b.discount, b.amount_paid, b.status, b.stage, b.excursion_id, p.fee_type, p.fee_rate, p.fee_amount FROM bookings b LEFT JOIN excursions e ON e.id=b.excursion_id LEFT JOIN providers p ON p.id=e.provider_id WHERE b.created_at>=${q(since)}") or {
		[]Row{}
	}
	mut gmv := 0.0
	mut collected := 0.0
	mut take_booked := 0.0
	mut take_rec := 0.0
	mut protect := 0.0
	mut disc := 0.0
	mut live := 0
	mut done := 0
	mut paidish := 0
	mut stages := map[string]int{}
	for b in rows {
		disc += b['discount'].f64()
		stages[b['stage']] = (stages[b['stage']] or { 0 }) + 1
		if b['status'] == 'cancelled' {
			continue
		}
		live++
		base := b['total'].f64() - b['protect_fee'].f64()
		gmv += b['total'].f64()
		collected += b['amount_paid'].f64()
		protect += b['protect_fee'].f64()
		mut prov := empty_row()
		prov['fee_type'] = b['fee_type']
		prov['fee_rate'] = b['fee_rate']
		prov['fee_amount'] = b['fee_amount']
		fee := if b['fee_type'] == '' { round2(base * 0.15) } else { a.fee_for(prov, base) }
		take_booked += fee
		if b['status'] == 'completed' {
			done++
			take_rec += fee
		}
		if b['amount_paid'].f64() > 0 {
			paidish++
		}
	}
	total_b := rows.len
	guides := a.db.rows("SELECT price, commission, insurance_fee FROM shipping_guides WHERE created_at>=${q(since)} AND status NOT IN ('cancelled','quoted')") or {
		[]Row{}
	}
	mut g_gmv := 0.0
	mut g_com := 0.0
	mut g_ins := 0.0
	for g in guides {
		g_gmv += g['price'].f64()
		g_com += g['commission'].f64()
		g_ins += g['insurance_fee'].f64()
	}
	g_take := round2(g_gmv * a.cfg_f('econ.guide_spread_pct', 12) / 100.0) + g_ins
	orders := a.db.rows("SELECT amount, commission FROM service_orders WHERE created_at>=${q(since)} AND status<>'cancelled'") or {
		[]Row{}
	}
	mut o_gmv := 0.0
	mut o_com := 0.0
	for o in orders {
		o_gmv += o['amount'].f64()
		o_com += o['commission'].f64()
	}
	o_take := round2(o_gmv * a.cfg_f('econ.service_take_pct', 8) / 100.0)
	point_com := a.sumq("SELECT COALESCE(SUM(commission),0) FROM payments WHERE created_at>=${q(since)}")
	held := a.sumq("SELECT COALESCE(SUM(net),0) FROM payments WHERE status='held_at_point'")
	route := a.sumq("SELECT COALESCE(SUM(collected_amount),0) FROM payments WHERE status='collected'")
	deferred := a.sumq("SELECT COALESCE(SUM(amount_paid),0) FROM bookings WHERE status IN ('new','confirmed')")
	liab := a.sumq('SELECT COALESCE(SUM(balance),0) FROM wallets')
	ent := a.db.rows('SELECT amount, reason FROM wallet_entries WHERE created_at>=${q(since)}') or { []Row{} }
	mut promo := 0.0
	mut bonus := 0.0
	mut breakage := 0.0
	for e in ent {
		x := e['amount'].f64()
		match e['reason'] {
			'referral_reward', 'club_cashback', 'review_bonus' { promo += if x > 0 { x } else { 0 } }
			'bonus_departure_cancelled' { bonus += if x > 0 { x } else { 0 } }
			'expired' { breakage += if x < 0 { -x } else { x } }
			else {}
		}
	}
	club_rev := a.sumq("SELECT COALESCE(SUM(price),0) FROM memberships WHERE created_at>=${q(since)} AND status='active'")
	club_new := a.db.count('memberships', "created_at>=${q(since)} AND status='active'")
	revenue := take_rec + protect + g_take + o_take + breakage + club_rev
	cost := point_com + promo + bonus + disc
	margin := revenue - cost
	custs := a.db.rows('SELECT trips, lifetime_spend, tier, segment FROM customers') or { []Row{} }
	mut buyers := 0
	mut repeat := 0
	mut spend := 0.0
	mut members := 0
	mut seg := map[string]int{}
	for c in custs {
		seg[c['segment']] = (seg[c['segment']] or { 0 }) + 1
		if c['tier'] == 'club' {
			members++
		}
		if c['trips'].int() >= 1 {
			buyers++
			spend += c['lifetime_spend'].f64()
		}
		if c['trips'].int() >= 2 {
			repeat++
		}
	}
	mut st_json := []string{}
	for k, v in stages {
		st_json << '${jstr(k)}:${v}'
	}
	mut seg_json := []string{}
	for k, v in seg {
		seg_json << '${jstr(k)}:${v}'
	}
	risk := a.db.count('risk_flags', "status='open'")
	tasks_open := a.db.count('tasks', "status IN ('open','doing')")
	manual := a.db.count('outbox', "status='manual'")
	return json_ok('{"window_days":${days},"since":${jstr(since[..10])},"excursions":{"bookings":${total_b},"active":${live},"completed":${done},"cancelled":${total_b - live},"gmv_booked":${gmv:.2f},"cash_collected":${collected:.2f},"take_booked":${take_booked:.2f},"take_recognized":${take_rec:.2f},"protect_revenue":${protect:.2f},"discounts_given":${disc:.2f},"take_rate_pct":${if gmv > 0 { round2(take_booked / gmv * 100.0) } else { 0.0 }:.2f},"avg_ticket":${if live > 0 { round2(gmv / f64(live)) } else { 0.0 }:.2f}},"funnel":{${st_json.join(',')}},"guides":{"count":${guides.len},"gmv":${g_gmv:.2f},"point_commission":${g_com:.2f},"take":${g_take:.2f},"insurance_revenue":${g_ins:.2f}},"services":{"count":${orders.len},"gmv":${o_gmv:.2f},"point_commission":${o_com:.2f},"take":${o_take:.2f}},"custody":{"cash_at_points":${held:.2f},"cash_in_route":${route:.2f},"customer_deposits_on_active_trips":${deferred:.2f},"credit_liability":${liab:.2f},"float_total":${held + route + deferred:.2f}},"growth_cost":{"referral_and_cashback":${promo:.2f},"cancellation_bonus":${bonus:.2f},"discounts":${disc:.2f},"breakage_revenue":${breakage:.2f}},"club":{"new_members":${club_new},"revenue":${club_rev:.2f}},"contribution":{"revenue":${revenue:.2f},"variable_cost":${cost:.2f},"margin":${margin:.2f},"margin_pct":${if revenue > 0 { round2(margin / revenue * 100.0) } else { 0.0 }:.2f},"point_commission_paid":${point_com:.2f}},"customers":{"total":${custs.len},"buyers":${buyers},"repeat_rate_pct":${if buyers > 0 { round2(f64(repeat) / f64(buyers) * 100.0) } else { 0.0 }:.2f},"avg_ltv":${if buyers > 0 { round2(spend / f64(buyers)) } else { 0.0 }:.2f},"club_members":${members},"segments":{${seg_json.join(',')}}},"health":{"deposit_conversion_pct":${if total_b > 0 { round2(f64(paidish) / f64(total_b) * 100.0) } else { 0.0 }:.2f},"cancel_rate_pct":${if total_b > 0 { round2(f64(total_b - live) / f64(total_b) * 100.0) } else { 0.0 }:.2f},"open_risk_flags":${risk},"open_tasks":${tasks_open},"outbox_manual_pending":${manual}}}')
}

// Serie diaria para gráficas: reservas, GMV reservado y abonos recibidos.
fn (mut a App) ops_series(days_in int) Resp {
	days := if days_in < 3 { 14 } else if days_in > 120 { 120 } else { days_in }
	since := add_days(today(), -(days - 1))
	bk := a.db.rows("SELECT DATE(created_at) AS d, COUNT(*) AS n_c, COALESCE(SUM(total),0) AS n_gmv FROM bookings WHERE created_at>=${q(since + ' 00:00:00')} AND status<>'cancelled' GROUP BY DATE(created_at)") or {
		[]Row{}
	}
	pay := a.db.rows("SELECT DATE(created_at) AS d, COALESCE(SUM(amount),0) AS n_amt FROM payments WHERE created_at>=${q(since + ' 00:00:00')} AND method<>'credit' AND status<>'cancelled' AND status<>'pending_confirm' GROUP BY DATE(created_at)") or {
		[]Row{}
	}
	mut bc := map[string]int{}
	mut bg := map[string]f64{}
	mut pa := map[string]f64{}
	for r in bk {
		bc[r['d']] = r['n_c'].int()
		bg[r['d']] = r['n_gmv'].f64()
	}
	for r in pay {
		pa[r['d']] = r['n_amt'].f64()
	}
	mut out := []string{}
	for i in 0 .. days {
		d := add_days(since, i)
		out << '{"date":${jstr(d)},"bookings":${bc[d] or { 0 }},"gmv":${(bg[d] or { 0.0 }):.2f},"payments":${(pa[d] or { 0.0 }):.2f}}'
	}
	return json_ok('{"days":[${out.join(',')}]}')
}
