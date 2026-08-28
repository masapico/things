/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("clips")

  collection.fields.add(new SelectField({
    name: "kind",
    required: true,
    maxSelect: 1,
    values: ["text", "image", "file", "data"],
  }))
  collection.fields.add(new JSONField({
    name: "data",
    required: false,
  }))
  collection.fields.add(new TextField({
    name: "dataSearch",
    required: false,
  }))

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("clips")

  collection.fields.removeByName("dataSearch")
  collection.fields.removeByName("data")
  collection.fields.removeByName("kind")

  app.save(collection)
})
