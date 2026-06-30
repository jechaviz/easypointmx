/// <reference path="../pb_data/types.d.ts" />

// Plan de abonos + recordatorios.
// El cliente elige cómo planea pagar (semanal / quincenal / fechas específicas)
// y si quiere recordatorios por correo o WhatsApp. Se genera el calendario
// (reminder_dates) y un cron envía los avisos pendientes.
migrate((db) => {
  const dao = new Dao(db)
  const bk = dao.findCollectionByNameOrId("excursion_bookings")

  bk.schema.addField(new SchemaField({
    "system": false, "id": "rmoptin00", "name": "reminder_optin", "type": "bool",
    "required": false, "presentable": false, "unique": false, "options": {}
  }))
  bk.schema.addField(new SchemaField({
    "system": false, "id": "rmcadence", "name": "reminder_cadence", "type": "select",
    "required": false, "presentable": false, "unique": false,
    "options": { "maxSelect": 1, "values": ["weekly", "biweekly", "custom"] }
  }))
  bk.schema.addField(new SchemaField({
    "system": false, "id": "rmchannel", "name": "reminder_channel", "type": "select",
    "required": false, "presentable": false, "unique": false,
    "options": { "maxSelect": 1, "values": ["email", "whatsapp", "both"] }
  }))
  bk.schema.addField(new SchemaField({
    "system": false, "id": "rmdates000", "name": "reminder_dates", "type": "text",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": null, "max": null, "pattern": "" }
  }))
  bk.schema.addField(new SchemaField({
    "system": false, "id": "rmsent0000", "name": "reminders_sent", "type": "text",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": null, "max": null, "pattern": "" }
  }))

  dao.saveCollection(bk)
}, (db) => {
  const dao = new Dao(db)
  const bk = dao.findCollectionByNameOrId("excursion_bookings")
  bk.schema.removeField("rmoptin00")
  bk.schema.removeField("rmcadence")
  bk.schema.removeField("rmchannel")
  bk.schema.removeField("rmdates000")
  bk.schema.removeField("rmsent0000")
  dao.saveCollection(bk)
})
