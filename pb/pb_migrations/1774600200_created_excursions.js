/// <reference path="../pb_data/types.d.ts" />

// Catalogo de excursiones turisticas que Easypoint cobra y administra.
// Lectura publica (los clientes lo navegan en el sitio); escritura solo admin.
migrate((db) => {
  const collection = new Collection({
    "id": "excursions12345",
    "name": "excursions",
    "type": "base",
    "system": false,
    "schema": [
      { "id": "exname000", "name": "name", "type": "text", "required": true, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "exdest000", "name": "destination", "type": "text", "required": true, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "exdesc000", "name": "description", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "exprice00", "name": "price", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "exdurat00", "name": "duration", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "exprovnm0", "name": "provider_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "exprovwa0", "name": "provider_whatsapp", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "eximgurl0", "name": "image_url", "type": "url", "required": false, "options": { "exceptDomains": null, "onlyDomains": null } },
      { "id": "exmaxcap0", "name": "max_capacity", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": true } },
      { "id": "exactive0", "name": "active", "type": "bool", "required": false, "options": {} }
    ],
    "indexes": [],
    "listRule": "",
    "viewRule": "",
    "createRule": "@request.auth.role = 'admin'",
    "updateRule": "@request.auth.role = 'admin'",
    "deleteRule": "@request.auth.role = 'admin'",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("excursions12345");
  return dao.deleteCollection(collection);
})
