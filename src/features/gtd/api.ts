import { pb } from "../../lib/pocketbase";
import type { TasksResponse, ProjectsResponse } from "../../lib/pb_types";
import { localCalendarDate } from "./recurrence";

export type CompleteTaskResult = {
  completedTaskId: string;
  nextTaskId: string | null;
};

export type UndoTaskCompletionResult = {
  restoredTaskId: string;
  deletedNextTaskId: string | null;
};

export async function completeTask(id: string): Promise<CompleteTaskResult> {
  return pb.send(`/api/things/tasks/${encodeURIComponent(id)}/complete`, {
    method: "POST",
    body: { today: localCalendarDate() },
  });
}

export async function undoTaskCompletion(id: string): Promise<UndoTaskCompletionResult> {
  return pb.send(`/api/things/tasks/${encodeURIComponent(id)}/undo-completion`, {
    method: "POST",
  });
}

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

export async function getReviewTasks(): Promise<TasksResponse[]> {
  return await pb.collection("tasks").getFullList<TasksResponse>({
    filter: 'status != "completed"',
    sort: "duedate,updated",
    expand: "project",
  });
}

export type DuplicateProjectInput = {
  name: string;
  memo?: string;
  startDate?: string;
  endDate?: string;
};

/** プロジェクトとそのタスクを複製する。タスクは status=inbox にリセットし、sort 順は維持する */
export async function duplicateProject(
  sourceProjectId: string,
  input: DuplicateProjectInput,
): Promise<ProjectsResponse> {
  const sourceProject = await getProject(sourceProjectId);
  const sourceTasks = await getProjectTasks(sourceProjectId);

  const newProject = await pb
    .collection("projects")
    .create<ProjectsResponse>({
      name: input.name,
      memo: input.memo || undefined,
      startDate: input.startDate || undefined,
      endDate: input.endDate || undefined,
      isActive: true,
      clips: sourceProject.clips ?? [],
    });

  // 同時作成の制約回避のため直列で作成する
  for (const task of sourceTasks) {
    await pb.collection("tasks").create<TasksResponse>({
      title: task.title,
      status: "inbox",
      project: newProject.id,
      sort: task.sort,
      memo: task.memo || undefined,
      priority: task.priority || undefined,
      clips: task.clips ?? [],
    });
  }

  return newProject;
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
