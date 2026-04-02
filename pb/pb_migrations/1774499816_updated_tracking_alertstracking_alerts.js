/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("2ndz043iwj2jsto")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "btszwpps",
    "name": "email",
    "type": "email",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "exceptDomains": null,
      "onlyDomains": null
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("2ndz043iwj2jsto")

  // remove
  collection.schema.removeField("btszwpps")

  return dao.saveCollection(collection)
})
