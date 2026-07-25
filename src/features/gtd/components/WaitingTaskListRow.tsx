import { ListGroup, Stack } from "react-bootstrap";
import type { TasksResponse } from "../../../lib/pb_types";
import { Inbox, Pencil, Target } from "lucide-react";
import "./TaskListRow.css";
import { useChangeStatusInboxTask } from "../hooks/useTasks";
import { TaskInfo } from "./TaskInfo";
import { TaskEditModal } from "./TaskEditModal";
import { useState } from "react";

type WaitingTaskListRowProps = {
  task: TasksResponse;
};

export function WaitingTaskListRow({ task }: WaitingTaskListRowProps) {
  const iconSize = 16;
  const [showEditModal, setShowEditModal] = useState(false);

  const { mutate: mutateStatus, isPending: isStatusPending } =
    useChangeStatusInboxTask();

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

  return (
    <ListGroup.Item className={`task-row ${task.status}`}>
      <Stack direction="horizontal" gap={1}>
        <div className="task-title">
          {task.title}
        </div>
        <TaskInfo task={task} />
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
