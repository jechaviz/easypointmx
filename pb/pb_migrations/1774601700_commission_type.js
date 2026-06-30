/// <reference path="../pb_data/types.d.ts" />

// La comisión puede ser PORCENTAJE o CANTIDAD FIJA por producto (p.ej. tarifa
// por peso/medidas en paquetería). Se añade el tipo + el monto fijo a puntos y
// proveedores; los campos de porcentaje existentes (commission_rate / fee_rate)
// se conservan.
migrate((db) => {
  const dao = new Dao(db)

  const points = dao.findCollectionByNameOrId("points")
  points.schema.addField(new SchemaField({
    "system": false, "id": "ptcommtyp", "name": "commission_type", "type": "select",
    "required": false, "presentable": false, "unique": false,
    "options": { "maxSelect": 1, "values": ["percent", "fixed"] }
  }))
  points.schema.addField(new SchemaField({
    "system": false, "id": "ptcommamt", "name": "commission_amount", "type": "number",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": 0, "max": null, "noDecimal": false }
  }))
  dao.saveCollection(points)

  const providers = dao.findCollectionByNameOrId("providers")
  providers.schema.addField(new SchemaField({
    "system": false, "id": "prfeetype", "name": "fee_type", "type": "select",
    "required": false, "presentable": false, "unique": false,
    "options": { "maxSelect": 1, "values": ["percent", "fixed"] }
  }))
  providers.schema.addField(new SchemaField({
    "system": false, "id": "prfeeamt0", "name": "fee_amount", "type": "number",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": 0, "max": null, "noDecimal": false }
  }))
  dao.saveCollection(providers)
}, (db) => {
  const dao = new Dao(db)
  const points = dao.findCollectionByNameOrId("points")
  points.schema.removeField("ptcommtyp")
  points.schema.removeField("ptcommamt")
  dao.saveCollection(points)
  const providers = dao.findCollectionByNameOrId("providers")
  providers.schema.removeField("prfeetype")
  providers.schema.removeField("prfeeamt0")
  dao.saveCollection(providers)
})
