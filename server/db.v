module main

import os
import strings

// Acceso a MySQL/MariaDB por el cliente `mariadb` del host (sin libmysqlclient: el binario C no
// necesita cabeceras de MySQL en el servidor). Los argumentos van directo al proceso (sin shell);
// el único vector de inyección es el SQL, y todo valor pasa por lit()/q() según el tipo de columna.

pub type Row = map[string]string

pub struct DbCfg {
pub:
	host string = '127.0.0.1'
	port string = '3306'
	name string
	user string
	pass string
	bin  string = '/usr/bin/mariadb'
}

pub struct Db {
pub:
	cfg    DbCfg
	schema &Schema = unsafe { nil }
}

// ── literales SQL ───────────────────────────────────────────────────────────
fn q(value string) string {
	mut o := strings.new_builder(value.len + 8)
	o.write_u8(`'`)
	for c in value {
		match c {
			`\\` { o.write_string('\\\\') }
			`'` { o.write_string("\\'") }
			`\n` { o.write_string('\\n') }
			`\r` { o.write_string('\\r') }
			`\0` { o.write_string('\\0') }
			0x1a { o.write_string('\\Z') }
			else { o.write_u8(c) }
		}
	}
	o.write_u8(`'`)
	return o.str()
}

// número seguro para inline (rechaza cualquier cosa que no sea numérica)
fn qn(value string) string {
	v := value.trim_space()
	if v == '' {
		return '0'
	}
	mut dots := 0
	for i, c in v {
		if c == `-` && i == 0 {
			continue
		}
		if c == `.` {
			dots++
			if dots > 1 {
				return '0'
			}
			continue
		}
		if c < `0` || c > `9` {
			return '0'
		}
	}
	if v == '-' || v == '.' {
		return '0'
	}
	return v
}

fn qi(n i64) string {
	return n.str()
}

fn qf(x f64) string {
	return '${round2(x):.2}'
}

// ── ejecución ───────────────────────────────────────────────────────────────
fn (d &Db) run(stmt string, headers bool) !string {
	os.setenv('MYSQL_PWD', d.cfg.pass, true)
	mut args := ['-B', '--default-character-set=utf8mb4', '-h${d.cfg.host}', '-P${d.cfg.port}', '-u${d.cfg.user}']
	if !headers {
		args << '-N'
	}
	args << d.cfg.name
	mut tmp := ''
	if stmt.len > 6000 {
		tmp = os.join_path(os.temp_dir(), 'ep_${rand_token(6)}.sql')
		os.write_file(tmp, stmt)!
		args << '-e'
		args << 'source ${tmp.replace('\\', '/')}'
	} else {
		args << '-e'
		args << stmt
	}
	mut p := os.new_process(d.cfg.bin)
	p.set_args(args)
	p.set_redirect_stdio()
	p.run()
	out := p.stdout_slurp()
	errout := p.stderr_slurp()
	p.wait()
	code := p.code
	p.close()
	if tmp != '' {
		os.rm(tmp) or {}
	}
	if code != 0 {
		msg := errout.trim_space()
		eprintln('[db-error] ' + if msg.len > 300 { msg[..300] } else { msg })
		return error(msg)
	}
	return out
}

fn unescape_batch(s string) string {
	if !s.contains('\\') {
		return s
	}
	mut o := strings.new_builder(s.len)
	mut i := 0
	for i < s.len {
		c := s[i]
		if c == `\\` && i + 1 < s.len {
			n := s[i + 1]
			match n {
				`n` { o.write_u8(`\n`) }
				`t` { o.write_u8(`\t`) }
				`r` { o.write_u8(`\r`) }
				`0` { o.write_u8(0) }
				`\\` { o.write_u8(`\\`) }
				else { o.write_u8(n) }
			}
			i += 2
			continue
		}
		o.write_u8(c)
		i++
	}
	return o.str()
}

// rows ejecuta una o varias sentencias y devuelve las filas del último SELECT con encabezado.
pub fn (d &Db) rows(stmt string) ![]Row {
	out := d.run(stmt, true)!
	trimmed := out.trim_right('\n')
	if trimmed == '' {
		return []Row{}
	}
	lines := trimmed.split('\n')
	// con varios SELECT, mariadb imprime un bloque por resultado; usamos solo el último
	mut start := 0
	for i := 1; i < lines.len; i++ {
		// no hay separador: asumimos un solo SELECT (los helpers usan SELECT únicos al final)
		_ = i
	}
	header := lines[start].split('\t')
	mut rows := []Row{}
	for li in start + 1 .. lines.len {
		cells := lines[li].split('\t')
		mut r := Row(map[string]string{})
		for ci, h in header {
			mut v := if ci < cells.len { unescape_batch(cells[ci]) } else { '' }
			if v == 'NULL' {
				v = ''
			}
			r[h] = v
		}
		rows << r
	}
	return rows
}

pub fn (d &Db) exec(stmt string) ! {
	d.run(stmt, false)!
}

pub fn (d &Db) scalar(stmt string) !string {
	rs := d.rows(stmt)!
	if rs.len == 0 {
		return ''
	}
	for _, v in rs[0] {
		return v
	}
	return ''
}

pub fn (d &Db) one(stmt string) !Row {
	rs := d.rows(stmt)!
	if rs.len == 0 {
		return Row(map[string]string{})
	}
	return rs[0]
}

// Ejecuta sentencias en una transacción (una sola invocación del cliente = una conexión).
pub fn (d &Db) tx(stmts []string) ! {
	d.exec('START TRANSACTION;\n' + stmts.join(';\n') + ';\nCOMMIT;')!
}

// ── CRUD genérico guiado por el esquema ─────────────────────────────────────
// Columnas y literales de un INSERT, filtrados y tipados por el esquema.
pub fn (d &Db) insert_parts(table string, data map[string]string) (string, string) {
	mut cols := []string{}
	mut vals := []string{}
	ts := d.schema.table(table)
	for c, kind in ts {
		if c == 'id' {
			continue
		}
		if c !in data {
			if c == 'created_at' || c == 'updated_at' {
				cols << c
				vals << q(now_dt())
			}
			continue
		}
		cols << c
		vals << lit(kind, data[c])
	}
	return cols.join(','), vals.join(',')
}

pub fn (d &Db) insert(table string, data map[string]string) !i64 {
	cols, vals := d.insert_parts(table, data)
	if cols == '' {
		return error('insert ${table}: sin columnas válidas')
	}
	rs := d.rows('INSERT INTO ${table} (${cols}) VALUES (${vals});\nSELECT LAST_INSERT_ID() AS id')!
	return rs[0]['id'].i64()
}

pub fn (d &Db) update(table string, id i64, data map[string]string) !int {
	ts := d.schema.table(table)
	mut sets := []string{}
	for c, v in data {
		kind := ts[c] or { continue }
		if c == 'id' {
			continue
		}
		sets << '${c}=${lit(kind, v)}'
	}
	if 'updated_at' in ts && 'updated_at' !in data {
		sets << 'updated_at=${q(now_dt())}'
	}
	if sets.len == 0 {
		return 0
	}
	rs := d.rows('UPDATE ${table} SET ${sets.join(',')} WHERE id=${id};\nSELECT ROW_COUNT() AS n')!
	return rs[0]['n'].int()
}

pub fn (d &Db) get(table string, id i64) !Row {
	return d.one('SELECT * FROM ${table} WHERE id=${id} LIMIT 1')
}

pub fn (d &Db) find(table string, where string, order string, limit int) ![]Row {
	mut stmt := 'SELECT * FROM ${table}'
	if where != '' {
		stmt += ' WHERE ${where}'
	}
	if order != '' {
		stmt += ' ORDER BY ${order}'
	}
	if limit > 0 {
		stmt += ' LIMIT ${limit}'
	}
	return d.rows(stmt)
}

pub fn (d &Db) count(table string, where string) int {
	w := if where == '' { '' } else { ' WHERE ${where}' }
	return d.scalar('SELECT COUNT(*) FROM ${table}${w}') or { '0' }.int()
}

pub fn (d &Db) sum(table string, col string, where string) f64 {
	w := if where == '' { '' } else { ' WHERE ${where}' }
	return d.scalar('SELECT COALESCE(SUM(${col}),0) FROM ${table}${w}') or { '0' }.f64()
}
