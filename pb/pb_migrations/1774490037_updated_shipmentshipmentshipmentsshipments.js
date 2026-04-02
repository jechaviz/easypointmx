/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ylqzg18wwud37mj")

  collection.name = "shipments"

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "acvzx1vf",
    "name": "tracking_id",
    "type": "text",
    "required": true,
    "presentable": true,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hw292ne9",
    "name": "status",
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
  }))

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nanirh8p",
    "name": "point_id",
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
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ylqzg18wwud37mj")

  collection.name = "shipmentshipmentshipmentsshipments"

  // update
  collection.schema.addField(new SchemaField({
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
  }))

  // update
  collection.schema.addField(new SchemaField({
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
  }))

  // update
  collection.schema.addField(new SchemaField({
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
  }))

  return dao.saveCollection(collection)
})
