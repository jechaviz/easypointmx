/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("2vtkx8yw2gyfpdo");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "2vtkx8yw2gyfpdo",
    "created": "2026-03-26 01:48:18.765Z",
    "updated": "2026-03-26 01:48:18.765Z",
    "name": "shipmentsshipshipments",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "ssfmyiut",
        "name": "fieldtracking_idtracking_id",
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
        "id": "vco4rdah",
        "name": "field",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "tracking_id"
          ]
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
})
