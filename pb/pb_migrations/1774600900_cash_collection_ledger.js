/// <reference path="../pb_data/types.d.ts" />

// Cobranza en efectivo de abonos (varias partes):
//  cliente abona en el PUNTO (efectivo) -> el punto retiene el dinero y gana
//  comisión -> el CHOFER recolecta periódicamente el NETO (monto − comisión del
//  punto) -> lo marca ENTREGADO al administrador.
//
// - points.commission_rate: % que retiene el dueño del punto sobre lo cobrado
// - payments: libro de abonos con ciclo held_at_point -> collected -> delivered
migrate((db) => {
  const dao = new Dao(db)

  // Comisión del punto (porcentaje)
  const points = dao.findCollectionByNameOrId("points")
  points.schema.addField(new SchemaField({
    "system": false, "id": "commrate0", "name": "commission_rate", "type": "number",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": 0, "max": 100, "noDecimal": false }
  }))
  dao.saveCollection(points)

  // Libro de pagos / abonos
  const payments = new Collection({
    "id": "payments1234567",
    "name": "payments",
    "type": "base",
    "system": false,
    "schema": [
      { "id": "pykind000", "name": "kind", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["excursion", "guide"] } },
      { "id": "pyref0000", "name": "ref", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "pylabel00", "name": "label", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "pypoint00", "name": "point_id", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "pypointnm", "name": "point_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "pyamount0", "name": "amount", "type": "number", "required": true, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "pycommiss", "name": "commission", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "pynet0000", "name": "net", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "pymethod0", "name": "method", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["cash", "card", "transfer"] } },
      { "id": "pystatus0", "name": "status", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["held_at_point", "collected", "delivered"] } },
      { "id": "pycollby0", "name": "collected_by", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "pycollat0", "name": "collected_at", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "pydelivat", "name": "delivered_at", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } }
    ],
    "indexes": [],
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.role = 'admin'",
    "options": {}
  })
  dao.saveCollection(payments)
}, (db) => {
  const dao = new Dao(db)
  const points = dao.findCollectionByNameOrId("points")
  points.schema.removeField("commrate0")
  dao.saveCollection(points)
  try { dao.deleteCollection(dao.findCollectionByNameOrId("payments1234567")) } catch (e) {}
})
