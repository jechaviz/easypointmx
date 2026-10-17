module main

import os

// Entrega de mensajes sin librerías de red en el binario CGI:
//  - correo: `sendmail -t` del host (cPanel lo trae); sin él → 'skipped'
//  - WhatsApp: API de la nube vía `curl` si hay credenciales; si no → 'manual' (enlace wa.me en la bandeja)

fn send_email(to string, subject string, body string) string {
	mode := env_or('EP_MAIL', 'sendmail')
	if mode == 'off' {
		return 'skipped'
	}
	bin := env_or('EP_SENDMAIL', '/usr/sbin/sendmail')
	if !os.exists(bin) {
		return 'skipped'
	}
	from := env_or('EP_MAIL_FROM', 'Easypoint <no-reply@easypoint.mx>')
	msg := 'From: ${from}\nTo: ${to}\nSubject: =?UTF-8?B?${b64_text(subject)}?=\nMIME-Version: 1.0\nContent-Type: text/plain; charset=UTF-8\nContent-Transfer-Encoding: 8bit\n\n${body}\n\nEasypoint · Tus compras y tus aventuras, cerca de ti.\n'
	tmp := os.join_path(os.temp_dir(), 'ep_mail_${rand_token(6)}.eml')
	os.write_file(tmp, msg) or { return 'failed' }
	res := os.execute('${bin} -t -i < "${tmp}"')
	os.rm(tmp) or {}
	return if res.exit_code == 0 { 'sent' } else { 'failed' }
}

fn send_whatsapp(to string, body string) string {
	url := env_or('WHATSAPP_API_URL', '')
	tok := env_or('WHATSAPP_API_TOKEN', '')
	if url == '' || tok == '' {
		return 'manual'
	}
	payload := '{"to":"52${to}","text":${jstr(body)}}'
	tmp := os.join_path(os.temp_dir(), 'ep_wa_${rand_token(6)}.json')
	os.write_file(tmp, payload) or { return 'failed' }
	res := os.execute('curl -s -m 15 -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${tok}" --data-binary @"${tmp}" "${url}"')
	os.rm(tmp) or {}
	code := res.output.trim_space().int()
	return if res.exit_code == 0 && code >= 200 && code < 300 { 'sent' } else { 'failed' }
}

fn b64_text(s string) string {
	// base64 mínimo (RFC 2047) sin depender de más módulos
	tbl := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	b := s.bytes()
	mut out := []u8{}
	mut i := 0
	for i < b.len {
		n := b.len - i
		v0 := int(b[i])
		v1 := if n > 1 { int(b[i + 1]) } else { 0 }
		v2 := if n > 2 { int(b[i + 2]) } else { 0 }
		trip := (v0 << 16) | (v1 << 8) | v2
		out << tbl[(trip >> 18) & 63]
		out << tbl[(trip >> 12) & 63]
		out << if n > 1 { tbl[(trip >> 6) & 63] } else { `=` }
		out << if n > 2 { tbl[trip & 63] } else { `=` }
		i += 3
	}
	return out.bytestr()
}

// Checkout de Mercado Pago por curl (sin SSL en el binario). Devuelve (url, id) o error.
fn mp_create_preference(token string, title string, amount f64, ext_ref string, back_url string, notify_url string) !(string, string) {
	payload := '{"items":[{"title":${jstr(title)},"quantity":1,"currency_id":"MXN","unit_price":${amount:.2f}}],"external_reference":${jstr(ext_ref)},"back_urls":{"success":${jstr(back_url)},"pending":${jstr(back_url)},"failure":${jstr(back_url)}},"notification_url":${jstr(notify_url)},"auto_return":"approved"}'
	tmp := os.join_path(os.temp_dir(), 'ep_mp_${rand_token(6)}.json')
	os.write_file(tmp, payload)!
	res := os.execute('curl -s -m 20 -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" --data-binary @"${tmp}" https://api.mercadopago.com/checkout/preferences')
	os.rm(tmp) or {}
	if res.exit_code != 0 {
		return error('mp_unreachable')
	}
	out := res.output
	init_point := json_field(out, 'init_point')
	id := json_field(out, 'id')
	if init_point == '' {
		return error('mp_rejected')
	}
	return init_point, id
}

fn mp_payment_status(token string, payment_id string) !(string, string, f64) {
	res := os.execute('curl -s -m 15 -H "Authorization: Bearer ${token}" https://api.mercadopago.com/v1/payments/${digits_only(payment_id)}')
	if res.exit_code != 0 {
		return error('mp_unreachable')
	}
	st := json_field(res.output, 'status')
	ext := json_field(res.output, 'external_reference')
	amt := json_field(res.output, 'transaction_amount').f64()
	return st, ext, amt
}

// Extractor mínimo de un campo escalar de primer nivel (suficiente para respuestas de pasarela).
fn json_field(js string, key string) string {
	needle := '"${key}":'
	idx := js.index(needle) or { return '' }
	mut rest := js[idx + needle.len..].trim_left(' ')
	if rest.starts_with('"') {
		rest = rest[1..]
		end := rest.index('"') or { return '' }
		return rest[..end]
	}
	mut end := 0
	for end < rest.len && rest[end] != `,` && rest[end] != `}` {
		end++
	}
	return rest[..end].trim_space()
}
