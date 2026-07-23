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

  const { mutate, isPending } = useChangeStatusInboxTask();
  const { mutate: mutateDelete, isPending: isPendingDelete } =
    useDeleteInboxTask();

  function handleComplete() {
    mutate(
      {
        targetTask: task,
        newStatus: "done",
      },
      {
        onSuccess: () => {
          console.log("task completed", task.id);
        },
      },
    );
  }

  function handleInbox() {
    mutate(
      {
        targetTask: task,
        newStatus: "inbox",
      },
      {
        onSuccess: () => {
          console.log("task next", task.id);
        },
      },
    );
  }

  function handleWaiting() {
    mutate(
      {
        targetTask: task,
        newStatus: "waiting",
      },
      {
        onSuccess: () => {
          console.log("task waiting", task.id);
        },
      },
    );
  }

  function handleDelete() {
    mutateDelete(task, {
      onSuccess: () => {
        console.log("task delete", task.id);
      },
    });
  }

  return (
    <ListGroup.Item className={task.status}>
      <Stack direction="horizontal" gap={2}>
        <div
          className={
            task.status === "completed"
              ? "text-decoration-line-through text-secondary"
              : ""
          }
        >
          {task.title}
        </div>
        <div
          className="ms-auto"
          role="button"
          title={task.status === "completed" ? "undo" : "complete"}
          onClick={!isPending ? handleComplete : () => {}}
        >
          {task.status === "completed" ? (
            <Undo size={iconSize} />
          ) : (
            <Check size={iconSize} />
          )}
        </div>
        {task.project === "" ? (
          <div
            role="button"
            title="inboc"
            onClick={!isPending ? handleInbox : () => {}}
          >
            <Inbox size={iconSize} />
          </div>
        ) : null}
        <div
          role="button"
          title="waiting"
          onClick={!isPending ? handleWaiting : () => {}}
        >
          <PhoneIncoming size={iconSize} />
        </div>
        <div
          role="button"
          title="delete"
          onClick={!isPendingDelete ? handleDelete : () => {}}
        >
          <Trash size={iconSize} />
        </div>
      </Stack>
    </ListGroup.Item>
  );
}
