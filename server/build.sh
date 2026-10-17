#!/usr/bin/env bash
# Transpila el backend de Easypoint a un solo bundle C portable (Linux). El servidor compila con gcc:
#   -d cgi    : sin net.http (sin pila SSL en el binario)
#   -os linux : se genera desde Windows
#   -gc none  : sin Boehm; seguro para procesos CGI de vida corta
# Salida en dist/: easypoint.c + cabeceras vendorizadas.
# En el servidor:  gcc -w -O2 -std=gnu11 easypoint.c -o easypoint -lpthread -lm
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
V_BIN="${V_BIN:-/c/git/v/v.exe}"
V_ROOT="$(dirname "$V_BIN")"
DIST="$DIR/dist"
OUT="$DIST/easypoint.c"
rm -rf "$DIST" 2>/dev/null || true; mkdir -p "$DIST"
node "$DIR/../scripts/gen-schema.mjs"
"$V_BIN" -d cgi -os linux -gc none -o "$OUT" "$DIR"
# El fork de V emite rutas ABSOLUTAS de Windows a sus cabeceras (v_recover.h, track_heap_checks.h...):
# se vendorizan junto al C y se reescriben como relativas, para compilar en el servidor sin V.
grep -o '#include "[A-Za-z]:/[^"]*"' "$OUT" | sed 's/#include "\(.*\)"/\1/' | sort -u | while read -r f; do
  drive="$(echo "${f:0:1}" | tr 'A-Z' 'a-z')"
  src="/${drive}${f:2}"
  if [ -f "$src" ]; then cp "$src" "$DIST/$(basename "$f")"; else echo "[build] AVISO: no existe $src"; fi
done
sed -i 's#"[A-Za-z]:/[^"]*/\([^"/]*\)"#"\1"#g' "$OUT"
# Terceros por ruta relativa (cJSON/sqlite/atomics), si el C los incluyera
for f in $(grep -o '#include "[^"]*thirdparty[^"]*"' "$OUT" | sed 's/#include "\(.*\)"/\1/' | sort -u); do
  b="$(basename "$f")"; src="$(find "$V_ROOT/thirdparty" -name "$b" | head -1)"
  [ -n "$src" ] && cp "$src" "$DIST/$b"
  sed -i "s#\"[^\"]*$b\"#\"$b\"#g" "$OUT"
done
echo "[build] $(wc -l < "$OUT") lineas de C en $OUT"
ls -la "$DIST"
echo "[build] en el servidor: gcc -w -O2 -std=gnu11 easypoint.c -o easypoint -lpthread -lm"
