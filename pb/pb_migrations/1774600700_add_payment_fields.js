/// <reference path="../pb_data/types.d.ts" />

// Campos de pago (pasarela) para reservas de excursiones y guías.
// payment_status: pending | paid | failed | refunded
// payment_method: mercadopago | stripe | cash | transfer | ...
// payment_ref:    id/referencia de la pasarela
// paid_at:        fecha/hora de pago
migrate((db) => {
  const dao = new Dao(db)

  const addPaymentFields = (collName) => {
    const c = dao.findCollectionByNameOrId(collName)
    c.schema.addField(new SchemaField({
      "system": false, "id": "paystatus", "name": "payment_status", "type": "select",
      "required": false, "presentable": false, "unique": false,
      "options": { "maxSelect": 1, "values": ["pending", "paid", "failed", "refunded"] }
    }))
    c.schema.addField(new SchemaField({
      "system": false, "id": "paymethod", "name": "payment_method", "type": "text",
      "required": false, "presentable": false, "unique": false,
      "options": { "min": null, "max": null, "pattern": "" }
    }))
    c.schema.addField(new SchemaField({
      "system": false, "id": "payref000", "name": "payment_ref", "type": "text",
      "required": false, "presentable": false, "unique": false,
      "options": { "min": null, "max": null, "pattern": "" }
    }))
    c.schema.addField(new SchemaField({
      "system": false, "id": "paidat000", "name": "paid_at", "type": "text",
      "required": false, "presentable": false, "unique": false,
      "options": { "min": null, "max": null, "pattern": "" }
    }))
    dao.saveCollection(c)
  }

  addPaymentFields("excursion_bookings")
  addPaymentFields("shipping_guides")
}, (db) => {
  const dao = new Dao(db)
  const dropPaymentFields = (collName) => {
    const c = dao.findCollectionByNameOrId(collName)
    c.schema.removeField("paystatus")
    c.schema.removeField("paymethod")
    c.schema.removeField("payref000")
    c.schema.removeField("paidat000")
    dao.saveCollection(c)
  }
  dropPaymentFields("excursion_bookings")
  dropPaymentFields("shipping_guides")
})
