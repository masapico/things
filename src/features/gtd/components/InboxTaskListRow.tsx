import { ListGroup, Stack } from "react-bootstrap";
import type { TasksResponse } from "../../../lib/pb_types";
import { PhoneIncoming, Target, Trash } from "lucide-react";
import "./TaskListRow.css";
import {
  useChangeStatusInboxTask,
  useDeleteInboxTask,
} from "../hooks/useTasks";

type InboxTaskListRowProps = {
  task: TasksResponse;
};

export function InboxTaskListRow({ task }: InboxTaskListRowProps) {
  const iconSize = 16;

  const { mutate, isPending } = useChangeStatusInboxTask();
  const { mutate: mutateDelete, isPending: isPendingDelete } =
    useDeleteInboxTask();

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
        <div>{task.title}</div>
        <div
          className="ms-auto"
          role="button"
          title="next"
          onClick={!isPending ? handleNext : () => {}}
        >
          <Target size={iconSize} />
        </div>
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
