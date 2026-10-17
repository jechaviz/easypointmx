<?php
declare(strict_types=1);

/**
 * Easypoint · shim PHP. Es lo ÚNICO en PHP dentro de la ruta de una petición: ejecuta el binario CGI
 * compilado desde V y retransmite su respuesta. No contiene lógica de negocio.
 *
 * Configuración (constantes o variables de entorno del host; los secretos viven FUERA del docroot):
 *   EP_BIN        ruta del binario            (~/apps/easypoint/shared/bin/easypoint)
 *   EP_ENV_FILE   archivo KEY=VALUE con secretos: EP_DB_*, EP_JWT_SECRET, MERCADOPAGO_ACCESS_TOKEN, ...
 *   EP_BASE_PATH  prefijo de despliegue         (p. ej. /easypoint cuando vive en un subdirectorio)
 */

$home = getenv('HOME') ?: '';
$bin  = getenv('EP_BIN') ?: $home . '/apps/easypoint/shared/bin/easypoint';
$envf = getenv('EP_ENV_FILE') ?: $home . '/apps/easypoint/shared/env/easypoint.env';
$base = getenv('EP_BASE_PATH') ?: '';

function fail(int $code, string $message): never {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'backend_unavailable', 'message' => $message, 'status' => $code]);
    exit;
}

function load_env_file(string $path): array {
    $out = [];
    if (!is_readable($path)) return $out;
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $out[trim($k)] = trim($v, " \t\"'");
    }
    return $out;
}

if (!is_executable($bin)) fail(500, 'Binario no disponible.');

// Entorno del proceso: sistema + variables CGI de la petición + secretos del servidor.
$env = [];
foreach (getenv() as $k => $v) if (is_string($v)) $env[$k] = $v;
foreach ($_SERVER as $k => $v) if (is_string($v)) $env[$k] = $v;
$env['GATEWAY_INTERFACE'] = 'CGI/1.1';
$env['EP_BASE_PATH'] = $base;
$env['EP_ENV_FILE'] = $envf;
if (!isset($env['HTTP_AUTHORIZATION']) && function_exists('getallheaders')) {
    foreach (getallheaders() as $hk => $hv) {
        if (strcasecmp($hk, 'Authorization') === 0) $env['HTTP_AUTHORIZATION'] = $hv;
        if (strcasecmp($hk, 'X-API-Key') === 0) $env['HTTP_X_API_KEY'] = $hv;
    }
}

$body = file_get_contents('php://input') ?: '';
$env['CONTENT_LENGTH'] = (string) strlen($body);

$proc = proc_open($bin, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, null, $env);
if (!is_resource($proc)) fail(502, 'No se pudo iniciar el backend.');
if ($body !== '') fwrite($pipes[0], $body);
fclose($pipes[0]);
$out = stream_get_contents($pipes[1]) ?: '';
fclose($pipes[1]);
$err = stream_get_contents($pipes[2]) ?: '';
fclose($pipes[2]);
$code = proc_close($proc);

if ($out === '') fail(502, 'Respuesta vacía del backend' . ($code !== 0 ? " (salida $code)" : '') . ($err !== '' ? ': ' . substr($err, 0, 200) : ''));

[$head, $payload] = array_pad(preg_split("/\r\n\r\n|\n\n/", $out, 2), 2, '');
foreach (preg_split("/\r\n|\n/", $head) as $line) {
    if ($line === '') continue;
    if (stripos($line, 'Status:') === 0) { http_response_code((int) trim(substr($line, 7))); continue; }
    header($line, false);
}
echo $payload;
