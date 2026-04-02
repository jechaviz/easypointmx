/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "2ndz043iwj2jsto",
    "created": "2026-03-26 04:36:04.978Z",
    "updated": "2026-03-26 04:36:04.978Z",
    "name": "tracking_alertstracking_alerts",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "3a87bhmc",
        "name": "tracking_id",
        "type": "text",
        "required": false,
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
    "createRule": "",
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("2ndz043iwj2jsto");

  return dao.deleteCollection(collection);
})
