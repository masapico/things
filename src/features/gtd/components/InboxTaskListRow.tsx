import { ListGroup, Stack } from "react-bootstrap";
import type { TasksResponse } from "../../../lib/pb_types";
import { PhoneIncoming, Target, Trash } from "lucide-react";
import "./TaskListRow.css";
import {
  useChangeStatusInboxTask,
  useDeleteInboxTask,
} from "../hooks/useTasks";
import { TaskInfo } from "./TaskInfo";

type InboxTaskListRowProps = {
  task: TasksResponse;
};

export function InboxTaskListRow({ task }: InboxTaskListRowProps) {
  const iconSize = 16;

  const { mutate: mutateStatus, isPending: isStatusPending } =
    useChangeStatusInboxTask();
  const { mutate: mutateDelete, isPending: isDeletePending } =
    useDeleteInboxTask();

  function handleNext() {
    mutateStatus(
      { targetTask: task, newStatus: "next" },
      { onSuccess: () => console.log("task next", task.id) },
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
        <div className="task-title">
          {task.title}</div>
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
      <TaskInfo task={task} />
    </ListGroup.Item>
  );
}
