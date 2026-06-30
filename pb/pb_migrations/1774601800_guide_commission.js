/// <reference path="../pb_data/types.d.ts" />

// Comisión de guía por tramos de peso/medidas (auto-calculada) + punto vendedor,
// para que la venta de guías fluya al libro de cobranza como las excursiones.
migrate((db) => {
  const dao = new Dao(db)
  const g = dao.findCollectionByNameOrId("shipping_guides")
  g.schema.addField(new SchemaField({
    "system": false, "id": "sgcommiss", "name": "commission", "type": "number",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": 0, "max": null, "noDecimal": false }
  }))
  g.schema.addField(new SchemaField({
    "system": false, "id": "sgpointid", "name": "point_id", "type": "text",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": null, "max": null, "pattern": "" }
  }))
  dao.saveCollection(g)
}, (db) => {
  const dao = new Dao(db)
  const g = dao.findCollectionByNameOrId("shipping_guides")
  g.schema.removeField("sgcommiss")
  g.schema.removeField("sgpointid")
  dao.saveCollection(g)
})
