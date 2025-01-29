import type { History, HistoryEvent, HistoryLocation } from "./types";

function parseLocation(
  to: string | Partial<HistoryLocation>,
  base: HistoryLocation = { pathname: "/", search: "", hash: "" },
): HistoryLocation {
  if (typeof to === "string") {
    // Parse with an offscreen <a> or new URL() for convenience
    const url = new URL(to, "http://example.com");
    return {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    };
  }

  // Merge with base if needed
  return {
    pathname: to.pathname ?? base.pathname,
    search: to.search ?? "",
    hash: to.hash ?? "",
  };
}

export class MemoryHistory implements History {
  private listeners: Array<(event: HistoryEvent) => void> = [];
  private stack: HistoryLocation[] = [];
  private index: number = -1;

  constructor(initialPath: string = "/") {
    // convert initialPath to a HistoryLocation
    const loc = parseLocation(initialPath);
    this.stack.push(loc);
    this.index = 0;
  }

  getCurrentLocation(): HistoryLocation {
    return this.stack[this.index]!;
  }

  push(to: string | Partial<HistoryLocation>) {
    const from = this.getCurrentLocation();
    const nextLoc = parseLocation(to, from);
    // drop forward entries if any
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(nextLoc);
    this.index++;
    this.emit({ type: "PUSH", from, to: nextLoc });
  }

  pop() {
    if (this.index > 0) {
      const from = this.getCurrentLocation();
      this.index--;
      const to = this.getCurrentLocation();
      this.emit({ type: "POP", from, to });
    }
  }

  replace(to: string | Partial<HistoryLocation>) {
    const from = this.getCurrentLocation();
    const nextLoc = parseLocation(to, from);
    this.stack[this.index] = nextLoc;
    this.emit({ type: "REPLACE", from, to: nextLoc });
  }

  /**
   * go(n):
   * - n > 0 => go forward n steps if possible
   * - n < 0 => go back |n| steps if possible
   */
  go(n: number) {
    if (n === 0) return; // no move
    const from = this.getCurrentLocation();

    let newIndex = this.index + n;
    // clamp to valid range
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= this.stack.length) {
      newIndex = this.stack.length - 1;
    }

    if (newIndex !== this.index) {
      this.index = newIndex;
      const to = this.getCurrentLocation();

      // In a real browser, going forward/back triggers a "POP" event.
      // We'll mimic that by emitting POP here.
      this.emit({ type: "POP", from, to });
    }
  }

  subscribe(listener: (event: HistoryEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: HistoryEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export class BrowserHistory implements History {
  private listeners: Array<(event: HistoryEvent) => void> = [];
  private currentLocation: HistoryLocation;

  constructor() {
    // parse the current window.location
    this.currentLocation = this.readWindowLocation();
    // Listen for popstate
    window.addEventListener("popstate", this.handlePopState);
  }

  getCurrentLocation(): HistoryLocation {
    return this.currentLocation;
  }

  push(to: string | Partial<HistoryLocation>) {
    const from = this.currentLocation;
    const nextLoc = parseLocation(to, from);
    const url = this.toUrlString(nextLoc);
    window.history.pushState({}, "", url);
    this.currentLocation = nextLoc;
    this.emit({ type: "PUSH", from, to: nextLoc });
  }

  pop() {
    // user triggered a back event
    // the actual location change will be handled in handlePopState
    window.history.back();
  }

  replace(to: string | Partial<HistoryLocation>) {
    const from = this.currentLocation;
    const nextLoc = parseLocation(to, from);
    const url = this.toUrlString(nextLoc);
    window.history.replaceState({}, "", url);
    this.currentLocation = nextLoc;
    this.emit({ type: "REPLACE", from, to: nextLoc });
  }

  /**
   * go(n):
   * - calls window.history.go(n)
   * - real location update is handled via 'popstate' events
   */
  go(n: number) {
    window.history.go(n);
    // The actual location change & event emission happen in handlePopState.
  }

  subscribe(listener: (event: HistoryEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private handlePopState = () => {
    const from = this.currentLocation;
    const to = this.readWindowLocation();
    this.currentLocation = to;
    this.emit({ type: "POP", from, to });
  };

  private readWindowLocation(): HistoryLocation {
    return {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    };
  }

  private toUrlString(loc: HistoryLocation): string {
    return loc.pathname + (loc.search || "") + (loc.hash || "");
  }

  private emit(event: HistoryEvent) {
    this.listeners.forEach((l) => l(event));
  }
}
