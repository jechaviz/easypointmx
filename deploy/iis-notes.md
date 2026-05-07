# IIS Notes

- publica `app/server.mjs` detras de un servicio Node estable
- expone PocketBase en un puerto interno separado
- enruta `/api/*` y `/_/*` a PocketBase
- enruta el resto al servicio Node de Easypoint
- mantén HTTPS, compresion y logs en IIS
