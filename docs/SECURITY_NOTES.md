# Security Notes

## Riesgos actuales

- PocketBase sigue siendo un proceso embebido con admin UI sensible.
- Hay scripts legacy con credenciales y puertos hardcodeados para desarrollo.
- OneSignal y SMTP requieren secretos externos para un despliegue serio.

## Recomendaciones

- no exponer `/_/` sin controles de acceso de red
- usar HTTPS obligatorio en produccion
- rotar credenciales admin por entorno
- migrar secretos a variables de entorno o secret manager
- revisar y depurar scripts legacy antes de un entorno productivo
- mantener backups verificados de `pb/pb_data`
