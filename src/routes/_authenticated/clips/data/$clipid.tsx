import { createFileRoute } from "@tanstack/react-router";
import { DataClipEditorPage } from "../../../../features/clips/pages/DataClipEditorPage";

function safeReturnTo(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/clips";
}

export const Route = createFileRoute("/_authenticated/clips/data/$clipid")({
  validateSearch: (search: Record<string, unknown>) => ({ returnTo: safeReturnTo(search.returnTo) }),
  component: RouteComponent,
});

function RouteComponent() {
  return <DataClipEditorPage clipId={Route.useParams().clipid} returnTo={Route.useSearch().returnTo} />;
}
