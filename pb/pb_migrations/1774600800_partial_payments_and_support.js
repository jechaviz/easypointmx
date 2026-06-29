/// <reference path="../pb_data/types.d.ts" />

// Pagos parciales (apartado) + embudo de quejas.
// - excursions: deposit_amount (apartado definido por el proveedor) + policy
// - excursion_bookings: amount_paid + balance; payment_status ampliado
//   (pending/partial/paid/failed/refunded/credit)
// - shipping_guides: payment_status ampliado (uniformidad)
// - support_tickets: tickets privados de queja/soporte (create público, lectura admin)
migrate((db) => {
  const dao = new Dao(db)
  const PAY_VALUES = ["pending", "partial", "paid", "failed", "refunded", "credit"]

  // excursions: apartado + política
  const exc = dao.findCollectionByNameOrId("excursions")
  exc.schema.addField(new SchemaField({
    "system": false, "id": "exdeposit", "name": "deposit_amount", "type": "number",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": 0, "max": null, "noDecimal": false }
  }))
  exc.schema.addField(new SchemaField({
    "system": false, "id": "expolicy0", "name": "policy", "type": "text",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": null, "max": null, "pattern": "" }
  }))
  dao.saveCollection(exc)

  // excursion_bookings: abonos + saldo + estado de pago ampliado
  const bk = dao.findCollectionByNameOrId("excursion_bookings")
  bk.schema.addField(new SchemaField({
    "system": false, "id": "amtpaid00", "name": "amount_paid", "type": "number",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": 0, "max": null, "noDecimal": false }
  }))
  bk.schema.addField(new SchemaField({
    "system": false, "id": "balance00", "name": "balance", "type": "number",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": null, "max": null, "noDecimal": false }
  }))
  bk.schema.removeField("paystatus")
  bk.schema.addField(new SchemaField({
    "system": false, "id": "paystatus", "name": "payment_status", "type": "select",
    "required": false, "presentable": false, "unique": false,
    "options": { "maxSelect": 1, "values": PAY_VALUES }
  }))
  dao.saveCollection(bk)

  // shipping_guides: estado de pago ampliado
  const gd = dao.findCollectionByNameOrId("shipping_guides")
  gd.schema.removeField("paystatus")
  gd.schema.addField(new SchemaField({
    "system": false, "id": "paystatus", "name": "payment_status", "type": "select",
    "required": false, "presentable": false, "unique": false,
    "options": { "maxSelect": 1, "values": PAY_VALUES }
  }))
  dao.saveCollection(gd)

  // support_tickets: embudo de quejas/soporte privado
  const tickets = new Collection({
    "id": "tickets12345678",
    "name": "support_tickets",
    "type": "base",
    "system": false,
    "schema": [
      { "id": "tkkind000", "name": "kind", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["complaint", "question", "refund_request", "other"] } },
      { "id": "tksubref0", "name": "subject_ref", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "tkname000", "name": "customer_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "tkphone00", "name": "customer_phone", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "tkemail00", "name": "customer_email", "type": "email", "required": false, "options": { "exceptDomains": null, "onlyDomains": null } },
      { "id": "tkmsg0000", "name": "message", "type": "text", "required": true, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "tkstatus0", "name": "status", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["open", "in_progress", "resolved", "escalated"] } },
      { "id": "tkresol00", "name": "resolution", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } }
    ],
    "indexes": [],
    "listRule": "@request.auth.role = 'admin'",
    "viewRule": "@request.auth.role = 'admin'",
    "createRule": "",
    "updateRule": "@request.auth.role = 'admin'",
    "deleteRule": "@request.auth.role = 'admin'",
    "options": {}
  })
  dao.saveCollection(tickets)
}, (db) => {
  const dao = new Dao(db)
  const OLD_PAY = ["pending", "paid", "failed", "refunded"]

  const exc = dao.findCollectionByNameOrId("excursions")
  exc.schema.removeField("exdeposit")
  exc.schema.removeField("expolicy0")
  dao.saveCollection(exc)

  const bk = dao.findCollectionByNameOrId("excursion_bookings")
  bk.schema.removeField("amtpaid00")
  bk.schema.removeField("balance00")
  bk.schema.removeField("paystatus")
  bk.schema.addField(new SchemaField({
    "system": false, "id": "paystatus", "name": "payment_status", "type": "select",
    "required": false, "options": { "maxSelect": 1, "values": OLD_PAY }
  }))
  dao.saveCollection(bk)

  const gd = dao.findCollectionByNameOrId("shipping_guides")
  gd.schema.removeField("paystatus")
  gd.schema.addField(new SchemaField({
    "system": false, "id": "paystatus", "name": "payment_status", "type": "select",
    "required": false, "options": { "maxSelect": 1, "values": OLD_PAY }
  }))
  dao.saveCollection(gd)

  try { dao.deleteCollection(dao.findCollectionByNameOrId("tickets12345678")) } catch (e) {}
})
