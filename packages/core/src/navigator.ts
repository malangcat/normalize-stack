import { isDescendant, isSibling } from "./compare-route";
import { composeActivities } from "./compose-activities";
import { diffActivities } from "./diff-activities";
import { parseLocation } from "./history";
import { matchRoutes } from "./match-route";
import type {
  Activity,
  FlatActivity,
  History,
  HistoryEvent,
  HistoryLocation,
  Logger,
  RouteConfig,
} from "./types";

export interface NavigatorState {
  flatActivities: FlatActivity[];
  activities: Activity[];
  location: HistoryLocation;
}

export const Dismissed: unique symbol = Symbol("Dismissed");

export class Navigator {
  private state: NavigatorState = {
    flatActivities: [],
    activities: [],
    location: {
      pathname: "/",
      search: "",
      hash: "",
    },
  };
  private resolveMap: Map<string, (x: unknown | typeof Dismissed) => void> =
    new Map();
  private listeners: Set<() => void> = new Set();

  constructor(
    private history: History,
    private routes: RouteConfig[],
    private logger?: Logger,
  ) {
    // bind methods to the instance
    this.push = this.push.bind(this);
    this.pop = this.pop.bind(this);
    this.replace = this.replace.bind(this);
    this.setActivities = this.setActivities.bind(this);
    this.reduceFlatActivities = this.reduceFlatActivities.bind(this);
    this.notify = this.notify.bind(this);

    // Initialize state with router’s current location
    this.setActivities([
      {
        depth: 0,
        index: 0,
        pathname: history.getCurrentLocation().pathname,
        matchedRoutes: matchRoutes(
          this.routes,
          history.getCurrentLocation().pathname,
        ),
      },
    ]);

    // Subscribe to history events & use a small reducer method to update state
    history.subscribe((event: HistoryEvent) => {
      this.logger?.log(event);
      this.setActivities(
        this.reduceFlatActivities(this.state.flatActivities, event),
      );
      this.notify();
    });
  }

  /**
   * Set activities and update the derived state.
   */
  private setActivities(flatActivities: FlatActivity[]) {
    const activities = composeActivities(flatActivities);
    const diff = diffActivities(this.state.activities, activities);
    diff.removed.forEach((path) => {
      this.resolveMap.get(path)?.(Dismissed);
      this.resolveMap.delete(path);
    });

    this.state = {
      ...this.state,
      flatActivities,
      activities,
      location: this.history.getCurrentLocation(),
    };
  }

  /**
   * Reducer-like method that returns a new activities based on
   * the current activities plus the incoming RouterEvent.
   */
  private reduceFlatActivities(
    prev: FlatActivity[],
    event: HistoryEvent,
  ): FlatActivity[] {
    const top = prev[prev.length - 1]!;
    if (top.pathname !== event.from.pathname) {
      throw new Error(
        "reduceActivities: Location mismatch; top activity's pathname is different with event.from.pathname.",
      );
    }

    switch (event.type) {
      case "PUSH": {
        const matchedRoutes = matchRoutes(this.routes, event.to.pathname);
        const newActivity: FlatActivity = {
          depth: matchedRoutes.length - 1,
          index: top.index + 1,
          pathname: event.to.pathname,
          matchedRoutes,
        };

        const pushIndex = prev.findIndex(
          (a) =>
            isDescendant(a.matchedRoutes, matchedRoutes) ||
            isSibling(a.matchedRoutes, matchedRoutes),
        );

        if (pushIndex !== -1 && pushIndex < prev.length - 1) {
          throw new Error(
            "push: Parent activity is present but not at the top of the stack. You must pop to a parent activity first.",
          );
        }

        return [...prev, newActivity];
      }
      case "POP": {
        if (prev.length === 1) {
          this.logger?.log("pop: Cannot pop the last activity.");
        }

        const index = prev.findIndex((a) => a.pathname === event.to.pathname);
        if (index === -1) {
          throw new Error("pop: No matching activity found for pop event.");
        }

        return prev.slice(0, index + 1);
      }
      case "REPLACE": {
        const matchedRoutes = matchRoutes(this.routes, event.to.pathname);
        const lastIndex = prev.length - 1;
        const replaceIndex = prev
          .slice(0, -1)
          .findIndex(
            (a) =>
              isDescendant(a.matchedRoutes, matchedRoutes) ||
              isSibling(a.matchedRoutes, matchedRoutes),
          );

        if (replaceIndex !== -1 && replaceIndex < lastIndex - 1) {
          throw new Error(
            "replace: Parent activity is present but not at the top of the stack. You must pop to a parent activity first.",
          );
        }

        const replacedActivity: FlatActivity = {
          depth: matchedRoutes.length - 1,
          index: prev[lastIndex]!.index,
          pathname: event.to.pathname,
          matchedRoutes,
        };

        return [...prev.slice(0, lastIndex), replacedActivity];
      }
      default:
        // Unknown event type, return prev unchanged
        return prev;
    }
  }

  async push(to: string | Partial<HistoryLocation>) {
    this.history.push(to);
    const { pathname } = parseLocation(to);
    return new Promise<unknown>((resolve) => {
      // TODO: we have to use pathname here instead of JSON.stringify; but I'm lazy
      this.resolveMap.set(pathname, resolve);
    });
  }

  pop(value?: unknown) {
    const pathname =
      this.state.flatActivities[this.state.flatActivities.length - 1]!.pathname;
    this.resolveMap.get(pathname)?.(value);
    this.resolveMap.delete(pathname);
    this.history.pop();
  }

  replace(to: string | Partial<HistoryLocation>) {
    this.history.replace(to);
  }

  popUntil(predicate: (activity: FlatActivity) => boolean) {
    const index = this.state.flatActivities.findIndex(predicate);
    if (index === -1) {
      throw new Error(
        "popUntil: No matching activity found with the predicate.",
      );
    }

    const count = this.state.flatActivities.length - index;
    this.history.go(-count);
  }

  popFrom(from: string, value?: unknown) {
    this.resolveMap.get(from)?.(value);
    this.resolveMap.delete(from);
    this.popUntil((a) => !!a.matchedRoutes.find((r) => r.fullPath === from));
  }

  /** The core store subscription logic */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Notifies all subscribers that something changed. */
  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** The snapshot is what React will read with useSyncExternalStore. */
  getSnapshot(): NavigatorState {
    return this.state;
  }

  /** The server snapshot is optional for SSR. Could be the same or empty. */
  getServerSnapshot(): NavigatorState {
    return this.state;
  }
}
