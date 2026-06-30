/// <reference path="../pb_data/types.d.ts" />

// audit_log: bitácora de auditoría (quién hizo qué sobre qué colección/registro).
// Lectura/borrado solo admin; cualquier staff autenticado puede crear entradas.
migrate((db) => {
  const dao = new Dao(db)

  const audit = new Collection({
    "id": "auditlog1234567",
    "name": "audit_log",
    "type": "base",
    "system": false,
    "schema": [
      { "id": "aulactor00", "name": "actor", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "aulaction0", "name": "action", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "aulcoll000", "name": "target_collection", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "aultarget0", "name": "target_id", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "auldetail0", "name": "detail", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } }
    ],
    "indexes": [],
    "listRule": "@request.auth.role = 'admin'",
    "viewRule": "@request.auth.role = 'admin'",
    "createRule": "@request.auth.id != ''",
    "updateRule": null,
    "deleteRule": "@request.auth.role = 'admin'",
    "options": {}
  })
  dao.saveCollection(audit)
}, (db) => {
  const dao = new Dao(db)
  try { dao.deleteCollection(dao.findCollectionByNameOrId("auditlog1234567")) } catch (e) {}
})
