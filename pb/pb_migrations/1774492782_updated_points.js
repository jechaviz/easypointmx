/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vpa3hhzxjuzx2k2")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "t6hfw2jv",
    "name": "lat",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8uotkq8d",
    "name": "lng",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vpa3hhzxjuzx2k2")

  // remove
  collection.schema.removeField("t6hfw2jv")

  // remove
  collection.schema.removeField("8uotkq8d")

  return dao.saveCollection(collection)
})
