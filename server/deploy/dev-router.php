<?php
// Router para `php -S` (prueba local de la cadena real: PHP → shim → binario CGI).
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
if (preg_match('#^/api(/|$)#', $path)) { require __DIR__ . '/shim.php'; return true; }
return false; // archivos estáticos
