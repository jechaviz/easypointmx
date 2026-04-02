/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "dydhq8hvzagcc1m",
    "created": "2026-03-26 01:55:00.090Z",
    "updated": "2026-03-26 01:55:00.090Z",
    "name": "partner_applications",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "2rpvxhlg",
        "name": "fieldbusiness_namebusiness_name",
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
        "id": "ii5gh8st",
        "name": "fieldcontact_phone",
        "type": "text",
        "required": false,
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
        "id": "2imnn6zh",
        "name": "field",
        "type": "email",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "exceptDomains": null,
          "onlyDomains": null
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
  const collection = dao.findCollectionByNameOrId("dydhq8hvzagcc1m");

  return dao.deleteCollection(collection);
})
