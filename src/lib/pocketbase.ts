import PocketBase from "pocketbase";

export const pb = new PocketBase("http://127.0.0.1:8090");

// 同じコレクションへの連続リクエストで先行リクエストがキャンセルされるのを防ぐ
pb.autoCancellation(false);

export function Logout() {
  pb.authStore.clear();
}
