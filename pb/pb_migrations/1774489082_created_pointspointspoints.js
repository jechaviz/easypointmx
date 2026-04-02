/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "bf5f8jo4td9m4oe",
    "created": "2026-03-26 01:38:02.310Z",
    "updated": "2026-03-26 01:38:02.310Z",
    "name": "pointspointspoints",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "q2eghbuz",
        "name": "namenamenamenamename",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "e9x3kcpq",
        "name": "fieldaddressaddressaddress",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("bf5f8jo4td9m4oe");

  return dao.deleteCollection(collection);
})
