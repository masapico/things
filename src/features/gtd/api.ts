import { pb } from "../../lib/pocketbase";
import type { TasksResponse, ProjectsResponse } from "../../lib/pb_types";

export async function getIndexPageTasks(): Promise<TasksResponse[]> {
  return await pb.collection("tasks").getFullList<TasksResponse>({
    filter: '(status="inbox"&&project="" )||status="next"||status="waiting" ||duedate!=""',
    sort: "duedate,created",
    expand: "project",
  });
}

export async function getActiveProjects(): Promise<ProjectsResponse[]> {
  return await pb.collection("projects").getFullList<ProjectsResponse>({
    filter: "isActive = true",
    sort: "-updated",
  });
}

export async function getArchivedProjects(): Promise<ProjectsResponse[]> {
  return await pb.collection("projects").getFullList<ProjectsResponse>({
    filter: "isActive = false",
    sort: "-updated",
  });
}

/** プロジェクトごとのタスク進捗（完了数 / 総数）を一括取得 */
export async function getProjectTaskCounts(): Promise<
  Map<string, { total: number; completed: number }>
> {
  const tasks = await pb.collection("tasks").getFullList<TasksResponse>({
    filter: 'project != ""',
    fields: "project,status",
  });
  const counts = new Map<string, { total: number; completed: number }>();
  for (const task of tasks) {
    if (!task.project) continue;
    const entry = counts.get(task.project) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (task.status === "completed") entry.completed += 1;
    counts.set(task.project, entry);
  }
  return counts;
}

export async function getProject(id: string): Promise<ProjectsResponse> {
  return await pb.collection("projects").getOne<ProjectsResponse>(id);
}

export async function getProjectTasks(projectId: string): Promise<TasksResponse[]> {
  return await pb.collection("tasks").getFullList<TasksResponse>({
    filter: `project = "${projectId}"`,
    sort: "sort",
  });
}

export async function searchTasks(query: string): Promise<TasksResponse[]> {
  const escaped = query.replace(/"/g, '""');
  return await pb.collection("tasks").getFullList<TasksResponse>({
    filter: `title ~ "${escaped}"`,
    sort: "-updated",
  });
}

export async function searchProjects(query: string): Promise<ProjectsResponse[]> {
  const escaped = query.replace(/"/g, '""');
  return await pb.collection("projects").getFullList<ProjectsResponse>({
    filter: `name ~ "${escaped}"`,
    sort: "-updated",
  });
}
