// src/routes/__root.tsx
import { lazy, Suspense } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";

import "bootstrap/dist/css/bootstrap.min.css";

const RouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-router-devtools").then((module) => ({
        default: module.TanStackRouterDevtools,
      })),
    )
  : null;

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      {RouterDevtools ? (
        <Suspense fallback={null}>
          <RouterDevtools />
        </Suspense>
      ) : null}
    </>
  ),
});
