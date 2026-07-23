import { pb } from "../../lib/pocketbase";
import type { TasksResponse } from "../../lib/pb_types";

export async function getIndexPageTasks(): Promise<TasksResponse[]> {
  const result = await pb.collection("tasks").getFullList<TasksResponse>({
    filter: '(status="inbox"&&project="" )||status="next"||status="waiting"',
    sort: "-updated",
  });

  return result;
}
