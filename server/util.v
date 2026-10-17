module main

import time
import math
import crypto.rand as crand
import strings

// ── tiempo (todo en UTC) ────────────────────────────────────────────────────
fn now_dt() string {
	return time.utc().format_ss()
}

fn today() string {
	return now_dt()[..10]
}

fn add_days(d string, n int) string {
	t := time.parse(d[..10] + ' 00:00:00') or { return d }
	return time.unix(t.unix() + i64(n) * 86400).format_ss()[..10]
}

fn days_between(a string, b string) int {
	ta := time.parse(a[..10] + ' 00:00:00') or { return 0 }
	tb := time.parse(b[..10] + ' 00:00:00') or { return 0 }
	return int((tb.unix() - ta.unix()) / 86400)
}

fn add_hours_dt(dt string, h int) string {
	t := time.parse(dt) or { return dt }
	return time.unix(t.unix() + i64(h) * 3600).format_ss()
}

fn add_months_dt(dt string, m int) string {
	t := time.parse(dt) or { return dt }
	// aprox. 30.4375 días/mes: suficiente para vigencias de crédito
	return time.unix(t.unix() + i64(f64(m) * 30.4375 * 86400.0)).format_ss()
}

fn hours_since_dt(dt string) f64 {
	t := time.parse(dt) or { return 0 }
	return f64(time.utc().unix() - t.unix()) / 3600.0
}

fn is_date(s string) bool {
	if s.len != 10 || s[4] != `-` || s[7] != `-` {
		return false
	}
	for i, c in s {
		if i == 4 || i == 7 {
			continue
		}
		if c < `0` || c > `9` {
			return false
		}
	}
	return true
}

// ── números / dinero ────────────────────────────────────────────────────────
fn round2(x f64) f64 {
	return math.round(x * 100.0) / 100.0
}

fn num(s string) f64 {
	return s.f64()
}

fn fmt_money(x f64) string {
	r := round2(x)
	s := '${r:.2f}'
	if s.ends_with('.00') {
		return s[..s.len - 3]
	}
	return s
}

fn mxn(x f64) string {
	whole := i64(math.round(x))
	mut digits := whole.str()
	mut out := ''
	mut cnt := 0
	for i := digits.len - 1; i >= 0; i-- {
		out = digits[i].ascii_str() + out
		cnt++
		if cnt % 3 == 0 && i > 0 && digits[i - 1] != `-` {
			out = ',' + out
		}
	}
	return '\$' + out + ' MXN'
}

// ── ids / textos ────────────────────────────────────────────────────────────
const alnum = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

fn rand_code(n int) string {
	b := crand.bytes(n) or { return time.now().unix_milli().str() }
	mut s := strings.new_builder(n)
	for x in b {
		s.write_u8(alnum[int(x) % alnum.len])
	}
	return s.str()
}

fn rand_token(n int) string {
	b := crand.bytes(n) or { return time.now().unix_milli().str() }
	mut s := strings.new_builder(n * 2)
	for x in b {
		s.write_string('${x:02x}')
	}
	return s.str()
}

fn digits_only(s string) string {
	mut o := strings.new_builder(s.len)
	for c in s {
		if c >= `0` && c <= `9` {
			o.write_u8(c)
		}
	}
	return o.str()
}

// Teléfono normalizado a los últimos 10 dígitos (clave del CRM).
fn phone10(p string) string {
	d := digits_only(p)
	if d.len > 10 {
		return d[d.len - 10..]
	}
	return d
}

fn wa_link(phone string, text string) string {
	mut d := digits_only(phone)
	if d.len == 10 {
		d = '52' + d
	}
	if d.len < 11 {
		return ''
	}
	if text == '' {
		return 'https://wa.me/${d}'
	}
	return 'https://wa.me/${d}?text=${url_encode(text)}'
}

fn url_encode(s string) string {
	mut o := strings.new_builder(s.len * 2)
	for c in s {
		if (c >= `a` && c <= `z`) || (c >= `A` && c <= `Z`) || (c >= `0` && c <= `9`) || c == `-` || c == `_`
			|| c == `.` || c == `~` {
			o.write_u8(c)
		} else {
			o.write_string('%${c:02X}')
		}
	}
	return o.str()
}

fn is_email(s string) bool {
	return s.contains('@') && s.contains('.') && s.len >= 6 && !s.contains(' ')
}

// Escapa un string como literal JSON.
fn jstr(s string) string {
	mut o := strings.new_builder(s.len + 2)
	o.write_u8(`"`)
	for c in s {
		match c {
			`"` { o.write_string('\\"') }
			`\\` { o.write_string('\\\\') }
			`\n` { o.write_string('\\n') }
			`\r` { o.write_string('\\r') }
			`\t` { o.write_string('\\t') }
			else {
				if c < 0x20 {
					o.write_string('\\u00${c:02x}')
				} else {
					o.write_u8(c)
				}
			}
		}
	}
	o.write_u8(`"`)
	return o.str()
}

fn contains_any(hay string, needles []string) bool {
	l := hay.to_lower()
	for n in needles {
		if l.contains(n) {
			return true
		}
	}
	return false
}
