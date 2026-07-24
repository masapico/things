import { ListGroup, Stack } from "react-bootstrap";
import type { TasksResponse } from "../../../lib/pb_types";
import { Check, Inbox, PhoneIncoming, Trash, Undo } from "lucide-react";
import "./TaskListRow.css";
import {
  useChangeStatusInboxTask,
  useDeleteInboxTask,
} from "../hooks/useTasks";

type NextTaskListRowProps = {
  task: TasksResponse;
};

export function NextTaskListRow({ task }: NextTaskListRowProps) {
  const iconSize = 16;

  const { mutate: mutateStatus, isPending: isStatusPending } =
    useChangeStatusInboxTask();
  const { mutate: mutateDelete, isPending: isDeletePending } =
    useDeleteInboxTask();

  function handleComplete() {
    mutateStatus(
      { targetTask: task, newStatus: "done" },
      { onSuccess: () => console.log("task completed", task.id) },
    );
  }

  function handleInbox() {
    mutateStatus(
      { targetTask: task, newStatus: "inbox" },
      { onSuccess: () => console.log("task inbox", task.id) },
    );
  }

  function handleWaiting() {
    mutateStatus(
      { targetTask: task, newStatus: "waiting" },
      { onSuccess: () => console.log("task waiting", task.id) },
    );
  }

  function handleDelete() {
    mutateDelete(task, {
      onSuccess: () => console.log("task delete", task.id),
    });
  }

  return (
    <ListGroup.Item className={`task-row ${task.status}`}>
      <Stack direction="horizontal" gap={1}>
        <div
          className={`task-title ${task.status === "completed" ? "task-title--completed" : ""}`}
        >
          {task.title}
        </div>
        <div
          className={`task-action-btn ${task.status === "completed" ? "task-action-btn--undo" : "task-action-btn--complete"} ${isStatusPending ? "task-action-btn--loading" : ""}`}
          role="button"
          title={task.status === "completed" ? "Undo complete" : "Complete"}
          tabIndex={0}
          onClick={!isStatusPending ? handleComplete : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isStatusPending) handleComplete();
          }}
        >
          {task.status === "completed" ? (
            <Undo size={iconSize} />
          ) : (
            <Check size={iconSize} />
          )}
        </div>
        {task.project === "" ? (
          <div
            className={`task-action-btn task-action-btn--inbox ${isStatusPending ? "task-action-btn--loading" : ""}`}
            role="button"
            title="Move to Inbox"
            tabIndex={0}
            onClick={!isStatusPending ? handleInbox : undefined}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isStatusPending) handleInbox();
            }}
          >
            <Inbox size={iconSize} />
          </div>
        ) : null}
        <div
          className={`task-action-btn task-action-btn--waiting ${isStatusPending ? "task-action-btn--loading" : ""}`}
          role="button"
          title="Move to Waiting"
          tabIndex={0}
          onClick={!isStatusPending ? handleWaiting : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isStatusPending) handleWaiting();
          }}
        >
          <PhoneIncoming size={iconSize} />
        </div>
        <div
          className={`task-action-btn task-action-btn--delete ${isDeletePending ? "task-action-btn--loading" : ""}`}
          role="button"
          title="Delete task"
          tabIndex={0}
          onClick={!isDeletePending ? handleDelete : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isDeletePending) handleDelete();
          }}
        >
          <Trash size={iconSize} />
        </div>
      </Stack>
    </ListGroup.Item>
  );
}