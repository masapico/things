import { useCallback, useEffect, useState } from "react";
import { advanceClockState, CLOCK_STORAGE_KEY, getRemainingMs, nextAlarmAt, parseClockState, type ClockToolsState } from "./clockModel";

export function useClockTools() {
  const [state, setState] = useState<ClockToolsState>(() => parseClockState(localStorage.getItem(CLOCK_STORAGE_KEY)));
  const [now, setNow] = useState(0);
  const updateNow = useCallback(() => { const current = Date.now(); setNow(current); setState((value) => advanceClockState(value, current)); }, []);

  useEffect(() => { localStorage.setItem(CLOCK_STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    const initialTimer = window.setTimeout(updateNow, 0);
    const timer = window.setInterval(updateNow, 1000);
    const visible = () => { if (!document.hidden) updateNow(); };
    document.addEventListener("visibilitychange", visible); window.addEventListener("focus", updateNow);
    return () => { window.clearTimeout(initialTimer); window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("focus", updateNow); };
  }, [updateNow]);

  return {
    state, now,
    startTimer(minutes: number, label: string) { const durationMs = Math.max(1, Math.min(1440, minutes)) * 60_000; setState((value) => ({ ...value, timer: { durationMs, remainingMs: durationMs, dueAt: Date.now() + durationMs, label: label.trim(), status: "running" } })); },
    pauseTimer() { setState((value) => value.timer ? { ...value, timer: { ...value.timer, remainingMs: getRemainingMs(value.timer, Date.now()), dueAt: null, status: "paused" } } : value); },
    resumeTimer() { setState((value) => value.timer ? { ...value, timer: { ...value.timer, dueAt: Date.now() + value.timer.remainingMs, status: "running" } } : value); },
    resetTimer() { setState((value) => value.timer ? { ...value, timer: { ...value.timer, remainingMs: value.timer.durationMs, dueAt: null, status: "paused" } } : value); },
    clearTimer() { setState((value) => ({ ...value, timer: null })); },
    setAlarm(time: string, label: string) { setState((value) => ({ ...value, alarm: { time, label: label.trim(), dueAt: nextAlarmAt(time, Date.now()), status: "armed" } })); },
    clearAlarm() { setState((value) => ({ ...value, alarm: null })); },
    snoozeAlarm() { setState((value) => value.alarm ? { ...value, alarm: { ...value.alarm, dueAt: Date.now() + 5 * 60_000, status: "armed" } } : value); },
  };
}
