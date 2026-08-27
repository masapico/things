import { createFileRoute } from "@tanstack/react-router";
import { ReviewPage } from "../../../features/gtd/pages/ReviewPage";

export const Route = createFileRoute("/_authenticated/gtd/review")({
  component: ReviewPage,
});
