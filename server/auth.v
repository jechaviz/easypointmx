module main

import crypto.bcrypt
import crypto.hmac
import crypto.sha256
import encoding.base64
import time
import x.json2

pub struct User {
pub:
	id          i64
	email       string
	name        string
	role        string
	point_id    i64
	provider_id i64
	phone       string
}

fn hash_password(plain string) string {
	cost := env_or('EP_BCRYPT_COST', '10').int()
	return bcrypt.generate_from_password(plain.bytes(), cost) or { '' }
}

fn verify_password(plain string, hash string) bool {
	if hash == '' {
		return false
	}
	bcrypt.compare_hash_and_password(plain.bytes(), hash.bytes()) or { return false }
	return true
}

fn b64url(data []u8) string {
	return base64.url_encode(data).trim_right('=')
}

fn pad_b64(s string) string {
	rem := s.len % 4
	if rem == 0 {
		return s
	}
	return s + '='.repeat(4 - rem)
}

// JWT HS256 sin estado: el servidor CGI no guarda sesiones entre peticiones.
fn jwt_mint(secret string, uid i64, role string, ttl_s i64) string {
	header := b64url('{"alg":"HS256","typ":"JWT"}'.bytes())
	exp := time.now().unix() + ttl_s
	payload := b64url('{"uid":${uid},"role":${jstr(role)},"exp":${exp}}'.bytes())
	signing := '${header}.${payload}'
	sig := hmac.new(secret.bytes(), signing.bytes(), sha256.sum, sha256.block_size)
	return '${signing}.${b64url(sig)}'
}

// Devuelve el uid si firma y expiración son válidas; 0 si no.
fn jwt_verify(secret string, token string) i64 {
	parts := token.split('.')
	if parts.len != 3 {
		return 0
	}
	signing := '${parts[0]}.${parts[1]}'
	expected := b64url(hmac.new(secret.bytes(), signing.bytes(), sha256.sum, sha256.block_size))
	if !hmac.equal(expected.bytes(), parts[2].bytes()) {
		return 0
	}
	raw := base64.url_decode_str(pad_b64(parts[1]))
	obj := json2.decode[json2.Any](raw) or { return 0 }
	m := obj.as_map()
	exp := (m['exp'] or { json2.Any(0) }).i64()
	if exp != 0 && time.now().unix() >= exp {
		return 0
	}
	return (m['uid'] or { json2.Any(0) }).i64()
}

fn row_user(r Row) User {
	return User{
		id:          r['id'].i64()
		email:       r['email']
		name:        r['name']
		role:        r['role']
		point_id:    r['point_id'].i64()
		provider_id: r['provider_id'].i64()
		phone:       r['phone']
	}
}

// Usuario autenticado de la petición (re-lee la fila: roles y bajas aplican al instante).
fn (a &App) auth(r &Req) ?User {
	tok := bearer(r)
	if tok == '' {
		return none
	}
	uid := jwt_verify(a.tsec(), tok)
	if uid <= 0 {
		return none
	}
	row := a.db.one('SELECT id,email,name,role,point_id,provider_id,phone FROM users WHERE id=${uid} AND active=1 LIMIT 1') or {
		return none
	}
	if row.len == 0 {
		return none
	}
	return row_user(row)
}

fn (u User) is(roles ...string) bool {
	return u.role in roles
}

// Límite de tasa por IP + clave (ventana fija). Devuelve true si se excede.
fn (a &App) limited(r &Req, bucket string, limit int, window_s int) bool {
	now := time.now().unix()
	key := '${bucket}:${r.ip}'
	row := a.db.one('SELECT hits, window_start FROM rate_limits WHERE bucket=${q(key)}') or { return false }
	if row.len == 0 || now - row['window_start'].i64() >= window_s {
		a.db.exec('INSERT INTO rate_limits (bucket,hits,window_start) VALUES (${q(key)},1,${now}) ON DUPLICATE KEY UPDATE hits=1, window_start=${now}') or {}
		return false
	}
	if row['hits'].int() >= limit {
		return true
	}
	a.db.exec('UPDATE rate_limits SET hits=hits+1 WHERE bucket=${q(key)}') or {}
	return false
}

// Límite sólo sobre fallos: consulta sin incrementar.
fn (a &App) over_limit(r &Req, bucket string, limit int, window_s int) bool {
	now := time.now().unix()
	row := a.db.one('SELECT hits, window_start FROM rate_limits WHERE bucket=${q('${bucket}:${r.ip}')}') or { return false }
	if row.len == 0 || now - row['window_start'].i64() >= window_s {
		return false
	}
	return row['hits'].int() >= limit
}

// Registra un fallo en el bucket (abre la ventana si no existe).
fn (a &App) hit(r &Req, bucket string, window_s int) {
	now := time.now().unix()
	key := q('${bucket}:${r.ip}')
	a.db.exec('INSERT INTO rate_limits (bucket,hits,window_start) VALUES (${key},1,${now}) ON DUPLICATE KEY UPDATE hits = IF(${now} - window_start >= ${window_s}, 1, hits + 1), window_start = IF(${now} - window_start >= ${window_s}, ${now}, window_start)') or {}
}

fn (a &App) audit(actor string, action string, target string, target_id i64, detail string) {
	a.db.insert('audit_log', {
		'actor':     actor
		'action':    action
		'target':    target
		'target_id': target_id.str()
		'detail':    detail
	}) or {}
}
