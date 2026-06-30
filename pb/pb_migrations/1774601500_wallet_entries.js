/// <reference path="../pb_data/types.d.ts" />

// Movimientos del monedero de crédito (libro mayor por teléfono).
// Cada entrada registra un cambio con signo (+/-), su razón, referencia y el
// saldo resultante tras aplicarla.
migrate((db) => {
  const dao = new Dao(db)

  const wallet_entries = new Collection({
    "id": "walletentries12",
    "name": "wallet_entries",
    "type": "base",
    "system": false,
    "schema": [
      { "id": "wephone000", "name": "customer_phone", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "weamount00", "name": "amount", "type": "number", "required": false, "options": { "min": null, "max": null, "noDecimal": false } },
      { "id": "wereason00", "name": "reason", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "weref00000", "name": "ref", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "webalance0", "name": "balance_after", "type": "number", "required": false, "options": { "min": null, "max": null, "noDecimal": false } }
    ],
    "indexes": [],
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.role = 'admin'",
    "options": {}
  })
  dao.saveCollection(wallet_entries)
}, (db) => {
  const dao = new Dao(db)
  try { dao.deleteCollection(dao.findCollectionByNameOrId("walletentries12")) } catch (e) {}
})
