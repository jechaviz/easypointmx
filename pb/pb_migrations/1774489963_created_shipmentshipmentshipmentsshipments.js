/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "ylqzg18wwud37mj",
    "created": "2026-03-26 01:52:43.649Z",
    "updated": "2026-03-26 01:52:43.649Z",
    "name": "shipmentshipmentshipmentsshipments",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "acvzx1vf",
        "name": "fieldtracking_itracking_id",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "hw292ne9",
        "name": "fieldstatusstatus",
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
        "id": "nanirh8p",
        "name": "fieldstatuspoint_id",
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
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("ylqzg18wwud37mj");

  return dao.deleteCollection(collection);
})
