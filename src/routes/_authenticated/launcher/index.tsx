import { createFileRoute } from "@tanstack/react-router";
import { LauncherPage } from "../../../features/launcher/pages/LauncherPage";

export const Route = createFileRoute("/_authenticated/launcher/")({ component: LauncherPage });
