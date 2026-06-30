/// <reference path="../pb_data/types.d.ts" />

// Proveedores de excursiones (terceros que Easypoint comisiona via fee).
// - providers: catalogo admin-only (nombre/whatsapp/email/fee_rate/active)
// - excursions: provider_id (liga la excursion a su proveedor)
migrate((db) => {
  const dao = new Dao(db)

  // providers: catalogo de proveedores (solo admin)
  const providers = new Collection({
    "id": "providers123456",
    "name": "providers",
    "type": "base",
    "system": false,
    "schema": [
      { "id": "prname000", "name": "name", "type": "text", "required": true, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "prwa000000", "name": "whatsapp", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "premail000", "name": "email", "type": "email", "required": false, "options": { "exceptDomains": null, "onlyDomains": null } },
      { "id": "prfee00000", "name": "fee_rate", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "practive00", "name": "active", "type": "bool", "required": false, "options": {} }
    ],
    "indexes": [],
    "listRule": "@request.auth.role = 'admin'",
    "viewRule": "@request.auth.role = 'admin'",
    "createRule": "@request.auth.role = 'admin'",
    "updateRule": "@request.auth.role = 'admin'",
    "deleteRule": "@request.auth.role = 'admin'",
    "options": {}
  })
  dao.saveCollection(providers)

  // excursions: liga a proveedor
  const exc = dao.findCollectionByNameOrId("excursions")
  exc.schema.addField(new SchemaField({
    "system": false, "id": "exprovid00", "name": "provider_id", "type": "text",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": null, "max": null, "pattern": "" }
  }))
  dao.saveCollection(exc)
}, (db) => {
  const dao = new Dao(db)

  const exc = dao.findCollectionByNameOrId("excursions")
  exc.schema.removeField("exprovid00")
  dao.saveCollection(exc)

  try { dao.deleteCollection(dao.findCollectionByNameOrId("providers123456")) } catch (e) {}
})
