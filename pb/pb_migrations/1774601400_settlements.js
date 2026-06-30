/// <reference path="../pb_data/types.d.ts" />

// settlements: liquidaciones (cortes) por proveedor / punto / chofer.
// - kind: provider | point | driver_corte
// - gross/fee/net por periodo, con folio + estado (pending/paid).
migrate((db) => {
  const dao = new Dao(db)

  const settlements = new Collection({
    "id": "settlements1234",
    "name": "settlements",
    "type": "base",
    "system": false,
    "schema": [
      { "id": "stkind0000", "name": "kind", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["provider", "point", "driver_corte"] } },
      { "id": "stref00000", "name": "ref", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "strefname0", "name": "ref_name", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "stperiod00", "name": "period", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "stgross000", "name": "gross", "type": "number", "required": false, "options": { "min": null, "max": null, "noDecimal": false } },
      { "id": "stfee00000", "name": "fee", "type": "number", "required": false, "options": { "min": null, "max": null, "noDecimal": false } },
      { "id": "stnet00000", "name": "net", "type": "number", "required": false, "options": { "min": null, "max": null, "noDecimal": false } },
      { "id": "stfolio000", "name": "folio", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "id": "ststatus00", "name": "status", "type": "select", "required": false, "options": { "maxSelect": 1, "values": ["pending", "paid"] } },
      { "id": "stnotes000", "name": "notes", "type": "text", "required": false, "options": { "min": null, "max": null, "pattern": "" } }
    ],
    "indexes": [],
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.role = 'admin'",
    "options": {}
  })
  dao.saveCollection(settlements)
}, (db) => {
  const dao = new Dao(db)
  try { dao.deleteCollection(dao.findCollectionByNameOrId("settlements1234")) } catch (e) {}
})
