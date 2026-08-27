export type TimerState = {
  durationMs: number;
  remainingMs: number;
  dueAt: number | null;
  label: string;
  status: "running" | "paused" | "due";
};

export type AlarmState = {
  time: string;
  dueAt: number;
  label: string;
  status: "armed" | "due";
};

export type ClockToolsState = { version: 1; timer: TimerState | null; alarm: AlarmState | null };
export const EMPTY_CLOCK_STATE: ClockToolsState = { version: 1, timer: null, alarm: null };
export const CLOCK_STORAGE_KEY = "things.clock.v1";

export function getRemainingMs(timer: TimerState, now: number) {
  return timer.status === "running" && timer.dueAt ? Math.max(0, timer.dueAt - now) : Math.max(0, timer.remainingMs);
}

export function advanceClockState(state: ClockToolsState, now: number): ClockToolsState {
  let timer = state.timer;
  let alarm = state.alarm;
  if (timer?.status === "running" && timer.dueAt && timer.dueAt <= now) timer = { ...timer, status: "due", remainingMs: 0, dueAt: null };
  if (alarm?.status === "armed" && alarm.dueAt <= now) alarm = { ...alarm, status: "due" };
  return timer === state.timer && alarm === state.alarm ? state : { version: 1, timer, alarm };
}

export function nextAlarmAt(time: string, now: number) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) throw new Error("Invalid alarm time");
  const date = new Date(now);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (date.getTime() <= now) date.setDate(date.getDate() + 1);
  return date.getTime();
}

export function parseClockState(raw: string | null): ClockToolsState {
  if (!raw) return EMPTY_CLOCK_STATE;
  try {
    const value = JSON.parse(raw) as Partial<ClockToolsState>;
    if (value.version !== 1) return EMPTY_CLOCK_STATE;
    const timer = value.timer && ["running", "paused", "due"].includes(value.timer.status) && Number.isFinite(value.timer.durationMs) && value.timer.durationMs > 0 ? value.timer : null;
    const alarm = value.alarm && ["armed", "due"].includes(value.alarm.status) && /^\d{2}:\d{2}$/.test(value.alarm.time) && Number.isFinite(value.alarm.dueAt) ? value.alarm : null;
    return { version: 1, timer, alarm };
  } catch { return EMPTY_CLOCK_STATE; }
}

export function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
