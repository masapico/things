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

  const { mutate, isPending } = useChangeStatusInboxTask();
  const { mutate: mutateDelete, isPending: isPendingDelete } =
    useDeleteInboxTask();

  function handleInbox() {
    mutate(
      {
        targetTask: task,
        newStatus: "inbox",
      },
      {
        onSuccess: () => {
          console.log("task inbox", task.id);
        },
      },
    );
  }

  function handleNext() {
    mutate(
      {
        targetTask: task,
        newStatus: "next",
      },
      {
        onSuccess: () => {
          console.log("task next", task.id);
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
        <div>{task.title}</div>
        {task.project === "" ? (
          <div
            className="ms-auto"
            role="button"
            title="inbox"
            onClick={!isPending ? handleInbox : () => {}}
          >
            <Inbox size={iconSize} />
          </div>
        ) : null}
        <div
          role="button"
          title="next"
          onClick={!isPending ? handleNext : () => {}}
        >
          <Target size={iconSize} />
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
