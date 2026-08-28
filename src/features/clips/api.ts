import { pb } from "../../lib/pocketbase";
import type { ClipsResponse, Create, Update } from "../../lib/pb_types";
import type { DataClipDocumentV1 } from "./data/dataClipModel";

export async function getClips(): Promise<ClipsResponse[]> {
  const result = await pb.collection("clips").getFullList<ClipsResponse>({
    sort: "-created",
  });

  return result;
}

export async function getClipsPage({
  pageParam = 1,
}: {
  pageParam?: number;
}): Promise<{ items: ClipsResponse[]; page: number; totalPages: number }> {
  const perPage = 9;
  const result = await pb
    .collection("clips")
    .getList<ClipsResponse>(pageParam, perPage, {
      sort: "-created",
    });
  return {
    items: result.items,
    page: result.page,
    totalPages: result.totalPages,
  };
}

export async function getRecentClips(limit = 50): Promise<ClipsResponse[]> {
  const result = await pb.collection("clips").getList<ClipsResponse>(1, limit, {
    sort: "-created",
    fields: "id,name,kind,file,filename,created,updated",
  });
  return result.items;
}

export async function getClipsByIds(ids: string[]): Promise<ClipsResponse[]> {
  if (ids.length === 0) return [];
  const filter = ids.map((id) => `id = "${id}"`).join(" || ");
  return await pb.collection("clips").getFullList<ClipsResponse>({
    filter,
    sort: "-created",
  });
}

export async function searchClips(query: string): Promise<ClipsResponse[]> {
  const escaped = query.replace(/"/g, '""');
  return await pb.collection("clips").getFullList<ClipsResponse>({
    filter: `name ~ "${escaped}" || text ~ "${escaped}" || dataSearch ~ "${escaped}"`,
    sort: "-created",
  });
}

export async function updateClip(
  id: string,
  data: Update<"clips">,
): Promise<ClipsResponse> {
  return await pb.collection("clips").update<ClipsResponse>(id, data);
}

export async function getClip(id: string): Promise<ClipsResponse> {
  return await pb.collection("clips").getOne<ClipsResponse>(id);
}

export async function createDataClip(name: string, document: DataClipDocumentV1): Promise<ClipsResponse> {
  const data: Create<"clips"> = {
    kind: "data",
    name,
    data: document,
    dataSearch: document.columns.map((column) => column.name).join(" "),
  };
  return await pb.collection("clips").create<ClipsResponse>(data);
}

export async function updateDataClip(id: string, name: string, document: DataClipDocumentV1): Promise<ClipsResponse> {
  return await updateClip(id, {
    kind: "data",
    name,
    data: document,
    dataSearch: document.columns.map((column) => column.name).join(" "),
  });
}

export async function deleteClip(id: string): Promise<void> {
  await pb.collection("clips").delete(id);
}
