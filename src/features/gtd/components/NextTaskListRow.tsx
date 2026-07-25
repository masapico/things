import { ListGroup, Stack } from "react-bootstrap";
import type { TasksResponse } from "../../../lib/pb_types";
import { Check, Inbox, Pencil, PhoneIncoming, Undo } from "lucide-react";
import "./TaskListRow.css";
import { useChangeStatusInboxTask } from "../hooks/useTasks";
import { TaskInfo } from "./TaskInfo";
import { TaskEditModal } from "./TaskEditModal";
import { useState } from "react";

type NextTaskListRowProps = {
  task: TasksResponse;
};

export function NextTaskListRow({ task }: NextTaskListRowProps) {
  const iconSize = 16;
  const [showEditModal, setShowEditModal] = useState(false);

  const { mutate: mutateStatus, isPending: isStatusPending } =
    useChangeStatusInboxTask();

  function handleComplete() {
    const newStatus = task.status === "completed" ? "next" : "completed";
    mutateStatus(
      { targetTask: task, newStatus },
      { onSuccess: () => console.log(`task ${newStatus}`, task.id) },
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

  return (
    <ListGroup.Item className={`task-row ${task.status}`}>
      <Stack direction="horizontal" gap={1}>
        <div className={`task-title ${task.status === "completed" ? "task-title--completed" : ""}`}>
          {task.title}
        </div>
        <TaskInfo task={task} />
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
