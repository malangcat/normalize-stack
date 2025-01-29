import type { MatchRouteResult } from "./types";

export function isSibling(a: MatchRouteResult[], b: MatchRouteResult[]) {
  return (
    a.length === b.length &&
    a.slice(0, -1).every((r, i) => r.fullPath === b[i]!.fullPath)
  );
}

export function isDescendant(a: MatchRouteResult[], b: MatchRouteResult[]) {
  return (
    a.length < b.length && a.every((r, i) => r.fullPath === b[i]!.fullPath)
  );
}
