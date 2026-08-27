import { pb } from "../../lib/pocketbase";
import type { Create, LaunchersResponse, Update } from "../../lib/pb_types";

export async function getLaunchers(): Promise<LaunchersResponse[]> {
  return pb.collection("launchers").getFullList<LaunchersResponse>({ sort: "sort,name" });
}

export async function searchLaunchers(query: string): Promise<LaunchersResponse[]> {
  const escaped = query.replace(/"/g, '""');
  return pb.collection("launchers").getList<LaunchersResponse>(1, 8, {
    filter: `name ~ "${escaped}" || target ~ "${escaped}"`,
    sort: "sort,name",
  }).then((result) => result.items);
}

export async function createLauncher(data: Create<"launchers">) {
  return pb.collection("launchers").create<LaunchersResponse>(data);
}

export async function updateLauncher(id: string, data: Update<"launchers">) {
  return pb.collection("launchers").update<LaunchersResponse>(id, data);
}

export async function deleteLauncher(id: string) {
  await pb.collection("launchers").delete(id);
}

export async function updateLauncherSorts(items: Array<{ id: string; sort: number }>) {
  await Promise.all(items.map((item) => updateLauncher(item.id, { sort: item.sort })));
}

export async function launchItem(id: string): Promise<void> {
  await pb.send(`/api/things/launchers/${encodeURIComponent(id)}/launch`, { method: "POST" });
}
