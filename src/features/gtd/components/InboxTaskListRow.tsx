import { ListGroup, Stack } from "react-bootstrap";
import type { TasksResponse } from "../../../lib/pb_types";
import { Pencil, PhoneIncoming, Target } from "lucide-react";
import "./TaskListRow.css";
import { useChangeStatusInboxTask } from "../hooks/useTasks";
import { TaskInfo } from "./TaskInfo";
import { TaskEditModal } from "./TaskEditModal";
import { useState } from "react";

type InboxTaskListRowProps = {
  task: TasksResponse;
};

export function InboxTaskListRow({ task }: InboxTaskListRowProps) {
  const iconSize = 16;
  const [showEditModal, setShowEditModal] = useState(false);

  const { mutate: mutateStatus, isPending: isStatusPending } =
    useChangeStatusInboxTask();

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
          className="task-action-btn task-action-btn--edit"
          role="button"
          title="Edit task"
          tabIndex={0}
          onClick={() => setShowEditModal(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setShowEditModal(true);
          }}
        >
          <Pencil size={iconSize} />
        </div>
      </Stack>
      <TaskInfo task={task} />
      <TaskEditModal
        task={task}
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </ListGroup.Item>
  );
}
