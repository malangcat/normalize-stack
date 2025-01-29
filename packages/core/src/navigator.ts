import { isDescendant, isSibling } from "./compare-route";
import { composeActivities } from "./compose-activities";
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
    this.state = {
      ...this.state,
      flatActivities,
      activities: composeActivities(flatActivities),
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
    this.logger?.log(event);

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
        const beforeLastIndex = prev.length - 2;

        const activityBeforeReplace = prev[beforeLastIndex];

        if (
          activityBeforeReplace &&
          !isDescendant(activityBeforeReplace.matchedRoutes, matchedRoutes) &&
          !isSibling(activityBeforeReplace.matchedRoutes, matchedRoutes)
        ) {
          throw new Error(
            "replace: Replaced activity must be a sibling or a descendant of the previous activity.",
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

  // Imperative navigation methods delegate to the underlying history
  push(to: string | Partial<HistoryLocation>) {
    this.history.push(to);
  }

  pop() {
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

  popIndex(gte: number) {
    this.popUntil((activity) => activity.index >= gte);
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
