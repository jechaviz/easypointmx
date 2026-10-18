module main

import net.http
import os
import sync

// Servidor standalone para desarrollo y pruebas: API + sitio estático (website/, app/).
// No se compila en la build de producción (-d cgi).

struct Standalone {
mut:
	app &App
	mu  &sync.Mutex
}

const mime_types = {
	'.html':        'text/html; charset=utf-8'
	'.js':          'text/javascript; charset=utf-8'
	'.mjs':         'text/javascript; charset=utf-8'
	'.css':         'text/css; charset=utf-8'
	'.json':        'application/json'
	'.png':         'image/png'
	'.jpg':         'image/jpeg'
	'.jpeg':        'image/jpeg'
	'.webp':        'image/webp'
	'.svg':         'image/svg+xml'
	'.ico':         'image/x-icon'
	'.webmanifest': 'application/manifest+json'
	'.vue':         'text/plain; charset=utf-8'
	'.txt':         'text/plain; charset=utf-8'
}

fn (mut h Standalone) handle(req http.Request) http.Response {
	url := req.url
	path := url.all_before('?')
	qs := if url.contains('?') { url.all_after('?') } else { '' }
	if path in ['/demo', '/app', '/website'] {
		// las rutas relativas (../shared) sólo funcionan con la barra final
		return http.new_response(
			status: .moved_permanently
			header: http.new_header(key: .location, value: path + '/')
		)
	}
	mut hdr := map[string]string{}
	hdr['authorization'] = req.header.get(.authorization) or { '' }
	hdr['content-type'] = req.header.get(.content_type) or { '' }
	hdr['x-api-key'] = req.header.get_custom('X-API-Key') or { '' }
	hdr['x-ep-demo'] = req.header.get_custom('X-EP-Demo') or { '' }
	mut r := Req{
		method:  req.method.str().to_upper()
		path:    normalize_path(url_decode(path), '')
		query:   parse_query(qs)
		body:    req.data
		headers: hdr
		ip:      req.remote_addr.all_before_last(':')
	}
	if r.path.starts_with('/easypoint/') || r.path == '/easypoint' {
		r = Req{
			...r
			path: normalize_path(r.path['/easypoint'.len..], '')
		}
	}
	if r.path.starts_with('/api/') || r.path == '/api' {
		h.mu.lock()
		resp := handle_safe(mut h.app, &r)
		h.mu.unlock()
		return to_http(resp)
	}
	return h.static_file(r.path)
}

fn to_http(r Resp) http.Response {
	mut hd := http.new_header()
	for k, v in r.headers {
		hd.add_custom(k, v) or {}
	}
	return http.new_response(
		status: unsafe { http.Status(r.status) }
		header: hd
		body:   r.body
	)
}

fn (mut h Standalone) static_file(path string) http.Response {
	root := h.app.web_root
	mut p := path
	if p == '/' || p == '' {
		return http.new_response(
			status: .found
			header: http.new_header(key: .location, value: '/website/')
		)
	}
	if p == '/runtime-config.generated.js' || p == '/runtime-config.js' {
		return text_response('window.EASYPOINT_RUNTIME_CONFIG=Object.assign({},window.EASYPOINT_RUNTIME_CONFIG||{},{apiBase:"/api"});', '.js')
	}
	if p == '/runtime-config.local.js' {
		return text_response('', '.js')
	}
	if p.ends_with('/') {
		p += 'index.html'
	}
	if p.contains('..') {
		return http.new_response(status: .forbidden, body: 'forbidden')
	}
	mut full := os.join_path(root, p)
	if os.is_dir(full) {
		full = os.join_path(full, 'index.html')
	}
	if !os.exists(full) {
		// SPA: rutas sin extensión caen al index de su sección
		if !p.contains('.') {
			for sec in ['/website', '/app', '/demo'] {
				if p.starts_with(sec) {
					full = os.join_path(root, sec, 'index.html')
				}
			}
		}
		if !os.exists(full) {
			return http.new_response(status: .not_found, body: 'not found')
		}
	}
	data := os.read_file(full) or { return http.new_response(status: .not_found, body: 'not found') }
	ext := os.file_ext(full)
	return text_response(data, ext)
}

fn text_response(body string, ext string) http.Response {
	mut hd := http.new_header()
	hd.add_custom('Content-Type', mime_types[ext] or { 'application/octet-stream' }) or {}
	hd.add_custom('Cache-Control', 'no-cache') or {}
	return http.new_response(status: .ok, header: hd, body: body)
}

fn serve_standalone(mut app App, port int) {
	if app.web_root == '' {
		app.web_root = os.dir(os.dir(os.executable()))
	}
	app.db.migrate() or {}
	app.seed_config()
	mut s := http.Server{
		addr:    ':${port}'
		handler: Standalone{
			app: app
			mu:  sync.new_mutex()
		}
	}
	println('Easypoint en http://127.0.0.1:${port}/  (web: ${app.web_root})')
	s.listen_and_serve()
}
