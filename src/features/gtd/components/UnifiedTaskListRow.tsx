import { ListGroup, Stack } from "react-bootstrap";
import type { TasksResponse } from "../../../lib/pb_types";
import {
  Check,
  CheckCircle2,
  GripVertical,
  Inbox,
  PhoneIncoming,
  SquarePen,
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
  /** useSortable から渡されるハンドル用 ref */
  handleRef?: (element: Element | null) => void;
  /** useSortable から渡されるコンテナ用 ref */
  containerRef?: React.RefCallback<HTMLElement>;
  /** ドラッグ中のスタイル */
  isDragging?: boolean;
};

const STATUS_DOT_COLOR: Record<string, string> = {
  inbox: "#9ca3af",
  next: "#3b82f6",
  waiting: "#f59e0b",
  someday: "#8b5cf6",
  completed: "#22c55e",
};

const iconSize = 16;

/** 完了日を "M/D 完了" 形式で表示 */
function formatCompletedDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day} 完了`;
}

export function UnifiedTaskListRow({
  task,
  handleRef,
  containerRef,
  isDragging,
}: UnifiedTaskListRowProps) {
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
    <ListGroup.Item
      ref={containerRef}
      className={`task-row ${task.status} ${isCompleted ? "task-row--completed" : ""} ${isDragging ? "task-row--dragging" : ""}`}
    >
      <Stack direction="horizontal" gap={1}>
        {/* ドラッグハンドル（handleRef が渡された場合のみ表示） */}
        {handleRef && (
          <span className="task-drag-handle" ref={handleRef}>
            <GripVertical size={14} />
          </span>
        )}

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
          <span title={task.memo ? task.memo : ""}>
            {task.title}
          </span>
          {/* 編集（完了タスクでは非表示） */}
          {!isCompleted && (
            <ActionBtn
              icon={<SquarePen size={iconSize} />}
              label="Edit task"
              className="task-action-btn--edit"
              disabled={false}
              onClick={() => setShowEditModal(true)}
            />
          )}
        </div>

        {/* タスク付随情報（完了タスクでは非表示） */}
        {!isCompleted && <TaskInfo task={task} />}

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
            <ActionBtn
              icon={<Inbox size={iconSize} />}
              label="Move to Inbox"
              className="task-action-btn--inbox"
              disabled={isStatusPending}
              onClick={() => changeStatus("inbox")}
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

        {/* completed: 完了日 + 戻す(Inbox) */}
        {task.status === "completed" && (
          <>
            {task.completed && (
              <span className="task-completed-date">
                <CheckCircle2 size={12} />
                {formatCompletedDate(task.completed)}
              </span>
            )}
            <ActionBtn
              icon={<Undo2 size={iconSize} />}
              label="Inboxに戻す"
              className="task-action-btn--undo"
              disabled={isStatusPending}
              onClick={() => changeStatus("inbox")}
            />
          </>
        )}

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
