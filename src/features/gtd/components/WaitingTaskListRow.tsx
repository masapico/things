import { ListGroup, Stack } from "react-bootstrap";
import type { TasksResponse } from "../../../lib/pb_types";
import { Inbox, Target, Trash } from "lucide-react";
import "./TaskListRow.css";
import {
  useChangeStatusInboxTask,
  useDeleteInboxTask,
} from "../hooks/useTasks";

type WaitingTaskListRowProps = {
  task: TasksResponse;
};

export function WaitingTaskListRow({ task }: WaitingTaskListRowProps) {
  const iconSize = 16;

  const { mutate: mutateStatus, isPending: isStatusPending } =
    useChangeStatusInboxTask();
  const { mutate: mutateDelete, isPending: isDeletePending } =
    useDeleteInboxTask();

  function handleInbox() {
    mutateStatus(
      { targetTask: task, newStatus: "inbox" },
      { onSuccess: () => console.log("task inbox", task.id) },
    );
  }

  function handleNext() {
    mutateStatus(
      { targetTask: task, newStatus: "next" },
      { onSuccess: () => console.log("task next", task.id) },
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
        <div className="task-title">{task.title}</div>
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
          className={`task-action-btn task-action-btn--next ${isStatusPending ? "task-action-btn--loading" : ""}`}
          role="button"
          title="Move to Next"
          tabIndex={0}
          onClick={!isStatusPending ? handleNext : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isStatusPending) handleNext();
          }}
        >
          <Target size={iconSize} />
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