/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("zerfiamqkdg7m6c");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "zerfiamqkdg7m6c",
    "created": "2026-03-26 01:46:09.557Z",
    "updated": "2026-03-26 01:46:37.147Z",
    "name": "shipments",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "0tstzozf",
        "name": "status",
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
        "id": "am8zyjv9",
        "name": "point_id",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "pending",
            "in_tranpending",
            "sit",
            "ready_for_pickup",
            "deliveredin_transit",
            "ready_for_pickup",
            "delivered"
          ]
        }
      },
      {
        "system": false,
        "id": "gbhctbl1",
        "name": "fieldpoint_id",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
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
