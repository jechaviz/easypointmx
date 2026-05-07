# Deployment

## Modelo recomendado

- `app/server.mjs` sirve `website/` y `app/`.
- PocketBase corre como proceso separado.
- Un reverse proxy publica un solo host y mantiene la API same-origin.

## Rutas esperadas

- `/website/` -> web comercial
- `/app/` -> panel operativo
- `/api/` -> PocketBase API
- `/_/` -> PocketBase admin UI

## Baseline

- Web app Node: puerto interno `3033`
- PocketBase: puerto interno `8090`
- Reverse proxy frontal: `80/443`

## Archivos incluidos

- `deploy/nginx.easypoint.conf`
- `deploy/iis-notes.md`

## Checklist minimo

- habilitar HTTPS
- proteger admin UI `/_/`
- mover secretos SMTP y OneSignal fuera del repo
- programar backups de `pb/pb_data`
- correr `node scripts/local-stack.mjs smoke` antes de publicar
