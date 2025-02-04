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
  UIEvent,
  HistoryLocation,
  Logger,
  RouteConfig,
} from "./types";

export interface NavigatorState {
  activityIndex: number;
  flatActivities: FlatActivity[];
  activities: Activity[];
  location: HistoryLocation;
}

export const Dismissed: unique symbol = Symbol("Dismissed");

export class Navigator {
  private state: NavigatorState = {
    activityIndex: 0,
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
    this.exitFinished = this.exitFinished.bind(this);
    this.reduceState = this.reduceState.bind(this);
    this.notify = this.notify.bind(this);

    // Initialize state with router’s current location
    const initialLocation = history.getCurrentLocation();
    const initialActivity: FlatActivity = {
      depth: 0,
      index: 0,
      pathname: initialLocation.pathname,
      matchedRoutes: matchRoutes(routes, initialLocation.pathname),
    };
    this.state = {
      activityIndex: 0,
      flatActivities: [initialActivity],
      activities: composeActivities([initialActivity], initialActivity.index),
      location: initialLocation,
    };

    // Subscribe to history events & use a small reducer method to update state
    history.subscribe((event: HistoryEvent) => {
      this.logger?.log(event);

      const nextState = this.reduceState(this.state, event);
      this.resolveRemovedActivities(this.state, nextState);

      this.state = nextState;
      this.notify();
    });
  }

  private resolveRemovedActivities(prev: NavigatorState, curr: NavigatorState) {
    const diff = diffActivities(
      composeActivities(prev.flatActivities, prev.activityIndex),
      composeActivities(curr.flatActivities, curr.activityIndex),
    );
    diff.removed.forEach((path) => {
      this.resolveMap.get(path)?.(Dismissed);
      this.resolveMap.delete(path);
    });
  }

  /**
   * Reducer-like method that returns a new activities based on
   * the current activities plus the incoming RouterEvent.
   */
  private reduceState(
    prev: NavigatorState,
    event: HistoryEvent | UIEvent,
  ): NavigatorState {
    const presentActivities = prev.flatActivities.slice(
      0,
      prev.activityIndex + 1,
    );
    const top = prev.flatActivities[prev.activityIndex];
    if (!top) {
      throw new Error("reduceState: No top activity found.");
    }
    if ("from" in event && top.pathname !== event.from.pathname) {
      throw new Error(
        "reduceState: Location mismatch; top activity's pathname is different with event.from.pathname.",
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

        const pushIndex = presentActivities.findIndex(
          (a) =>
            isDescendant(a.matchedRoutes, matchedRoutes) ||
            isSibling(a.matchedRoutes, matchedRoutes),
        );

        if (pushIndex !== -1 && pushIndex < presentActivities.length - 1) {
          throw new Error(
            "push: Parent activity is present but not at the top of the stack. You must pop to a parent activity first.",
          );
        }

        return {
          activityIndex: newActivity.index,
          flatActivities: [...presentActivities, newActivity],
          activities: composeActivities(
            [...presentActivities, newActivity],
            newActivity.index,
          ),
          location: event.to,
        };
      }
      case "POP": {
        if (presentActivities.length === 1) {
          this.logger?.log("pop: Cannot pop the last activity.");
        }

        const index = presentActivities.findIndex(
          (a) => a.pathname === event.to.pathname,
        );
        if (index === -1) {
          throw new Error("pop: No matching activity found for pop event.");
        }

        // We don't remove activity now, just update the index. Activities will be removed on UIEvent.EXIT_FINISHED.
        return {
          activityIndex: index,
          flatActivities: prev.flatActivities,
          activities: composeActivities(prev.flatActivities, index),
          location: event.to,
        };
      }
      case "REPLACE": {
        const matchedRoutes = matchRoutes(this.routes, event.to.pathname);
        const lastIndex = presentActivities.length - 1;
        const replaceIndex = presentActivities
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
          index: presentActivities[lastIndex]!.index,
          pathname: event.to.pathname,
          matchedRoutes,
        };

        return {
          activityIndex: replacedActivity.index,
          flatActivities: [...presentActivities.slice(0, -1), replacedActivity],
          activities: composeActivities(
            [...presentActivities.slice(0, -1), replacedActivity],
            replacedActivity.index,
          ),
          location: event.to,
        };
      }
      case "EXIT_FINISHED": {
        return {
          activityIndex: prev.activityIndex,
          flatActivities: presentActivities,
          activities: composeActivities(presentActivities, prev.activityIndex),
          location: prev.location,
        };
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

  exitFinished() {
    this.state = this.reduceState(this.state, { type: "EXIT_FINISHED" });
    this.notify();
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
