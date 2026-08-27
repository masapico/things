export type ProjectListView = "active" | "archived";
export type ProjectReturnTo = ProjectListView | "review";

export function parseProjectListView(value: unknown): ProjectListView {
  return value === "archived" ? "archived" : "active";
}

export function parseProjectReturnTo(value: unknown): ProjectReturnTo {
  if (value === "archived" || value === "review") return value;
  return "active";
}
