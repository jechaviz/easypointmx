module main

// Autoprueba de las piezas puras (sin base de datos): `easypoint --selftest`.
// Corre en cualquier toolchain (no depende de `v test`) y también en el servidor, como diagnóstico.

struct SelfTest {
mut:
	pass int
	fail int
}

fn (mut t SelfTest) ok(name string, cond bool) {
	if cond {
		t.pass++
	} else {
		t.fail++
		eprintln('FAIL  ' + name)
	}
}

fn run_selftest() int {
	mut t := SelfTest{}
	// dinero y redondeo
	t.ok('round2', round2(2899.999) == 2900.0)
	t.ok('fmt_money entero', fmt_money(1450.0) == '1450')
	t.ok('fmt_money decimales', fmt_money(1450.5) == '1450.50')
	t.ok('mxn', mxn(1450) == '\$1,450 MXN' && mxn(1234567) == '\$1,234,567 MXN')
	// teléfonos y enlaces
	t.ok('phone10', phone10('+52 (442) 123-4567') == '4421234567')
	t.ok('wa_link', wa_link('4421234567', 'hola') == 'https://wa.me/524421234567?text=hola' && wa_link('12', '') == '')
	t.ok('url_encode', url_encode('a b&c') == 'a%20b%26c')
	// fechas
	t.ok('is_date', is_date('2026-10-17') && !is_date('2026-1-17') && !is_date('17/10/2026'))
	t.ok('add_days', add_days('2026-10-30', 3) == '2026-11-02' && add_days('2026-03-01', -1) == '2026-02-28')
	t.ok('days_between', days_between('2026-10-17', '2026-10-24') == 7 && days_between('2026-10-24', '2026-10-17') == -7)
	t.ok('weekday_of', weekday_of('1970-01-01') == 4 && weekday_of('2026-10-17') == 6)
	// literales SQL a prueba de inyección
	t.ok('q comilla', q("O'Brien") == "'O\\'Brien'")
	t.ok('q barra', q('a\\b') == "'a\\\\b'")
	t.ok('q inyección', q("x'; DROP TABLE users; --") == "'x\\'; DROP TABLE users; --'")
	t.ok('qn válido', qn('123') == '123' && qn('-12.5') == '-12.5')
	t.ok('qn inválido', qn('1; DROP TABLE x') == '0' && qn('1e5') == '0' && qn('') == '0' && qn('--1') == '0')
	t.ok('lit num', lit('num', '5 OR 1=1') == '0')
	t.ok('lit bool/dt/str', lit('bool', 'yes') == '1' && lit('bool', 'no') == '0' && lit('dt', '') == 'NULL' && lit('str', "a'b") == "'a\\'b'")
	// JSON
	t.ok('jstr', jstr('a"b') == '"a\\"b"' && jstr('línea\nnueva') == '"línea\\nnueva"' && jstr('tab\t') == '"tab\\t"')
	t.ok('unescape_batch', unescape_batch('a\\tb\\nc\\\\d') == 'a\tb\nc\\d')
	t.ok('fmt_num', fmt_num(3.0) == '3' && fmt_num(2.5) == '2.5')
	// esquema parseado con tipos
	s := load_schema()
	b := s.table('bookings')
	t.ok('schema tablas', 'bookings' in s.tables && 'payments' in s.tables && s.tables.len >= 25)
	t.ok('schema tipos', b['total'] == 'num' && b['protect'] == 'bool' && b['excursion_date'] == 'dt' && b['customer_name'] == 'str')
	t.ok('schema alias', s.name_kind('n_count') == 'num' && s.name_kind('b_owner') == 'bool' && s.name_kind('id') == 'num')
	// JSON tipado
	mut r := Row(map[string]string{})
	r['id'] = '7'
	r['name'] = 'Punto "Uno"'
	r['active'] = '1'
	r['n_count'] = '3'
	r['b_owner'] = '0'
	r['created_at'] = ''
	js := s.row_json(r)
	t.ok('row_json', js.contains('"id":7') && js.contains('"name":"Punto \\"Uno\\""') && js.contains('"active":true') && js.contains('"count":3') && js.contains('"owner":false') && js.contains('"created_at":null'))
	// máquina de etapas de la reserva
	mut bk := Row(map[string]string{})
	bk['status'] = 'new'
	bk['total'] = '1000'
	bk['amount_paid'] = '0'
	t.ok('etapa reservado', stage_of(bk) == 'reservado')
	bk['amount_paid'] = '200'
	t.ok('etapa abonado', stage_of(bk) == 'abonado')
	bk['amount_paid'] = '1000'
	t.ok('etapa pagado', stage_of(bk) == 'pagado')
	bk['checked_in'] = '1'
	t.ok('etapa abordado', stage_of(bk) == 'abordado')
	bk['status'] = 'completed'
	t.ok('etapa completado', stage_of(bk) == 'completado')
	bk['status'] = 'cancelled'
	bk['payment_status'] = 'credit'
	t.ok('etapa crédito', stage_of(bk) == 'credito')
	bk['payment_status'] = 'pending'
	t.ok('etapa cancelado', stage_of(bk) == 'cancelado')
	// reglas de negocio
	t.ok('comisión de guía por tramos', guide_commission(0.5) == 10 && guide_commission(4.9) == 20 && guide_commission(20) == 35 && guide_commission(21) == 50)
	t.ok('segmentos', segment_of(0, 0, 0) == 'nuevo' && segment_of(1, 900, 10) == 'primer_viaje' && segment_of(1, 900, 200) == 'dormido' && segment_of(2, 2000, 10) == 'recurrente' && segment_of(2, 2000, 200) == 'en_riesgo' && segment_of(3, 100, 10) == 'vip' && segment_of(1, 9000, 400) == 'vip_dormido')
	t.ok('prioridad de tickets', classify_priority('question', 'Me cobraron doble') == 'urgent' && classify_priority('question', 'quiero un reembolso') == 'high' && classify_priority('complaint', 'el guía fue grosero') == 'high' && classify_priority('question', '¿a qué hora salen?') == 'normal')
	t.ok('score de solicitud', score_application('Calle larga 123 Qro', '4421234567', '4421234567', 'https://maps', 'L-S', 'una descripción suficientemente larga') == 100 && score_application('', '', '', '', '', '') == 0)
	t.ok('calendario custom', build_reminder_dates('custom', '2026-11-01, 2026-10-20;mala;2026-10-25', '2026-12-01') == '2026-10-20,2026-10-25,2026-11-01')
	t.ok('calendario semanal', build_reminder_dates('weekly', '', add_days(today(), 20)).split(',').len == 2 && build_reminder_dates('biweekly', '', add_days(today(), 5)) == '')
	subj, text := render_tpl('expired_to_credit', {
		'name':   'Ana'
		'exc':    'Sierra Gorda'
		'amount': mxn(400)
		'until':  '2027-10-17'
		'link':   'http://x'
	})
	t.ok('plantilla', subj.contains('crédito') && text.contains('\$400 MXN') && text.contains('Ana'))
	println('selftest: ${t.pass} OK / ${t.fail} FAIL')
	return if t.fail == 0 { 0 } else { 1 }
}
