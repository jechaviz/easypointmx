module main

import os
import strings
import x.json2

#include <unistd.h>

fn C.read(fd int, buf voidptr, count usize) int

pub struct Req {
pub mut:
	method  string
	path    string
	query   map[string]string
	body    string
	headers map[string]string
	ip      string
}

pub struct Resp {
pub:
	status  int = 200
	headers map[string]string
	body    string
}

pub fn json_ok(body string) Resp {
	return Resp{
		status:  200
		headers: {
			'Content-Type': 'application/json; charset=utf-8'
			'Cache-Control': 'no-store'
		}
		body:    body
	}
}

pub fn json_status(status int, body string) Resp {
	return Resp{
		status:  status
		headers: {
			'Content-Type': 'application/json; charset=utf-8'
			'Cache-Control': 'no-store'
		}
		body:    body
	}
}

pub fn fail(status int, msg string) Resp {
	return json_status(status, '{"error":${jstr(msg)},"status":${status}}')
}

pub fn fail_code(status int, code string, msg string) Resp {
	return json_status(status, '{"error":${jstr(code)},"message":${jstr(msg)},"status":${status}}')
}

// CGI: el shim PHP espera "Status:" + cabeceras + línea en blanco + cuerpo.
pub fn (r Resp) send_cgi() {
	print('Status: ${r.status}\r\n')
	mut has_ct := false
	for k, v in r.headers {
		print('${k}: ${v}\r\n')
		if k.to_lower() == 'content-type' {
			has_ct = true
		}
	}
	if !has_ct {
		print('Content-Type: application/json\r\n')
	}
	print('\r\n')
	print(r.body)
}

fn read_stdin(limit int) string {
	mut data := []u8{}
	mut buf := []u8{len: 8192}
	for {
		n := C.read(0, buf.data, usize(8192))
		if n <= 0 {
			break
		}
		data << buf[..n]
		if data.len > limit {
			break
		}
	}
	return data.bytestr()
}

fn hex_val(c u8) int {
	if c >= `0` && c <= `9` {
		return int(c - `0`)
	}
	if c >= `a` && c <= `f` {
		return int(c - `a`) + 10
	}
	if c >= `A` && c <= `F` {
		return int(c - `A`) + 10
	}
	return -1
}

pub fn url_decode(s string) string {
	mut o := []u8{cap: s.len}
	mut i := 0
	for i < s.len {
		c := s[i]
		if c == `+` {
			o << ` `
		} else if c == `%` && i + 2 < s.len + 0 && i + 2 <= s.len - 1 + 0 {
			h := hex_val(s[i + 1])
			l := hex_val(s[i + 2])
			if h >= 0 && l >= 0 {
				o << u8(h * 16 + l)
				i += 3
				continue
			}
			o << c
		} else {
			o << c
		}
		i++
	}
	return o.bytestr()
}

pub fn parse_query(qs string) map[string]string {
	mut m := map[string]string{}
	if qs == '' {
		return m
	}
	for pair in qs.split('&') {
		if pair == '' {
			continue
		}
		kv := pair.split_nth('=', 2)
		k := url_decode(kv[0])
		m[k] = if kv.len == 2 { url_decode(kv[1]) } else { '' }
	}
	return m
}

// Normaliza la ruta: quita prefijo de despliegue (EP_BASE_PATH) y barra final.
pub fn normalize_path(p string, base string) string {
	mut path := p
	if base != '' && path.starts_with(base) {
		path = path[base.len..]
	}
	if path.len > 1 && path.ends_with('/') {
		path = path[..path.len - 1]
	}
	if path == '' {
		path = '/'
	}
	return path
}

pub fn parse_cgi_request(base string) Req {
	uri := os.getenv('REQUEST_URI')
	mut qs := os.getenv('QUERY_STRING')
	mut path := uri
	if uri.contains('?') {
		path = uri.all_before('?')
		if qs == '' {
			qs = uri.all_after('?')
		}
	}
	clen := os.getenv('CONTENT_LENGTH').int()
	mut body := ''
	if clen > 0 {
		body = read_stdin(2_000_000)
	}
	mut h := map[string]string{}
	h['authorization'] = os.getenv('HTTP_AUTHORIZATION')
	h['content-type'] = os.getenv('CONTENT_TYPE')
	h['x-forwarded-for'] = os.getenv('HTTP_X_FORWARDED_FOR')
	h['x-webhook-signature'] = os.getenv('HTTP_X_WEBHOOK_SIGNATURE')
	h['x-api-key'] = os.getenv('HTTP_X_API_KEY')
	h['x-ep-demo'] = os.getenv('HTTP_X_EP_DEMO')
	mut ip := os.getenv('REMOTE_ADDR')
	if os.getenv('EP_TRUST_PROXY') == '1' && h['x-forwarded-for'] != '' {
		ip = h['x-forwarded-for'].all_before(',').trim_space()
	}
	return Req{
		method:  os.getenv('REQUEST_METHOD').to_upper()
		path:    normalize_path(url_decode(path), base)
		query:   parse_query(qs)
		body:    body
		headers: h
		ip:      ip
	}
}

// ── cuerpo JSON plano → mapa de strings ─────────────────────────────────────
// Escalares → texto; booleanos → '1'/'0'; arreglos/objetos → su JSON.
pub fn body_map(r &Req) map[string]string {
	mut out := map[string]string{}
	if r.body.trim_space() == '' {
		return out
	}
	any_ := json2.decode[json2.Any](r.body) or { return out }
	m := any_.as_map()
	for k, v in m {
		out[k] = any_to_text(v)
	}
	return out
}

fn any_to_text(v json2.Any) string {
	return match v {
		string { v }
		bool { if v { '1' } else { '0' } }
		int, i64, u64 { v.str() }
		f32 {
			fmt_num(f64(v))
		}
		f64 {
			fmt_num(v)
		}
		json2.Null { '' }
		else { v.json_str() }
	}
}

// Valor de la petición: cuerpo primero, luego query string.
pub fn (r &Req) arg(b map[string]string, k string) string {
	if k in b {
		return b[k]
	}
	return r.query[k] or { '' }
}

pub fn bearer(r &Req) string {
	a := r.headers['authorization'] or { '' }
	if a.to_lower().starts_with('bearer ') {
		return a[7..].trim_space()
	}
	return ''
}

// ── Filas → JSON con tipos por columna ──────────────────────────────────────
pub fn (s &Schema) row_json(r Row) string {
	mut o := strings.new_builder(256)
	o.write_u8(`{`)
	mut first := true
	for k, v in r {
		if !first {
			o.write_u8(`,`)
		}
		first = false
		kind := s.name_kind(k)
		key := if k.starts_with('n_') || k.starts_with('b_') { k[2..] } else { k }
		o.write_string(jstr(key))
		o.write_u8(`:`)
		match kind {
			'num' {
				o.write_string(if v == '' { '0' } else { qn(v) })
			}
			'bool' {
				o.write_string(if v == '1' || v == 'true' { 'true' } else { 'false' })
			}
			'dt' {
				if v == '' {
					o.write_string('null')
				} else {
					o.write_string(jstr(v))
				}
			}
			else {
				o.write_string(jstr(v))
			}
		}
	}
	o.write_u8(`}`)
	return o.str()
}

pub fn (s &Schema) rows_json(rs []Row) string {
	mut o := strings.new_builder(rs.len * 200 + 2)
	o.write_u8(`[`)
	for i, r in rs {
		if i > 0 {
			o.write_u8(`,`)
		}
		o.write_string(s.row_json(r))
	}
	o.write_u8(`]`)
	return o.str()
}

// 1.0 → "1" (los números JSON llegan como f64)
fn fmt_num(x f64) string {
	if x == f64(i64(x)) {
		return i64(x).str()
	}
	return x.str()
}
