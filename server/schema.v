module main

// Esquema: el DDL embebido es la única fuente de verdad. De él se deducen los tipos de cada
// columna (num / bool / dt / str) para (a) literales SQL seguros y (b) tipos JSON correctos.

pub struct Schema {
pub mut:
	tables map[string]map[string]string
	names  map[string]string // nombre de columna -> tipo (convención: mismo nombre = mismo tipo)
}

const ddl_files = [
	$embed_file('schema/001_core.sql'),
	$embed_file('schema/002_fixes.sql'),
]

fn kind_of(typ string) string {
	t := typ.to_lower()
	if t.starts_with('tinyint(1)') {
		return 'bool'
	}
	if t.starts_with('bigint') || t.starts_with('int') || t.starts_with('decimal') || t.starts_with('double')
		|| t.starts_with('tinyint') {
		return 'num'
	}
	if t.starts_with('datetime') || t.starts_with('date') {
		return 'dt'
	}
	return 'str'
}

pub fn load_schema() &Schema {
	mut s := &Schema{}
	for f in ddl_files {
		parse_ddl(mut s, f.to_string())
	}
	return s
}

fn parse_ddl(mut s Schema, ddl string) {
	mut cur := ''
	for raw in ddl.split('\n') {
		line := raw.trim_space()
		if line.starts_with('CREATE TABLE IF NOT EXISTS ') {
			cur = line['CREATE TABLE IF NOT EXISTS '.len..].all_before(' ').trim_space()
			s.tables[cur] = map[string]string{}
			continue
		}
		if cur == '' {
			continue
		}
		if line.starts_with(')') {
			cur = ''
			continue
		}
		if line.starts_with('PRIMARY') || line.starts_with('UNIQUE') || line.starts_with('KEY')
			|| line.starts_with('--') || line == '' {
			continue
		}
		parts := line.split(' ')
		if parts.len < 2 {
			continue
		}
		col := parts[0]
		kind := kind_of(parts[1])
		s.tables[cur][col] = kind
		if col !in s.names {
			s.names[col] = kind
		}
	}
}

pub fn (s &Schema) table(name string) map[string]string {
	return s.tables[name] or { map[string]string{} }
}

// Tipo por nombre de columna (para filas con alias / joins). Alias `n_x` => numérico `x`.
pub fn (s &Schema) name_kind(col string) string {
	if col.starts_with('n_') {
		return 'num'
	}
	if col.starts_with('b_') {
		return 'bool'
	}
	return s.names[col] or { 'str' }
}

fn lit(kind string, v string) string {
	return match kind {
		'num' { qn(v) }
		'bool' { if v == '1' || v == 'true' || v == 'yes' || v == 'on' { '1' } else { '0' } }
		'dt' { if v.trim_space() == '' { 'NULL' } else { q(v) } }
		else { q(v) }
	}
}

// Aplica las migraciones pendientes (idempotentes: CREATE TABLE IF NOT EXISTS).
pub fn (d &Db) migrate() !int {
	d.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(80) NOT NULL PRIMARY KEY, applied_at DATETIME NOT NULL) ENGINE=InnoDB')!
	mut applied := 0
	for i, f in ddl_files {
		ver := 'ddl-${i + 1:03}'
		have := d.scalar('SELECT COUNT(*) FROM schema_migrations WHERE version=${q(ver)}')!.int()
		if have > 0 {
			continue
		}
		// una sentencia por CREATE TABLE (separadas por ';')
		for stmt in f.to_string().split(';\n') {
			mut lines := []string{}
			for ln in stmt.split('\n') {
				if !ln.trim_space().starts_with('--') {
					lines << ln
				}
			}
			s := lines.join('\n').trim_space()
			if s == '' {
				continue
			}
			d.exec(s)!
		}
		d.exec('INSERT INTO schema_migrations VALUES (${q(ver)}, ${q(now_dt())})')!
		applied++
	}
	return applied
}
