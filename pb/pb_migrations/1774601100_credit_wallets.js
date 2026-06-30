/// <reference path="../pb_data/types.d.ts" />

// Monedero de crédito por cliente (clave = teléfono).
// Se alimenta cuando una reserva se convierte a 'credit' (no reembolso): lo
// pagado pasa al monedero y puede aplicarse a futuros abonos/reservas.
migrate((db) => {
  const dao = new Dao(db)

  const wallets = new Collection({
    "id": "wallets12345678",
    "name": "wallets",
    "type": "base",
    "system": false,
    "schema": [
      { "id": "wphone000", "name": "customer_phone", "type": "text", "required": true, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "wname0000", "name": "customer_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "wbalance0", "name": "balance", "type": "number", "required": false, "options": { "min": null, "max": null, "noDecimal": false } }
    ],
    "indexes": ["CREATE UNIQUE INDEX `idx_wallet_phone` ON `wallets` (`customer_phone`)"],
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.role = 'admin'",
    "options": {}
  })
  dao.saveCollection(wallets)

  // payments.method: agregar 'credit'
  const pay = dao.findCollectionByNameOrId("payments")
  pay.schema.removeField("pymethod0")
  pay.schema.addField(new SchemaField({
    "system": false, "id": "pymethod0", "name": "method", "type": "select",
    "required": false, "presentable": false, "unique": false,
    "options": { "maxSelect": 1, "values": ["cash", "card", "transfer", "credit"] }
  }))
  dao.saveCollection(pay)
}, (db) => {
  const dao = new Dao(db)
  try { dao.deleteCollection(dao.findCollectionByNameOrId("wallets12345678")) } catch (e) {}
  const pay = dao.findCollectionByNameOrId("payments")
  pay.schema.removeField("pymethod0")
  pay.schema.addField(new SchemaField({
    "system": false, "id": "pymethod0", "name": "method", "type": "select",
    "required": false, "options": { "maxSelect": 1, "values": ["cash", "card", "transfer"] }
  }))
  dao.saveCollection(pay)
})
