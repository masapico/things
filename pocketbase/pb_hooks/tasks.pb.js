/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/things/tasks/{id}/complete", (e) => {
  const recurrence = require(`${__hooks}/task-recurrence.cjs`)
  const today = String(e.requestInfo().body.today || "")
  try {
    recurrence.parseDate(today)
  } catch (_) {
    throw new ApiError(422, "ローカル日付が不正です。")
  }

  let response
  e.app.runInTransaction((txApp) => {
    let task
    try {
      task = txApp.findRecordById("tasks", e.request.pathValue("id"))
    } catch (_) {
      throw new NotFoundError("タスクが見つかりません。")
    }
    if (!txApp.canAccessRecord(task, e.requestInfo(), task.collection().updateRule)) {
      throw new ForbiddenError("このタスクを更新できません。")
    }

    let nextTask = null
    try {
      nextTask = txApp.findFirstRecordByData("tasks", "recurrencePrevious", task.id)
    } catch (_) {}

    if (task.getString("status") === "completed") {
      response = { completedTaskId: task.id, nextTaskId: nextTask ? nextTask.id : null }
      return
    }

    const previousStatus = task.getString("status")
    const unit = task.getString("recurrenceUnit")
    const interval = task.getInt("recurrenceInterval")
    const dueDate = task.getString("duedate").slice(0, 10)
    const anchor = task.getString("recurrenceAnchor").slice(0, 10) || dueDate

    if (unit && (!dueDate || !anchor)) {
      throw new ApiError(422, "繰り返しタスクには期限が必要です。")
    }

    task.set("status", "completed")
    task.set("completed", new Date().toISOString())
    txApp.save(task)

    if (unit && !nextTask) {
      let nextDueDate
      try {
        nextDueDate = recurrence.nextRecurrenceDate(anchor, today, unit, interval)
      } catch (_) {
        throw new ApiError(422, "繰り返し設定が不正です。")
      }

      nextTask = new Record(task.collection())
      nextTask.set("title", task.getString("title"))
      nextTask.set("memo", task.getString("memo"))
      nextTask.set("priority", task.getString("priority"))
      nextTask.set("duedate", nextDueDate)
      nextTask.set("project", task.getString("project"))
      nextTask.set("clips", task.getStringSlice("clips"))
      nextTask.set("sort", task.getFloat("sort"))
      nextTask.set("status", previousStatus)
      nextTask.set("recurrenceUnit", unit)
      nextTask.set("recurrenceInterval", interval)
      nextTask.set("recurrenceAnchor", anchor)
      nextTask.set("recurrencePrevious", task.id)
      txApp.save(nextTask)
    }

    response = { completedTaskId: task.id, nextTaskId: nextTask ? nextTask.id : null }
  })

  return e.json(200, response)
}, $apis.requireAuth())

routerAdd("POST", "/api/things/tasks/{id}/undo-completion", (e) => {
  let response
  e.app.runInTransaction((txApp) => {
    let task
    try {
      task = txApp.findRecordById("tasks", e.request.pathValue("id"))
    } catch (_) {
      throw new NotFoundError("タスクが見つかりません。")
    }
    if (!txApp.canAccessRecord(task, e.requestInfo(), task.collection().updateRule)) {
      throw new ForbiddenError("このタスクを更新できません。")
    }
    if (task.getString("status") !== "completed") {
      throw new ApiError(409, "完了済みではないタスクです。")
    }

    let nextTask = null
    try {
      nextTask = txApp.findFirstRecordByData("tasks", "recurrencePrevious", task.id)
    } catch (_) {}
    if (nextTask && nextTask.getString("status") === "completed") {
      throw new ApiError(409, "後続の繰り返しタスクが完了済みのため、元に戻せません。")
    }

    const deletedNextTaskId = nextTask ? nextTask.id : null
    if (nextTask) txApp.delete(nextTask)
    task.set("status", "inbox")
    task.set("completed", null)
    txApp.save(task)
    response = { restoredTaskId: task.id, deletedNextTaskId }
  })

  return e.json(200, response)
}, $apis.requireAuth())
