module main

// Build de producción (-d cgi): sin pila HTTP/SSL en el binario.
fn serve_standalone(mut app App, port int) {
	eprintln('--serve no está disponible en la build CGI')
}
