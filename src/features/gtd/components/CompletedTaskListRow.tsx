import { ListGroup, Stack } from "react-bootstrap";
import type { TasksResponse } from "../../../lib/pb_types";
import { Pencil, Undo2 } from "lucide-react";
import "./TaskListRow.css";
import { useChangeStatusInboxTask } from "../hooks/useTasks";
import { TaskEditModal } from "./TaskEditModal";
import { useState } from "react";

type CompletedTaskListRowProps = {
  task: TasksResponse;
};

export function CompletedTaskListRow({ task }: CompletedTaskListRowProps) {
  const iconSize = 16;
  const [showEditModal, setShowEditModal] = useState(false);

  const { mutate: mutateStatus, isPending: isStatusPending } =
    useChangeStatusInboxTask();

  function handleUndo() {
    mutateStatus(
      { targetTask: task, newStatus: "inbox" },
      { onSuccess: () => console.log("task undo", task.id) },
    );
  }

  return (
    <ListGroup.Item className="task-row completed">
      <Stack direction="horizontal" gap={1}>
        <div className="task-title task-title--completed">
          {task.title}
        </div>
        <div
          className={`task-action-btn task-action-btn--undo ${isStatusPending ? "task-action-btn--loading" : ""}`}
          role="button"
          title="Inboxに戻す"
          tabIndex={0}
          onClick={!isStatusPending ? handleUndo : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isStatusPending) handleUndo();
          }}
        >
          <Undo2 size={iconSize} />
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
      <TaskEditModal
        task={task}
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </ListGroup.Item>
  );
}