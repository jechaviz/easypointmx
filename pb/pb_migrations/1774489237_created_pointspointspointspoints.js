/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "vpa3hhzxjuzx2k2",
    "created": "2026-03-26 01:40:37.162Z",
    "updated": "2026-03-26 01:40:37.162Z",
    "name": "pointspointspointspoints",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "u58cfyta",
        "name": "fieldnameaddress",
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
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("vpa3hhzxjuzx2k2");

  return dao.deleteCollection(collection);
})
