import { Repeat2 } from "lucide-react";
import type { TasksResponse } from "../../../lib/pb_types";
import { recurrenceLabel } from "../recurrence";

export function RecurrenceBadge({ task }: { task: TasksResponse }) {
  if (!task.recurrenceUnit) return null;
  const label = recurrenceLabel(task.recurrenceUnit, task.recurrenceInterval);
  return (
    <span className="task-info-item" title={`繰り返し: ${label}`}>
      <Repeat2 size={12} />
      {label}
    </span>
  );
}
