# Backups

## Crear backup

```powershell
node scripts/pb-backup.mjs
```

Opcionalmente puedes pasar un nombre:

```powershell
node scripts/pb-backup.mjs before-upgrade
```

Los backups quedan en `pb/backups/<nombre>`.

## Restaurar backup

Restaura el ultimo backup:

```powershell
node scripts/pb-restore.mjs
```

Restaura uno especifico:

```powershell
node scripts/pb-restore.mjs pb/backups/before-upgrade
```

## Notas

- Deten PocketBase antes de restaurar.
- El restore guarda una copia previa en `pb/pb_data.pre_restore_<timestamp>`.
- No edites backups manualmente.
