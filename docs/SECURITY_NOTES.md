# Security Notes

## Estado de las reglas API (PocketBase)

Endurecidas en la migracion `pb/pb_migrations/1774600000_harden_api_rules.js`:

| Coleccion              | list/view            | create          | update          | delete |
|------------------------|----------------------|-----------------|-----------------|--------|
| `points`               | publico (mapa)       | admin           | admin           | admin  |
| `partner_applications` | admin \| sales       | publico (forms) | admin \| sales  | admin  |
| `shipments`            | staff autenticado    | staff           | staff           | admin  |
| `commissions`          | admin                | admin           | admin           | admin  |
| `invoices`             | admin                | admin           | admin           | (none) |
| `system_settings`      | publico (login lee `test_mode`) | admin | admin     | (none) |

- El rastreo publico de paquetes pasa por `GET /api/track/:code`
  (`pb/pb_hooks/track.pb.js`), que devuelve solo estado y punto, nunca PII del
  destinatario. `shipments` ya no es listable de forma anonima.
- El login demo (`DEMO_USERS` / `DEMO_PWDS`) se gatea con `allowDemoAuth`
  (runtime-config). Sin definir: solo activo en localhost y `*.github.io`.

## Riesgos pendientes

- **`pb/pb_data/data.db` versionado y como fuente de verdad del esquema.** Las
  migraciones en `pb/pb_migrations/` estan corruptas (nombres de campo basura,
  relaciones a la coleccion equivocada, ops sobre colecciones abandonadas), por
  lo que un rebuild desde cero NO produce el esquema correcto. Antes de dejar de
  versionar `data.db` hay que regenerar migraciones limpias desde el esquema
  vivo (`pocketbase migrate collections` / export del admin UI). Mientras tanto,
  `data.db` puede contener PII de solicitantes; trata el repo como sensible.
- PocketBase sigue siendo un proceso embebido con admin UI `/_/` sensible.
- OneSignal y SMTP requieren secretos externos para un despliegue serio.

## Recomendaciones

- no exponer `/_/` sin controles de acceso de red
- usar HTTPS obligatorio en produccion
- en produccion fijar `allowDemoAuth: false` en runtime-config
- regenerar migraciones limpias y luego sacar `data.db` del control de versiones
- rotar credenciales admin por entorno
- migrar secretos a variables de entorno o secret manager
- revisar y depurar scripts legacy antes de un entorno productivo
- mantener backups verificados de `pb/pb_data`
