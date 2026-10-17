module main

import os

// Estado de proceso (en CGI vive una sola petición). La configuración del negocio (ep_config) se
// carga perezosamente una vez por petición.
pub struct App {
pub mut:
	db       &Db
	schema   &Schema
	secret   string
	base     string
	demo     bool // pagos simulados (payments.mode=demo)
	cfgcache map[string]string
	cfgload  bool
	keyset   map[string]map[string]bool
	keys_on  bool
	web_root string
}

pub fn new_app() !&App {
	schema := load_schema()
	cfg := DbCfg{
		host: env_or('EP_DB_HOST', '127.0.0.1')
		port: env_or('EP_DB_PORT', '3306')
		name: env_or('EP_DB_NAME', 'easypoint')
		user: env_or('EP_DB_USER', 'ep')
		pass: env_or('EP_DB_PASS', '')
		bin:  env_or('EP_MARIADB_BIN', '/usr/bin/mariadb')
	}
	db := &Db{
		cfg:    cfg
		schema: schema
	}
	secret := env_or('EP_JWT_SECRET', '')
	if secret == '' {
		return error('EP_JWT_SECRET requerido')
	}
	return &App{
		db:       db
		schema:   schema
		secret:   secret
		base:     env_or('EP_BASE_PATH', '')
		web_root: env_or('EP_WEB_ROOT', '')
	}
}

pub fn env_or(k string, d string) string {
	v := os.getenv(k)
	if v == '' {
		return d
	}
	return v
}

// Carga un archivo de entorno KEY=VALUE (secretos fuera del docroot) hacia el proceso.
pub fn load_env_file(path string) {
	content := os.read_file(path) or { return }
	for line in content.split_into_lines() {
		l := line.trim_space()
		if l == '' || l.starts_with('#') || !l.contains('=') {
			continue
		}
		kv := l.split_nth('=', 2)
		os.setenv(kv[0].trim_space(), kv[1].trim_space().trim('"\''), true)
	}
}

// ── ep_config ───────────────────────────────────────────────────────────────
fn (mut a App) load_cfg() {
	if a.cfgload {
		return
	}
	a.cfgload = true
	rs := a.db.rows('SELECT ckey, cvalue FROM ep_config') or { return }
	for r in rs {
		a.cfgcache[r['ckey']] = r['cvalue']
	}
}

fn (mut a App) cfg(key string, def string) string {
	a.load_cfg()
	return a.cfgcache[key] or { def }
}

fn (mut a App) cfg_f(key string, def f64) f64 {
	a.load_cfg()
	v := a.cfgcache[key] or { return def }
	if v == '' {
		return def
	}
	return v.f64()
}

fn (mut a App) cfg_i(key string, def int) int {
	return int(a.cfg_f(key, f64(def)))
}

fn (mut a App) cfg_b(key string, def bool) bool {
	a.load_cfg()
	v := a.cfgcache[key] or { return def }
	return v == 'true' || v == '1'
}

fn (mut a App) set_cfg(key string, value string) {
	a.db.exec('INSERT INTO ep_config (ckey, cvalue) VALUES (${q(key)}, ${q(value)}) ON DUPLICATE KEY UPDATE cvalue=VALUES(cvalue)') or {}
	a.cfgcache[key] = value
}

fn (mut a App) app_url() string {
	u := env_or('EASYPOINT_APP_URL', a.cfg('brand.url', 'https://easypoint.mx'))
	return u.trim_right('/')
}
