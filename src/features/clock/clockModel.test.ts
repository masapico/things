import { describe, expect, it } from "vitest";
import { advanceClockState, EMPTY_CLOCK_STATE, formatRemaining, nextAlarmAt, parseClockState } from "./clockModel";

describe("clockModel", () => {
  it("期限を過ぎたタイマーとアラームを発火状態にする", () => {
    const state = { version: 1 as const, timer: { durationMs: 60_000, remainingMs: 60_000, dueAt: 1000, label: "", status: "running" as const }, alarm: { time: "09:00", dueAt: 1000, label: "", status: "armed" as const } };
    const next = advanceClockState(state, 1001);
    expect(next.timer?.status).toBe("due"); expect(next.alarm?.status).toBe("due");
  });
  it("過ぎた時刻のアラームは翌日に設定する", () => {
    const now = new Date(2026, 7, 27, 10, 0).getTime();
    expect(new Date(nextAlarmAt("09:00", now)).getDate()).toBe(28);
  });
  it("不正な保存値は初期化する", () => { expect(parseClockState("broken")).toEqual(EMPTY_CLOCK_STATE); });
  it("残時間を整形する", () => { expect(formatRemaining(65_000)).toBe("01:05"); });
});
