const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(value) {
  const match = DATE_PATTERN.exec(String(value || "").slice(0, 10));
  if (!match) throw new Error("Invalid calendar date");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) throw new Error("Invalid calendar date");
  return { year, month, day, time: date.getTime() };
}

function formatDate(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(anchor, days) {
  const date = new Date(anchor.time + days * 86400000);
  return formatDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function addMonths(anchor, months) {
  const totalMonths = anchor.year * 12 + anchor.month - 1 + months;
  const year = Math.floor(totalMonths / 12);
  const month = totalMonths - year * 12 + 1;
  return formatDate(year, month, Math.min(anchor.day, daysInMonth(year, month)));
}

function nextRecurrenceDate(anchorValue, todayValue, unit, intervalValue) {
  const anchor = parseDate(anchorValue);
  const today = parseDate(todayValue);
  const interval = Number(intervalValue);
  if (!["day", "week", "month"].includes(unit) || !Number.isInteger(interval) || interval < 1 || interval > 99) {
    throw new Error("Invalid recurrence rule");
  }

  let occurrence = 1;
  while (occurrence < 100000) {
    const value = unit === "month"
      ? addMonths(anchor, occurrence * interval)
      : addDays(anchor, occurrence * interval * (unit === "week" ? 7 : 1));
    if (parseDate(value).time > today.time) return value;
    occurrence += 1;
  }
  throw new Error("Unable to calculate recurrence date");
}

module.exports = { nextRecurrenceDate, parseDate };
