import { pb } from "../../lib/pocketbase";
import type { ContextsResponse, ContextsRecord, TasksResponse } from "../../lib/pb_types";

export async function getContexts(): Promise<ContextsResponse[]> {
  return await pb.collection("contexts").getFullList<ContextsResponse>({
    sort: "sort,name",
  });
}

export async function createContext(
  data: Pick<ContextsRecord, "name" | "sort">,
): Promise<ContextsResponse> {
  return await pb.collection("contexts").create<ContextsResponse>(data);
}

export async function updateContext(
  id: string,
  data: Partial<Pick<ContextsRecord, "name" | "sort">>,
): Promise<ContextsResponse> {
  return await pb.collection("contexts").update<ContextsResponse>(id, data);
}

export async function deleteContext(id: string): Promise<void> {
  await pb.collection("contexts").delete(id);
}

export async function getTasksByContext(contextId: string): Promise<TasksResponse[]> {
  return await pb.collection("tasks").getFullList<TasksResponse>({
    filter: `contexts ?~ "${contextId}"`,
    sort: "sort",
    expand: "project,contexts",
  });
}
