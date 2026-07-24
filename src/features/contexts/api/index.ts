import { pb } from "../../../lib/pocketbase";
import type { ContextsResponse, ContextsRecord } from "../../../lib/pb_types";

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
