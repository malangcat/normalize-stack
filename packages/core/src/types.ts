export interface HistoryLocation {
  /** e.g. "/users", "/about" */
  pathname: string;
  /** e.g. "?foo=bar", or "" if none */
  search: string;
  /** e.g. "#section1", or "" if none */
  hash: string;
}

export interface HistoryEvent {
  type: "PUSH" | "POP" | "REPLACE";
  from: HistoryLocation;
  to: HistoryLocation;
}

/**
 * string inputs are internally converted to RouterLocation.
 */
export interface History {
  push(to: string | Partial<HistoryLocation>): void;
  pop(): void;
  replace(to: string | Partial<HistoryLocation>): void;
  go(delta: number): void;

  subscribe(listener: (event: HistoryEvent) => void): () => void;
  getCurrentLocation(): HistoryLocation;
}

export interface RouteConfig {
  path: string;

  render: (props?: any) => any;

  children?: RouteConfig[];
}

export interface MatchRouteResult {
  route: RouteConfig;
  fullPath: string;
  leftoverPath: string;
}

export interface FlatActivity {
  pathname: string;

  depth: number;

  index: number;

  matchedRoutes: MatchRouteResult[];
}

export interface Activity {
  fullPath: string;

  depth: number;

  index: number;

  render: (props?: any) => any;

  children: Activity[];
}

export interface Logger {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}
