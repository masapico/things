import type { TasksRecurrenceUnitOptions } from "../../lib/pb_types";

export function localCalendarDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function recurrenceLabel(
  unit?: TasksRecurrenceUnitOptions,
  interval = 1,
): string {
  if (!unit) return "";
  const unitLabel = { day: "日", week: "週", month: "か月" }[unit];
  const singleLabel = { day: "毎日", week: "毎週", month: "毎月" }[unit];
  return interval <= 1 ? singleLabel : `${interval}${unitLabel}ごと`;
}

export function taskMutationErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { message?: unknown } }).response;
    if (typeof response?.message === "string" && response.message) return response.message;
  }
  return fallback;
}
