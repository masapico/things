import { createFileRoute } from "@tanstack/react-router";
import { GtdPage } from "../../../features/gtd/pages/GtdPage";
import { parseProjectListView } from "../../../features/gtd/navigation";

export const Route = createFileRoute("/_authenticated/gtd/")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: parseProjectListView(search.view),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { view } = Route.useSearch();
  return <GtdPage view={view} />;
}
