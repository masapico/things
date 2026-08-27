import { createFileRoute } from "@tanstack/react-router";
import { ProjectDetailPage } from "../../../features/gtd/pages/ProjectDetailPage";
import { parseProjectReturnTo } from "../../../features/gtd/navigation";

export const Route = createFileRoute("/_authenticated/gtd/$projectid")({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: parseProjectReturnTo(search.returnTo),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { projectid } = Route.useParams();
  const { returnTo } = Route.useSearch();
  return <ProjectDetailPage projectId={projectid} returnTo={returnTo} />;
}
