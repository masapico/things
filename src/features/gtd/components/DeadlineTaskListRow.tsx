import { ListGroup, Stack } from "react-bootstrap";
import type { TasksResponse } from "../../../lib/pb_types";
import { Calendar, FolderKanban } from "lucide-react";
import "./TaskListRow.css";

type DeadlineTaskListRowProps = {
  task: TasksResponse;
  projectName?: string;
};

type Urgency = "overdue" | "today" | "soon" | "later";

/** 日付文字列を人間にわかりやすいラベルに変換する */
function formatDueDate(dateStr: string): {
  label: string;
  urgency: Urgency;
} {
  const d = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return { label: "期限超過", urgency: "overdue" };
  if (diffDays === 0) return { label: "今日", urgency: "today" };
  if (diffDays === 1) return { label: "明日", urgency: "soon" };
  if (diffDays === 2) return { label: "明後日", urgency: "soon" };
  if (diffDays <= 3) return { label: `${diffDays}日後`, urgency: "soon" };
  if (diffDays <= 7) return { label: `${diffDays}日後`, urgency: "later" };

  const month = d.getMonth() + 1;
  const day = d.getDate();
  return { label: `${month}/${day}`, urgency: "later" };
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  inbox: { label: "Inbox", color: "#9ca3af" },
  next: { label: "Next", color: "#3b82f6" },
  waiting: { label: "Waiting", color: "#f59e0b" },
  someday: { label: "Someday", color: "#8b5cf6" },
};

export function DeadlineTaskListRow({ task, projectName }: DeadlineTaskListRowProps) {

  const { label: dueLabel, urgency } = formatDueDate(task.duedate ?? "");
  const statusInfo = STATUS_LABEL[task.status] ?? {
    label: task.status,
    color: "#9ca3af",
  };

  return (
    <ListGroup.Item
      className="task-row"
      data-overdue={urgency === "overdue" ? "true" : undefined}
    >
      <Stack direction="horizontal" gap={2} className="align-items-center">
        {/* duedate ラベル */}
        <span
          className="deadline-date-badge"
          data-urgency={urgency}
        >
          <Calendar size={12} />
          {dueLabel}
        </span>

        {/* タイトル */}
        <div className="task-title" title={task.memo ? task.memo : ""}>
          {task.title}
        </div>

        {/* プロジェクト名 */}
        {projectName && (
          <span className="task-info-item" style={{ fontSize: ".72rem", color:"#aaa"}}>
            <FolderKanban size={12} />
            {projectName}
          </span>
        )}

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
