/// <reference path="../pb_data/types.d.ts" />

// Venta de guias de paqueteria (convenio DHL / Estafeta).
// Las guias las vende el staff (operador en punto / admin); no hay create
// anonimo. El cotizador publico del sitio no escribe, solo calcula tarifa.
migrate((db) => {
  const collection = new Collection({
    "id": "guides123456789",
    "name": "shipping_guides",
    "type": "base",
    "system": false,
    "schema": [
      { "id": "sgcarrier", "name": "carrier", "type": "select", "required": true, "options": { "maxSelect": 1, "values": ["dhl", "estafeta"] } },
      { "id": "sgservice", "name": "service", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["standard", "express"] } },
      { "id": "sgtrackn0", "name": "tracking_number", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "sgorigcp0", "name": "origin_cp", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "sgdestcp0", "name": "dest_cp", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "sgorigad0", "name": "origin_address", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "sgdestad0", "name": "dest_address", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "sgsender0", "name": "sender_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "sgrecip00", "name": "recipient_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "sgrecipph", "name": "recipient_phone", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "sgweight0", "name": "weight_kg", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "sgdeclval", "name": "declared_value", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "sgprice00", "name": "price", "type": "number", "required": false, "options": { "min": 0, "max": null, "noDecimal": false } },
      { "id": "sgstatus0", "name": "status", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["quoted", "paid", "generated", "in_transit", "delivered", "cancelled"] } },
      { "id": "sgpointnm", "name": "point_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "sgnotes00", "name": "notes", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } }
    ],
    "indexes": [],
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.role = 'admin'",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("guides123456789");
  return dao.deleteCollection(collection);
})
