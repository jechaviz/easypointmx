/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ylqzg18wwud37mj")

  // remove
  collection.schema.removeField("etkliwau")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dhzaiqcm",
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

  // remove
  collection.schema.removeField("dhzaiqcm")

  return dao.saveCollection(collection)
})
