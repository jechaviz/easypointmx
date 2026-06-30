/// <reference path="../pb_data/types.d.ts" />

// Redondeo en la recolección (sin cambio): el chofer recolecta un monto
// redondeado (±$10, una decena). La diferencia vs. el neto se guarda en
// `rounding` (signo +: débito = cobró de más; signo −: crédito = cobró de menos)
// y el efectivo real en `collected_amount`.
migrate((db) => {
  const dao = new Dao(db)
  const c = dao.findCollectionByNameOrId("payments")
  c.schema.addField(new SchemaField({
    "system": false, "id": "pycollamt", "name": "collected_amount", "type": "number",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": 0, "max": null, "noDecimal": false }
  }))
  c.schema.addField(new SchemaField({
    "system": false, "id": "pyround00", "name": "rounding", "type": "number",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": null, "max": null, "noDecimal": false }
  }))
  dao.saveCollection(c)
}, (db) => {
  const dao = new Dao(db)
  const c = dao.findCollectionByNameOrId("payments")
  c.schema.removeField("pycollamt")
  c.schema.removeField("pyround00")
  dao.saveCollection(c)
})
