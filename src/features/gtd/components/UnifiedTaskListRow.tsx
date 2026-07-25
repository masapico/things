import { ListGroup, Stack } from "react-bootstrap";
import type { TasksResponse } from "../../../lib/pb_types";
import {
  Check,
  Inbox,
  Pencil,
  PhoneIncoming,
  Target,
  Undo2,
} from "lucide-react";
import "./TaskListRow.css";
import { useChangeStatusInboxTask } from "../hooks/useTasks";
import { TaskInfo } from "./TaskInfo";
import { TaskEditModal } from "./TaskEditModal";
import { useState } from "react";

type UnifiedTaskListRowProps = {
  task: TasksResponse;
};

const STATUS_DOT_COLOR: Record<string, string> = {
  inbox: "#9ca3af",
  next: "#3b82f6",
  waiting: "#f59e0b",
  someday: "#8b5cf6",
  completed: "#22c55e",
};

const iconSize = 16;

export function UnifiedTaskListRow({ task }: UnifiedTaskListRowProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  const { mutate: mutateStatus, isPending: isStatusPending } =
    useChangeStatusInboxTask();

  function changeStatus(newStatus: TasksResponse["status"]) {
    mutateStatus(
      { targetTask: task, newStatus },
      { onSuccess: () => console.log(`task ${newStatus}`, task.id) },
    );
  }

  const isCompleted = task.status === "completed";
  const dotColor = STATUS_DOT_COLOR[task.status] ?? "#9ca3af";

  return (
    <ListGroup.Item className={`task-row ${task.status}`}>
      <Stack direction="horizontal" gap={1}>

        {/* ステータスインジケーター */}
        <span
          className="task-status-dot"
          style={{ backgroundColor: dotColor }}
          title={task.status}
        />

        {/* タイトル */}
        <div
          className={`task-title ${isCompleted ? "task-title--completed" : ""}`}
        >
          {task.title}
        </div>

        {/* タスク付随情報 */}
        <TaskInfo task={task} />

        {/* ── アクションボタン（ステータスに応じて出し分け）── */}

        {/* inbox: →Next, →Waiting */}
        {task.status === "inbox" && (
          <>
            <ActionBtn
              icon={<Target size={iconSize} />}
              label="Move to Next"
              className="task-action-btn--next"
              disabled={isStatusPending}
              onClick={() => changeStatus("next")}
            />
            <ActionBtn
              icon={<PhoneIncoming size={iconSize} />}
              label="Move to Waiting"
              className="task-action-btn--waiting"
              disabled={isStatusPending}
              onClick={() => changeStatus("waiting")}
            />
          </>
        )}

        {/* next: 完了, →Inbox(projectなし), →Waiting */}
        {task.status === "next" && (
          <>
            <ActionBtn
              icon={<Check size={iconSize} />}
              label="Complete"
              className="task-action-btn--complete"
              disabled={isStatusPending}
              onClick={() => changeStatus("completed")}
            />
            {task.project === "" && (
              <ActionBtn
                icon={<Inbox size={iconSize} />}
                label="Move to Inbox"
                className="task-action-btn--inbox"
                disabled={isStatusPending}
                onClick={() => changeStatus("inbox")}
              />
            )}
            <ActionBtn
              icon={<PhoneIncoming size={iconSize} />}
              label="Move to Waiting"
              className="task-action-btn--waiting"
              disabled={isStatusPending}
              onClick={() => changeStatus("waiting")}
            />
          </>
        )}

        {/* waiting: →Inbox(projectなし), →Next */}
        {task.status === "waiting" && (
          <>
            {task.project === "" && (
              <ActionBtn
                icon={<Inbox size={iconSize} />}
                label="Move to Inbox"
                className="task-action-btn--inbox"
                disabled={isStatusPending}
                onClick={() => changeStatus("inbox")}
              />
            )}
            <ActionBtn
              icon={<Target size={iconSize} />}
              label="Move to Next"
              className="task-action-btn--next"
              disabled={isStatusPending}
              onClick={() => changeStatus("next")}
            />
          </>
        )}

        {/* someday: →Next, →Inbox */}
        {task.status === "someday" && (
          <>
            <ActionBtn
              icon={<Target size={iconSize} />}
              label="Move to Next"
              className="task-action-btn--next"
              disabled={isStatusPending}
              onClick={() => changeStatus("next")}
            />
            <ActionBtn
              icon={<Inbox size={iconSize} />}
              label="Move to Inbox"
              className="task-action-btn--inbox"
              disabled={isStatusPending}
              onClick={() => changeStatus("inbox")}
            />
          </>
        )}

        {/* completed: 戻す(Inbox) */}
        {task.status === "completed" && (
          <ActionBtn
            icon={<Undo2 size={iconSize} />}
            label="Inboxに戻す"
            className="task-action-btn--undo"
            disabled={isStatusPending}
            onClick={() => changeStatus("inbox")}
          />
        )}

        {/* 編集（全ステータス共通） */}
        <ActionBtn
          icon={<Pencil size={iconSize} />}
          label="Edit task"
          className="task-action-btn--edit"
          disabled={false}
          onClick={() => setShowEditModal(true)}
        />

      </Stack>


      <TaskEditModal
        task={task}
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </ListGroup.Item>
  );
}

/** アクションボタン共通コンポーネント */
function ActionBtn({
  icon,
  label,
  className,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  className: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`task-action-btn ${className} ${disabled ? "task-action-btn--loading" : ""}`}
      role="button"
      title={label}
      tabIndex={0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !disabled) onClick();
      }}
    >
      {icon}
    </div>
  );
}
