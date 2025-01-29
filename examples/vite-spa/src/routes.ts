import { Funnel, FunnelEmail, FunnelName, Main, NotFound } from "./activities";
import type { RouteConfig } from "@normalize-stack/react";

export const routes: RouteConfig[] = [
  {
    path: "funnel",
    render: Funnel,
    children: [
      {
        path: "name",
        render: FunnelName,
      },
      {
        path: "email",
        render: FunnelEmail,
      },
    ],
  },
  {
    path: "/",
    render: Main,
  },
  {
    path: "*",
    render: NotFound,
  },
];
