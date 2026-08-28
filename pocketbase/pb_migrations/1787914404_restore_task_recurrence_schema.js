/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tasks")
  const hasField = (name) => {
    try {
      return !!collection.fields.getByName(name)
    } catch {
      return false
    }
  }

  if (!hasField("recurrenceUnit")) {
    collection.fields.add(new SelectField({
      id: "select92310001",
      name: "recurrenceUnit",
      required: false,
      maxSelect: 1,
      values: ["day", "week", "month"],
    }))
  }
  if (!hasField("recurrenceInterval")) {
    collection.fields.add(new NumberField({
      id: "number92310002",
      name: "recurrenceInterval",
      required: false,
      onlyInt: true,
      min: 1,
      max: 99,
    }))
  }
  if (!hasField("recurrenceAnchor")) {
    collection.fields.add(new DateField({
      id: "date923100003",
      name: "recurrenceAnchor",
      required: false,
    }))
  }
  if (!hasField("recurrencePrevious")) {
    collection.fields.add(new RelationField({
      id: "relation9231004",
      name: "recurrencePrevious",
      required: false,
      collectionId: collection.id,
      maxSelect: 1,
      cascadeDelete: false,
    }))
  }

  app.save(collection)
  if (!collection.indexes.some((index) => index.includes("idx_tasks_recurrence_previous"))) {
    collection.indexes.push("CREATE UNIQUE INDEX `idx_tasks_recurrence_previous` ON `tasks` (`recurrencePrevious`) WHERE `recurrencePrevious` != ''")
    app.save(collection)
  }
}, () => {
  // 既存環境にある繰り返しスキーマを保護するため、ロールバックでは削除しない。
})
