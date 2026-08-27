/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2602490748")

  collection.fields.add(
    new Field({
      "hidden": false,
      "id": "select92310001",
      "maxSelect": 1,
      "name": "recurrenceUnit",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "select",
      "values": ["day", "week", "month"]
    }),
    new Field({
      "hidden": false,
      "id": "number92310002",
      "max": 99,
      "min": 1,
      "name": "recurrenceInterval",
      "onlyInt": true,
      "presentable": false,
      "required": false,
      "system": false,
      "type": "number"
    }),
    new Field({
      "hidden": false,
      "id": "date923100003",
      "max": "",
      "min": "",
      "name": "recurrenceAnchor",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "date"
    }),
    new Field({
      "cascadeDelete": false,
      "collectionId": "pbc_2602490748",
      "hidden": false,
      "id": "relation9231004",
      "maxSelect": 1,
      "minSelect": 0,
      "name": "recurrencePrevious",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "relation"
    })
  )

  collection.indexes = collection.indexes.concat([
    "CREATE UNIQUE INDEX `idx_tasks_recurrence_previous` ON `tasks` (`recurrencePrevious`) WHERE `recurrencePrevious` != ''"
  ])

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2602490748")

  collection.fields.removeById("relation9231004")
  collection.fields.removeById("date923100003")
  collection.fields.removeById("number92310002")
  collection.fields.removeById("select92310001")
  collection.indexes = collection.indexes.filter((index) => !index.includes("idx_tasks_recurrence_previous"))

  return app.save(collection)
})
