import { createFileRoute } from "@tanstack/react-router";
import { ProjectDetailPage } from "../../../features/gtd/pages/ProjectDetailPage";

export const Route = createFileRoute("/_authenticated/gtd/$projectid")({
  component: RouteComponent,
});

function RouteComponent() {
  const { projectid } = Route.useParams();
  return <ProjectDetailPage projectId={projectid} />;
}