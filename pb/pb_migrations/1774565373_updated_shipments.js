/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ylqzg18wwud37mj")

  // remove
  collection.schema.removeField("6q1f0fga")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vwyyojy6",
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
    "id": "6q1f0fga",
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
  collection.schema.removeField("vwyyojy6")

  return dao.saveCollection(collection)
})
