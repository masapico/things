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

export async function getProjectTasks(projectId: string): Promise<TasksResponse[]> {
  return await pb.collection("tasks").getFullList<TasksResponse>({
    filter: `project = "${projectId}"`,
    sort: "sort",
  });
}
