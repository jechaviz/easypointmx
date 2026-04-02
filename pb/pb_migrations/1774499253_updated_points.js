/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vpa3hhzxjuzx2k2")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "idknph2f",
    "name": "whatsapp",
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
    "id": "gq5oo9cq",
    "name": "maps_url",
    "type": "url",
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
  const collection = dao.findCollectionByNameOrId("vpa3hhzxjuzx2k2")

  // remove
  collection.schema.removeField("idknph2f")

  // remove
  collection.schema.removeField("gq5oo9cq")

  return dao.saveCollection(collection)
})
