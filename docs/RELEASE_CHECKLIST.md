# Release Checklist

- correr `node scripts/local-stack.mjs smoke`
- revisar `node scripts/pb-check.mjs`
- tomar backup con `node scripts/pb-backup.mjs`
- confirmar `runtime-config.local.js` no se va a publicar
- revisar `docs/DESIGN_PRINCIPLES.md` antes de aprobar cambios visibles
- confirmar que claims de cobertura, volumen, marcas, conversion o costos tienen fuente verificable
- confirmar que no hay QR, logos, metricas o estados operativos simulados en pantallas publicas
- validar navegacion sin slash final (`/website`, `/app`) y rutas SPA profundas
- validar login admin, operador y tracking publico
- validar formularios de partner application
- validar formularios B2B contra PocketBase o CRM real, sin estados de exito simulados
- validar teclado, Escape en modales, foco visible y textos de error en formularios
- validar `/_/` y `/api/health` en el entorno final
- confirmar secretos SMTP/OneSignal fuera de git
