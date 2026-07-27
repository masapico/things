import { ListGroup, Stack } from "react-bootstrap";
import type { TasksResponse } from "../../../lib/pb_types";
import { Calendar } from "lucide-react";
import "./TaskListRow.css";

type DeadlineTaskListRowProps = {
  task: TasksResponse;
};

/** 日付文字列を人間にわかりやすいラベルに変換する */
function formatDueDate(dateStr: string): {
  label: string;
  isOverdue: boolean;
} {
  const d = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return { label: "期限超過", isOverdue: true };
  if (diffDays === 0) return { label: "今日", isOverdue: false };
  if (diffDays === 1) return { label: "明日", isOverdue: false };
  if (diffDays === 2) return { label: "明後日", isOverdue: false };
  if (diffDays <= 7) return { label: `${diffDays}日後`, isOverdue: false };

  const month = d.getMonth() + 1;
  const day = d.getDate();
  return { label: `${month}/${day}`, isOverdue: false };
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  inbox: { label: "Inbox", color: "#9ca3af" },
  next: { label: "Next", color: "#3b82f6" },
  waiting: { label: "Waiting", color: "#f59e0b" },
  someday: { label: "Someday", color: "#8b5cf6" },
};

export function DeadlineTaskListRow({ task }: DeadlineTaskListRowProps) {

  const { label: dueLabel, isOverdue } = formatDueDate(task.duedate ?? "");
  const statusInfo = STATUS_LABEL[task.status] ?? {
    label: task.status,
    color: "#9ca3af",
  };

  return (
    <ListGroup.Item className="task-row">
      <Stack direction="horizontal" gap={2} className="align-items-center">
        {/* duedate ラベル */}
        <span
          className="deadline-date-badge"
          data-overdue={isOverdue ? "true" : undefined}
        >
          <Calendar size={12} />
          {dueLabel}
        </span>

        {/* タイトル */}
        <div className="task-title" title={task.memo ? task.memo : ""}>
          {task.title}
        </div>

        {/* 現在のステータス（小さく） */}
        <span
          className="deadline-status-tag"
          style={{ color: statusInfo.color }}
        >
          {statusInfo.label}
        </span>
      </Stack>
    </ListGroup.Item>
  );
}
