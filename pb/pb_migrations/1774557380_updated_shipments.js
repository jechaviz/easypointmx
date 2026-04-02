/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ylqzg18wwud37mj")

  // remove
  collection.schema.removeField("typyjx4r")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "etkliwau",
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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ylqzg18wwud37mj")

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

  // remove
  collection.schema.removeField("etkliwau")

  return dao.saveCollection(collection)
})
