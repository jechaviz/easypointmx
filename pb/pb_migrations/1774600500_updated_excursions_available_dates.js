/// <reference path="../pb_data/types.d.ts" />

// El proveedor de excursiones publica una lista de FECHAS disponibles por
// destino; el cliente elige entre esas fechas (no una fecha libre).
// Se guardan como texto (una fecha YYYY-MM-DD por linea / separadas por coma).
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("excursions")

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "exdates00",
    "name": "available_dates",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": { "min": null, "max": null, "pattern": "" }
  }))

  dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("excursions")
  collection.schema.removeField("exdates00")
  dao.saveCollection(collection)
})
