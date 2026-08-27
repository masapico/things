import { describe, expect, it } from "vitest";
import { localCalendarDate, recurrenceLabel } from "./recurrence";
import recurrence from "../../../pocketbase/pb_hooks/task-recurrence.cjs";

const { nextRecurrenceDate } = recurrence as {
  nextRecurrenceDate: (anchor: string, today: string, unit: string, interval: number) => string;
};

describe("nextRecurrenceDate", () => {
  it("期限超過した日次タスクを最初の未来日まで進める", () => {
    expect(nextRecurrenceDate("2026-08-20", "2026-08-27", "day", 2)).toBe("2026-08-28");
  });

  it("複数週の周期を基準日から維持する", () => {
    expect(nextRecurrenceDate("2026-08-01", "2026-08-27", "week", 2)).toBe("2026-08-29");
  });

  it("月末を丸めても基準日の日付へ戻る", () => {
    expect(nextRecurrenceDate("2026-01-31", "2026-01-31", "month", 1)).toBe("2026-02-28");
    expect(nextRecurrenceDate("2026-01-31", "2026-02-28", "month", 1)).toBe("2026-03-31");
  });

  it("うるう年の月末を扱う", () => {
    expect(nextRecurrenceDate("2028-01-31", "2028-01-31", "month", 1)).toBe("2028-02-29");
  });
});

describe("recurrence UI helpers", () => {
  it("周期ラベルを日本語で返す", () => {
    expect(recurrenceLabel("day", 1)).toBe("毎日");
    expect(recurrenceLabel("week", 2)).toBe("2週ごと");
    expect(recurrenceLabel("month", 1)).toBe("毎月");
  });

  it("ローカル日付をYYYY-MM-DDで返す", () => {
    expect(localCalendarDate(new Date(2026, 7, 3, 23, 59))).toBe("2026-08-03");
  });
});
