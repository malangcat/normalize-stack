import type { Activity } from "./types";

export function diffActivities(
  a: Activity[],
  b: Activity[],
): {
  added: string[];
  removed: string[];
} {
  const aSet = new Set<string>();
  const bSet = new Set<string>();

  function walk(activities: Activity[], set: Set<string>) {
    for (const activity of activities) {
      set.add(activity.fullPath);
      walk(activity.children, set);
    }
  }

  walk(a, aSet);
  walk(b, bSet);

  const added = Array.from(bSet).filter((path) => !aSet.has(path));
  const removed = Array.from(aSet).filter((path) => !bSet.has(path));

  return { added, removed };
}
