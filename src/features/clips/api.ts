import { pb } from "../../lib/pocketbase";
import type { ClipsResponse } from "../../lib/pb_types";

export async function getClips(): Promise<ClipsResponse[]> {
  const result = await pb.collection("clips").getFullList<ClipsResponse>({
    sort: "-created",
  });

  return result;
}

export async function updateClip(
  id: string,
  data: { name?: string; text?: string },
): Promise<void> {
  await pb.collection("clips").update(id, data);
}

export async function deleteClip(id: string): Promise<void> {
  await pb.collection("clips").delete(id);
}
