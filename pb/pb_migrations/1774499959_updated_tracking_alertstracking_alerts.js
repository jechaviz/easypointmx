/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("2ndz043iwj2jsto")

  collection.name = "tracking_alerts"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("2ndz043iwj2jsto")

  collection.name = "tracking_alertstracking_alerts"

  return dao.saveCollection(collection)
})
