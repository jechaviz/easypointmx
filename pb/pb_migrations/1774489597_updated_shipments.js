/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("zerfiamqkdg7m6c")

  // update
  collection.schema.addField(new SchemaField({
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
  }))

  // update
  collection.schema.addField(new SchemaField({
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
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("zerfiamqkdg7m6c")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "0tstzozf",
    "name": "fieldtracking_id",
    "type": "text",
    "required": true,
    "presentable": false,
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
    "id": "am8zyjv9",
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

  return dao.saveCollection(collection)
})
