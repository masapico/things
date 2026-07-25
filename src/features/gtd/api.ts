import { pb } from "../../lib/pocketbase";
import type { TasksResponse, ProjectsResponse } from "../../lib/pb_types";

export async function getIndexPageTasks(): Promise<TasksResponse[]> {
  return await pb.collection("tasks").getFullList<TasksResponse>({
    filter: '(status="inbox"&&project="" )||status="next"||status="waiting"',
    sort: "created",
    expand: "project,contexts",
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
