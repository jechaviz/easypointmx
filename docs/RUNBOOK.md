# Runbook

## 1. Levantar entorno local

```powershell
node scripts/local-stack.mjs serve
```

Resultado esperado:

- PocketBase en `127.0.0.1:8091`
- Web en `127.0.0.1:3041`
- `runtime-config.generated.js` actualizado
- proxy same-origin disponible en `http://127.0.0.1:3041/api`

## 2. Validar salud

```powershell
Invoke-WebRequest http://127.0.0.1:8091/api/health
Invoke-WebRequest http://127.0.0.1:3041/health
Invoke-WebRequest http://127.0.0.1:3041/api/health
```

## 3. Ejecutar smoke test

```powershell
node scripts/local-stack.mjs smoke
```

## 4. Cambiar puertos

```powershell
$env:PB_PORT='8095'
$env:WEB_PORT='3050'
node scripts/local-stack.mjs serve
```

## 5. Override manual de runtime

Crear archivo local:

```powershell
Copy-Item runtime-config.local.example.js runtime-config.local.js
```

Ejemplo:

```js
window.EASYPOINT_RUNTIME_CONFIG = Object.assign(
  {},
  window.EASYPOINT_RUNTIME_CONFIG || {},
  {
    pocketBaseUrl: 'http://127.0.0.1:3050'
  }
);
```

## 6. Troubleshooting

`Port already in use`

- cambia `PB_PORT` o `WEB_PORT`
- vuelve a correr `node scripts/local-stack.mjs serve`

`Smoke test falla en API`

- confirma `http://127.0.0.1:<PB_PORT>/api/health`
- revisa que `runtime-config.local.js` no este apuntando a otro backend

`Sitio abre pero pega al backend incorrecto`

- revisa `runtime-config.generated.js`
- revisa `runtime-config.local.js`
- recuerda que `runtime-config.local.js` tiene prioridad final
- valida que `pocketBaseUrl` apunte al host web cuando quieras usar proxy same-origin

`Hooks de push rompen altas`

- por defecto no deben romper si OneSignal no esta configurado
- si activas push, valida `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY` y `ONESIGNAL_ENABLED`
