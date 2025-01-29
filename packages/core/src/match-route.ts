import type { MatchRouteResult, RouteConfig } from "./types";

/**
 * Recursively tries to match `pathname` against an array of RouteConfig.
 * Returns an array of matched routes (from outer to inner).
 * If no match is found, returns the fallback route with `path: "*"` if present,
 * otherwise an empty array.
 *
 * Example usage:
 *   const matched = matchRoutes(routes, "/funnel/name");
 *   // => [
 *   //      { path: "/funnel", render: Funnel },
 *   //      { path: "/funnel/name", render: FunnelName }
 *   //    ]
 */
export function matchRoutes(
  routes: RouteConfig[],
  pathname: string,
  parentPath: string = "",
): MatchRouteResult[] {
  let fallback: RouteConfig | undefined;

  // First pass: look for a fallback (path === "*") but don't match it yet.
  for (const route of routes) {
    if (route.path === "*") {
      fallback = route;
      break;
    }
  }

  // Second pass: try to match each route in order.
  for (const route of routes) {
    // Skip the fallback here (we handle it if no other match).
    if (route.path === "*") {
      continue;
    }

    // Compute the "full path" for this route by joining with parent path.
    const fullPath = resolvePath(parentPath, route.path);

    // 1) Exact match?
    if (pathname === fullPath) {
      // Return an array with this single matched route, using the fully-qualified path
      return [{ route, fullPath, leftoverPath: "" }];
    }

    // 2) Nested/partial match?
    //    If the current `fullPath` is a prefix of `pathname` + a slash,
    //    we try matching the leftover against this route's children.
    //    e.g. "/funnel" is prefix of "/funnel/name"
    if (
      // must match fullPath + "/" to allow nested routes
      pathname.startsWith(fullPath + "/") &&
      route.children
    ) {
      // leftover path after the parent's portion
      const leftoverPath = pathname.slice(fullPath.length + 1);

      // Recursively match children, passing `fullPath` as the new parent.
      const childMatches = matchRoutes(
        route.children,
        fullPath + "/" + leftoverPath,
        fullPath,
      );
      if (childMatches.length > 0) {
        // If the child matched, we prepend the current route to form a chain
        return [
          {
            route,
            fullPath,
            leftoverPath,
          },
          ...childMatches,
        ];
      }
    }
  }

  // If we reach here, no route matched exactly or partially.
  // Return the fallback route if defined, else empty array.
  if (fallback) {
    return [
      {
        route: fallback,
        // You might store the fallback's `path` or a special marker
        fullPath: fallback.path,
        leftoverPath: "",
      },
    ];
  }
  return [];
}

/**
 * Joins the parent path and a child route path into a normalized absolute path.
 * - If `routePath` already starts with "/", we treat it as absolute.
 * - Otherwise, we combine parentPath + "/" + routePath.
 */
function resolvePath(parentPath: string, routePath: string): string {
  if (routePath.startsWith("/")) {
    // Absolute path already
    return routePath;
  }
  if (!parentPath || parentPath === "/") {
    // Join to root
    return "/" + routePath;
  }
  // Normal join
  return parentPath + "/" + routePath;
}
