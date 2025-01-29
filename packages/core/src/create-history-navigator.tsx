import { BrowserHistory } from "./history";
import { Navigator } from "./navigator";
import type { Logger, RouteConfig } from "./types";

export function createHistoryNavigator(routes: RouteConfig[], logger?: Logger) {
  const navigator = new Navigator(new BrowserHistory(), routes, logger);

  return navigator;
}
