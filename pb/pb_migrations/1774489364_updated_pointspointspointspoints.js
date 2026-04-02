/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vpa3hhzxjuzx2k2")

  collection.name = "pointspoints"

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "utnzszt5",
    "name": "address",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tz2xfnjk",
    "name": "field",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "u58cfyta",
    "name": "namename",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vpa3hhzxjuzx2k2")

  collection.name = "pointspointspointspoints"

  // remove
  collection.schema.removeField("utnzszt5")

  // remove
  collection.schema.removeField("tz2xfnjk")

  // update
  collection.schema.addField(new SchemaField({
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
  }))

  return dao.saveCollection(collection)
})
