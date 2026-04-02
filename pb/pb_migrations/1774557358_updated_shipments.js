/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ylqzg18wwud37mj")

  // remove
  collection.schema.removeField("nanirh8p")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "typyjx4r",
    "name": "point_id",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "vpa3hhzxjuzx2k2",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
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
        "in_transit",
        "at_point",
        "delivered"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ylqzg18wwud37mj")

  // add
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

  // remove
  collection.schema.removeField("typyjx4r")

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

  return dao.saveCollection(collection)
})
