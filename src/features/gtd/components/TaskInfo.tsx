import type { TasksResponse } from "../../../lib/pb_types";
import { Calendar, Flag, FolderKanban, Paperclip } from "lucide-react";
import { ClipsPopover } from "../../clips/components/ClipsPopover";
import "./TaskListRow.css";

type TaskInfoProps = {
  task: TasksResponse;
};

const iconSize = 12;

/** 日付文字列を人間にわかりやすいラベルに変換する */
function formatDueDate(dateStr: string): { label: string; isOverdue: boolean } {
  const d = new Date(dateStr);
  const now = new Date();

  // 時刻を無視して日付だけで比較（ローカルタイムゾーン）
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

export function TaskInfo({ task }: TaskInfoProps) {
  const expand = task.expand as { project?: { name: string } } | undefined;
  const projectName = expand?.project?.name;
  const dueDate = task.duedate;
  const priority = task.priority;
  const clipCount = (task.clips ?? []).length;

  const parts: React.ReactNode[] = [];

  if (projectName) {
    parts.push(
      <span key="project" className="task-info-item">
        <FolderKanban size={iconSize} />
        {projectName}
      </span>,
    );
  }



  if (clipCount > 0) {
    parts.push(
      <ClipsPopover key="clips" clipIds={task.clips ?? []}>
        <span
          className="task-info-item task-info-item--clips"
          role="button"
          title={`${clipCount}件のクリップを表示`}
        >
          <Paperclip size={iconSize} />
          {clipCount}
        </span>
      </ClipsPopover>,
    );
  }

  if (dueDate) {
    const { label, isOverdue } = formatDueDate(dueDate);
    parts.push(
      <span
        key="duedate"
        className={`task-info-item ${isOverdue ? "task-info--overdue" : ""}`}
      >
        <Calendar size={iconSize} />
        {label}
      </span>,
    );
  }

  if (priority) {
    parts.push(
      <span
        key="priority"
        className={`task-info-item ${priority === "high" ? "task-info--priority-high" : ""}`}
      >
        <Flag size={iconSize} />
      </span>,
    );
  }

  if (parts.length === 0) return null;

  return (
    <div className="task-info">
      {parts.reduce((prev, curr, i) => (
        <>
          {prev}
          {i > 0 && <span className="task-info-separator">·</span>}
          {curr}
        </>
      ))}
    </div>
  );
}
