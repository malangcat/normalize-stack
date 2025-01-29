export function flatten<T>(arr: T[], getChildren: (item: T) => T[]): T[] {
  return arr.flatMap((node) => [
    node,
    ...flatten(getChildren(node), getChildren),
  ]);
}
