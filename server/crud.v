module main

import strings

// CRUD genérico por recurso con permisos por rol y alcance (scope) por punto / proveedor.
// Los flujos con reglas de negocio (pagos, cortes, liquidaciones…) viven en flows_*.v.

pub struct Res {
pub:
	name      string
	table     string
	read      []string
	write     []string
	scopes    map[string]string // rol -> condición SQL con {point} {provider} {uid}
	order     string = 'id DESC'
	search    []string
	hidden    []string
	no_create bool
	no_delete bool
}

const staff_all = ['admin', 'support', 'sales', 'operator', 'driver', 'provider']

fn resources() []Res {
	return [
		Res{
			name:   'points'
			table:  'points'
			read:   ['admin', 'support', 'sales', 'operator', 'driver']
			write:  ['admin', 'sales']
			scopes: {
				'operator': 'id={point}'
			}
			order:  'name'
			search: ['name', 'address']
		},
		Res{
			name:   'providers'
			table:  'providers'
			read:   ['admin', 'support', 'sales', 'provider']
			write:  ['admin']
			scopes: {
				'provider': 'id={provider}'
			}
			order:  'name'
			search: ['name']
		},
		Res{
			name:   'excursions'
			table:  'excursions'
			read:   staff_all
			write:  ['admin', 'provider']
			scopes: {
				'provider': 'provider_id={provider}'
			}
			search: ['name', 'destination']
		},
		Res{
			name:   'departures'
			table:  'departures'
			read:   ['admin', 'support', 'sales', 'provider']
			write:  ['admin', 'provider']
			scopes: {
				'provider': 'excursion_id IN (SELECT id FROM excursions WHERE provider_id={provider})'
			}
			order:  'date'
		},
		Res{
			name:      'bookings'
			table:     'bookings'
			read:      ['admin', 'support', 'provider']
			write:     ['admin', 'support']
			scopes:    {
				'provider': 'excursion_id IN (SELECT id FROM excursions WHERE provider_id={provider})'
			}
			search:    ['code', 'customer_name', 'customer_phone', 'customer_email']
			hidden:    ['token']
			no_create: true
			no_delete: true
		},
		Res{
			name:   'customers'
			table:  'customers'
			read:   ['admin', 'support', 'sales']
			write:  ['admin']
			order:  'last_seen DESC'
			search: ['name', 'phone', 'email', 'referral_code']
		},
		Res{
			name:   'shipments'
			table:  'shipments'
			read:   ['admin', 'support', 'operator', 'driver']
			write:  ['admin', 'operator']
			scopes: {
				'operator': 'point_id={point}'
			}
			search: ['tracking_id', 'recipient_name']
		},
		Res{
			name:      'guides'
			table:     'shipping_guides'
			read:      ['admin', 'support', 'operator']
			write:     ['admin']
			scopes:    {
				'operator': 'point_id={point}'
			}
			search:    ['tracking_number', 'sender_name', 'recipient_name']
			no_create: true
		},
		Res{
			name:      'payments'
			table:     'payments'
			read:      ['admin', 'support', 'operator', 'driver']
			write:     ['admin']
			scopes:    {
				'operator': 'point_id={point}'
				'driver':   "(status='held_at_point' OR collected_by={uid})"
			}
			search:    ['ref', 'label', 'point_name']
			no_create: true
		},
		Res{
			name:      'wallets'
			table:     'wallets'
			read:      ['admin', 'support']
			write:     ['admin']
			order:     'balance DESC'
			search:    ['customer_phone', 'customer_name']
			no_create: true
		},
		Res{
			name:      'wallet_entries'
			table:     'wallet_entries'
			read:      ['admin', 'support']
			write:     []string{}
			search:    ['customer_phone', 'reason', 'ref']
		},
		Res{
			name:   'settlements'
			table:  'settlements'
			read:   ['admin', 'provider']
			write:  ['admin']
			scopes: {
				'provider': "kind='provider' AND ref={provider}"
			}
			search: ['folio', 'ref_name']
		},
		Res{
			name:   'services'
			table:  'services'
			read:   staff_all
			write:  ['admin']
			order:  'category, name'
			search: ['name', 'category']
		},
		Res{
			name:   'service_orders'
			table:  'service_orders'
			read:   ['admin', 'support', 'operator']
			write:  ['admin']
			scopes: {
				'operator': 'point_id={point}'
			}
			search: ['service_name', 'customer_name', 'point_name']
			no_create: true
		},
		Res{
			name:   'tickets'
			table:  'support_tickets'
			read:   ['admin', 'support']
			write:  ['admin', 'support']
			search: ['code', 'customer_name', 'customer_phone', 'subject_ref', 'message']
			no_create: true
		},
		Res{
			name:   'applications'
			table:  'partner_applications'
			read:   ['admin', 'sales', 'support']
			write:  ['admin', 'sales']
			search: ['business_name', 'contact_phone', 'address']
			no_create: true
		},
		Res{
			name:   'pricing_rules'
			table:  'pricing_rules'
			read:   ['admin', 'sales']
			write:  ['admin']
			search: ['label', 'code']
		},
		Res{
			name:   'memberships'
			table:  'memberships'
			read:   ['admin', 'support']
			write:  ['admin']
			no_create: true
		},
		Res{
			name:   'outbox'
			table:  'outbox'
			read:   ['admin', 'support', 'sales']
			write:  ['admin', 'support']
			search: ['recipient', 'to_name', 'template', 'subject']
			no_create: true
		},
		Res{
			name:   'risk_flags'
			table:  'risk_flags'
			read:   ['admin']
			write:  ['admin']
			no_create: true
		},
		Res{
			name:   'events'
			table:  'pipeline_events'
			read:   ['admin', 'support', 'operator', 'provider']
			write:  []string{}
			search: ['entity', 'note']
		},
		Res{
			name:   'audit'
			table:  'audit_log'
			read:   ['admin']
			write:  []string{}
			search: ['actor', 'action', 'target', 'detail']
		},
		Res{
			name:   'jobs'
			table:  'jobs'
			read:   ['admin']
			write:  []string{}
		},
		Res{
			name:   'leads'
			table:  'leads'
			read:   ['admin', 'sales']
			write:  ['admin', 'sales']
			search: ['name', 'phone', 'email', 'message']
			no_create: true
		},
		Res{
			name:   'invoices'
			table:  'invoices'
			read:   ['admin']
			write:  ['admin']
			search: ['number', 'client_name', 'client_rfc']
		},
		Res{
			name:   'partners'
			table:  'api_partners'
			read:   ['admin']
			write:  ['admin']
			hidden: ['key_hash']
			no_create: true
			search: ['name']
		},
		Res{
			name:   'users'
			table:  'users'
			read:   ['admin']
			write:  ['admin']
			hidden: ['password_hash', 'reset_token', 'reset_expires']
			no_create: true
			search: ['name', 'email', 'phone']
		},
	]
}

fn find_res(name string) ?Res {
	for r in resources() {
		if r.name == name {
			return r
		}
	}
	return none
}

fn (res Res) scope_for(u User) string {
	s := res.scopes[u.role] or { return '' }
	return s.replace('{point}', u.point_id.str()).replace('{provider}', u.provider_id.str()).replace('{uid}', u.id.str())
}

const reserved_params = ['limit', 'offset', 'sort', 'q', 'from', 'to', 'in']

fn (mut a App) res_where(res Res, u User, r &Req) string {
	cols := a.schema.table(res.table)
	mut wh := []string{}
	sc := res.scope_for(u)
	if sc != '' {
		wh << '(${sc})'
	}
	for k, v in r.query {
		if k in reserved_params {
			continue
		}
		kind := cols[k] or { continue }
		if v == '' {
			continue
		}
		if v.contains(',') && kind == 'str' {
			mut parts := []string{}
			for x in v.split(',') {
				parts << q(x.trim_space())
			}
			wh << '${k} IN (${parts.join(',')})'
		} else {
			wh << '${k}=${lit(kind, v)}'
		}
	}
	if 'created_at' in cols {
		if f := r.query['from'] {
			if is_date(f) {
				wh << 'created_at>=${q(f + ' 00:00:00')}'
			}
		}
		if t := r.query['to'] {
			if is_date(t) {
				wh << 'created_at<=${q(t + ' 23:59:59')}'
			}
		}
	}
	if s := r.query['q'] {
		if s.trim_space() != '' && res.search.len > 0 {
			like := q('%' + s.trim_space().replace('%', '').replace('_', '\\_') + '%')
			mut ors := []string{}
			for c in res.search {
				ors << '${c} LIKE ${like}'
			}
			wh << '(' + ors.join(' OR ') + ')'
		}
	}
	return wh.join(' AND ')
}

fn (mut a App) strip_hidden(rows []Row, res Res) []Row {
	if res.hidden.len == 0 {
		return rows
	}
	mut out := []Row{}
	for rw in rows {
		mut n := Row(map[string]string{})
		for k, v in rw {
			if k !in res.hidden {
				n[k] = v
			}
		}
		out << n
	}
	return out
}

fn (mut a App) res_list(res Res, u User, r &Req) Resp {
	where := a.res_where(res, u, r)
	cols := a.schema.table(res.table)
	mut order := res.order
	if s := r.query['sort'] {
		desc := s.starts_with('-')
		c := if desc { s[1..] } else { s }
		if c in cols {
			order = '${c}${if desc { ' DESC' } else { '' }}'
		}
	}
	mut limit := (r.query['limit'] or { '100' }).int()
	if limit < 1 || limit > 500 {
		limit = 100
	}
	offset := (r.query['offset'] or { '0' }).int()
	w := if where == '' { '' } else { ' WHERE ${where}' }
	total := a.db.scalar('SELECT COUNT(*) FROM ${res.table}${w}') or { '0' }.int()
	rows := a.db.rows('SELECT * FROM ${res.table}${w} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}') or {
		return fail(500, 'db_error')
	}
	return json_ok('{"items":${a.schema.rows_json(a.strip_hidden(rows, res))},"total":${total}}')
}

fn (mut a App) res_get(res Res, u User, id i64) Resp {
	sc := res.scope_for(u)
	w := if sc == '' { '' } else { ' AND (${sc})' }
	rows := a.db.rows('SELECT * FROM ${res.table} WHERE id=${id}${w} LIMIT 1') or { return fail(500, 'db_error') }
	if rows.len == 0 {
		return fail(404, 'not_found')
	}
	return json_ok(a.schema.row_json(a.strip_hidden(rows, res)[0]))
}

// Datos permitidos en escritura: columnas del esquema, sin id ni marcas de sistema.
fn (mut a App) clean_input(res Res, b map[string]string) map[string]string {
	cols := a.schema.table(res.table)
	mut o := map[string]string{}
	for k, v in b {
		if k in cols && k !in ['id', 'created_at', 'password_hash', 'key_hash'] && k !in res.hidden {
			o[k] = v
		}
	}
	return o
}

fn (mut a App) res_create(res Res, u User, r &Req) Resp {
	if res.no_create {
		return fail(405, 'use_flow')
	}
	mut data := a.clean_input(res, body_map(r))
	// el alcance del actor se impone en el servidor, no en el cliente
	if u.role == 'provider' && 'provider_id' in a.schema.table(res.table) {
		data['provider_id'] = u.provider_id.str()
	}
	if u.role == 'provider' && res.table == 'departures' {
		exc := a.db.one('SELECT id FROM excursions WHERE id=${(data['excursion_id'] or { '0' }).i64()} AND provider_id=${u.provider_id}') or {
			empty_row()
		}
		if exc.len == 0 {
			return fail(403, 'forbidden')
		}
	}
	if u.role == 'operator' && 'point_id' in a.schema.table(res.table) {
		data['point_id'] = u.point_id.str()
	}
	id := a.db.insert(res.table, data) or { return fail_code(400, 'invalid', err.msg()) }
	a.audit(u.email, 'create', res.table, id, '')
	return res_get_created(mut a, res, id)
}

fn res_get_created(mut a App, res Res, id i64) Resp {
	row := a.db.get(res.table, id) or { empty_row() }
	return json_status(201, a.schema.row_json(a.strip_hidden([row], res)[0]))
}

fn (mut a App) res_update(res Res, u User, id i64, r &Req) Resp {
	data := a.clean_input(res, body_map(r))
	if data.len == 0 {
		return fail(400, 'nothing_to_update')
	}
	sc := res.scope_for(u)
	cols := a.schema.table(res.table)
	mut sets := []string{}
	for c, v in data {
		if c in ['provider_id'] && u.role == 'provider' {
			continue // un proveedor no puede reasignarse
		}
		sets << '${c}=${lit(cols[c], v)}'
	}
	if 'updated_at' in cols {
		sets << 'updated_at=${q(now_dt())}'
	}
	if sets.len == 0 {
		return fail(400, 'nothing_to_update')
	}
	w := if sc == '' { '' } else { ' AND (${sc})' }
	rs := a.db.rows('UPDATE ${res.table} SET ${sets.join(',')} WHERE id=${id}${w};\nSELECT ROW_COUNT() AS n') or {
		return fail_code(400, 'invalid', err.msg())
	}
	if rs.len == 0 || rs[0]['n'].int() == 0 {
		// 0 filas puede ser "sin cambios"; confirmamos existencia dentro del alcance
		ex := a.db.rows('SELECT id FROM ${res.table} WHERE id=${id}${w}') or { []Row{} }
		if ex.len == 0 {
			return fail(404, 'not_found')
		}
	}
	if res.table == 'bookings' {
		a.restage(id, u.email)
	}
	a.audit(u.email, 'update', res.table, id, data.keys().join(','))
	return a.res_get(res, u, id)
}

fn (mut a App) res_delete(res Res, u User, id i64) Resp {
	if res.no_delete {
		return fail(405, 'not_deletable')
	}
	sc := res.scope_for(u)
	w := if sc == '' { '' } else { ' AND (${sc})' }
	a.db.exec('DELETE FROM ${res.table} WHERE id=${id}${w}') or { return fail_code(409, 'in_use', 'No se puede eliminar: tiene registros relacionados.') }
	a.audit(u.email, 'delete', res.table, id, '')
	return json_ok('{"ok":true}')
}

// Despacho: /api/r/<recurso>[/<id>]
fn (mut a App) crud_dispatch(u User, r &Req, segs []string) Resp {
	res := find_res(segs[2]) or { return fail(404, 'unknown_resource') }
	is_write := r.method in ['POST', 'PUT', 'PATCH', 'DELETE']
	allowed := if is_write { res.write } else { res.read }
	if u.role !in allowed {
		return fail_code(403, 'forbidden', 'Tu rol no tiene permiso para esta acción.')
	}
	if segs.len == 3 {
		return match r.method {
			'GET' { a.res_list(res, u, r) }
			'POST' { a.res_create(res, u, r) }
			else { fail(405, 'method_not_allowed') }
		}
	}
	id := segs[3].i64()
	if id <= 0 {
		return fail(400, 'bad_id')
	}
	return match r.method {
		'GET' { a.res_get(res, u, id) }
		'PUT', 'PATCH' { a.res_update(res, u, id, r) }
		'DELETE' { a.res_delete(res, u, id) }
		else { fail(405, 'method_not_allowed') }
	}
}

// Tareas: visibles por rol y alcance; cualquiera marca las suyas como hechas.
fn (mut a App) tasks_scope(u User) string {
	if u.role == 'admin' {
		return ''
	}
	mut ids := ['0']
	if u.point_id > 0 {
		ids << u.point_id.str()
	}
	if u.provider_id > 0 {
		ids << u.provider_id.str()
	}
	ids << u.id.str()
	return "role=${q(u.role)} AND scope_id IN (${ids.join(',')})"
}

fn (mut a App) tasks_list(u User, r &Req) Resp {
	sc := a.tasks_scope(u)
	mut wh := []string{}
	if sc != '' {
		wh << sc
	}
	status := r.query['status'] or { 'open' }
	if status == 'open' {
		wh << "status IN ('open','doing')"
	} else if status != 'all' {
		wh << 'status=${q(status)}'
	}
	if role := r.query['role'] {
		if u.role == 'admin' && role != '' {
			wh << 'role=${q(role)}'
		}
	}
	w := if wh.len == 0 { '' } else { ' WHERE ' + wh.join(' AND ') }
	rows := a.db.rows("SELECT * FROM tasks${w} ORDER BY FIELD(priority,'urgent','high','normal','low'), COALESCE(due_at,'9999-12-31'), id LIMIT 200") or {
		[]Row{}
	}
	return json_ok('{"items":${a.schema.rows_json(rows)},"total":${rows.len}}')
}

fn (mut a App) task_update(u User, id i64, r &Req) Resp {
	sc := a.tasks_scope(u)
	w := if sc == '' { '' } else { ' AND (${sc})' }
	b := body_map(r)
	st := b['status'] or { 'done' }
	if st !in ['open', 'doing', 'done', 'dismissed'] {
		return fail(400, 'bad_status')
	}
	rs := a.db.rows('UPDATE tasks SET status=${q(st)}, done_at=${if st in ['done', 'dismissed'] { q(now_dt()) } else { 'NULL' }} WHERE id=${id}${w};\nSELECT ROW_COUNT() AS n') or {
		return fail(500, 'db_error')
	}
	if rs.len == 0 || rs[0]['n'].int() == 0 {
		return fail(404, 'not_found')
	}
	return json_ok('{"ok":true}')
}

fn jbool(b bool) string {
	return if b { 'true' } else { 'false' }
}

fn join_json(parts []string) string {
	mut o := strings.new_builder(parts.len * 64)
	o.write_u8(`[`)
	o.write_string(parts.join(','))
	o.write_u8(`]`)
	return o.str()
}
