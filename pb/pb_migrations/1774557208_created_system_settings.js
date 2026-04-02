/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "qozk7ulvszthzyd",
    "created": "2026-03-26 20:33:28.394Z",
    "updated": "2026-03-26 20:33:28.394Z",
    "name": "system_settings",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "qajoylnj",
        "name": "test_mode",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [],
    "listRule": "",
    "viewRule": "",
    "createRule": "@request.auth.role = 'admin'",
    "updateRule": "@request.auth.role = 'admin'",
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("qozk7ulvszthzyd");

  return dao.deleteCollection(collection);
})
