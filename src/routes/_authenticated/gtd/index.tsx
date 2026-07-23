import { createFileRoute } from "@tanstack/react-router";
import { GtdPage } from "../../../features/gtd/pages/GtdPage";

export const Route = createFileRoute("/_authenticated/gtd/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <GtdPage />;
}
