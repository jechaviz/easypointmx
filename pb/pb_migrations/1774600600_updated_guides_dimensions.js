/// <reference path="../pb_data/types.d.ts" />

// Dimensiones del paquete para guias (peso volumetrico).
// Tarifa cobrable = max(peso real, peso volumetrico = L*An*Al / 5000).
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("shipping_guides")

  collection.schema.addField(new SchemaField({
    "system": false, "id": "sglength0", "name": "length_cm", "type": "number",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": 0, "max": null, "noDecimal": false }
  }))
  collection.schema.addField(new SchemaField({
    "system": false, "id": "sgwidth00", "name": "width_cm", "type": "number",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": 0, "max": null, "noDecimal": false }
  }))
  collection.schema.addField(new SchemaField({
    "system": false, "id": "sgheight0", "name": "height_cm", "type": "number",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": 0, "max": null, "noDecimal": false }
  }))

  dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("shipping_guides")
  collection.schema.removeField("sglength0")
  collection.schema.removeField("sgwidth00")
  collection.schema.removeField("sgheight0")
  dao.saveCollection(collection)
})
