import type { Activity, FlatActivity } from "./types";

export function composeActivities(flatActivities: FlatActivity[]): Activity[] {
  const activities: Activity[] = [];

  for (const { matchedRoutes, index } of flatActivities) {
    let currentLevel = activities;
    let node: Activity | undefined = undefined;

    for (let i = 0; i < matchedRoutes.length; i++) {
      const matched = matchedRoutes[i]!;
      node = currentLevel.find((n) => n.fullPath === matched.fullPath);

      if (!node) {
        node = {
          fullPath: matched.fullPath,
          depth: i,
          index,
          render: matched.route.render,
          children: [],
        };
        currentLevel.push(node);
      }

      currentLevel = node.children;
    }
  }

  return activities;
}
