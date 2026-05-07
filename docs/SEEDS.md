# Seeds

## Dev seed

Genera datos utiles para desarrollo manual:

```powershell
node scripts/pb-seed-dev.mjs
```

Defaults:

- `PB_URL=http://127.0.0.1:8091`
- `PB_ADMIN_EMAIL=admin@easypoint.mx`
- `PB_ADMIN_PASSWORD=easypoint123`

## Smoke seed

Genera un dataset minimo para chequeos rapidos:

```powershell
node scripts/pb-seed-smoke.mjs
```

## Recomendacion

- Usa `pb-seed-dev.mjs` para demos locales y QA manual.
- Usa `pb-seed-smoke.mjs` cuando necesites poblar un backend vacio con el minimo necesario.
