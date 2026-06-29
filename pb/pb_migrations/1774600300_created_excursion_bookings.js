/// <reference path="../pb_data/types.d.ts" />

// Reservaciones de excursiones turisticas.
// Create publico (reservacion online desde el sitio); el resto solo admin.
// `created` actua como fecha de reserva. La confirmacion al cliente / proveedor /
// admin se hace por WhatsApp (deep links wa.me) + push al admin (services.pb.js).
migrate((db) => {
  const collection = new Collection({
    "id": "exbookings12345",
    "name": "excursion_bookings",
    "type": "base",
    "system": false,
    "schema": [
      { "id": "ebexcref0", "name": "excursion_ref", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "ebexcnm00", "name": "excursion_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "ebdest000", "name": "destination", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "ebcustnm0", "name": "customer_name", "type": "text", "required": true, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "ebcustph0", "name": "customer_phone", "type": "text", "required": true, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "ebcustem0", "name": "customer_email", "type": "email", "required": false, "options": { "exceptDomains": null, "onlyDomains": null } },
      { "id": "ebpeople0", "name": "people", "type": "number", "required": false, "options": { "min": 1, "max": null, "noDecimal": true } },
      { "id": "ebexcdt00", "name": "excursion_date", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "ebtotal00", "name": "total", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "ebstatus0", "name": "status", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["new", "confirmed", "cancelled", "completed"] } },
      { "id": "ebchannel0", "name": "confirmed_channel", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "ebnotes00", "name": "notes", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } }
    ],
    "indexes": [],
    "listRule": "@request.auth.role = 'admin'",
    "viewRule": "@request.auth.role = 'admin'",
    "createRule": "",
    "updateRule": "@request.auth.role = 'admin'",
    "deleteRule": "@request.auth.role = 'admin'",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("exbookings12345");
  return dao.deleteCollection(collection);
})
