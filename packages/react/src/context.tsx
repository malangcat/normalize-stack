import type {
  Activity,
  Navigator,
  NavigatorState,
} from "@normalize-stack/core";
import { createContext, useContext, useSyncExternalStore } from "react";

export const NavigatorContext = createContext<Navigator | null>(null);

export const NavigatorStateContext = createContext<NavigatorState | null>(null);

export const ActivityContext = createContext<Activity | null>(null);

export function NavigatorProvider({
  navigator,
  children,
}: {
  navigator: Navigator;
  children: React.ReactNode;
}) {
  const navigatorState = useSyncExternalStore(
    (listener) => navigator.subscribe(listener),
    () => navigator.getSnapshot(),
    () => navigator.getServerSnapshot(),
  );

  return (
    <NavigatorContext.Provider value={navigator}>
      <NavigatorStateContext.Provider value={navigatorState}>
        {children}
      </NavigatorStateContext.Provider>
    </NavigatorContext.Provider>
  );
}

export function useNavigator(): Navigator {
  const navigator = useContext(NavigatorContext);

  if (!navigator) {
    throw new Error("No navigator context available.");
  }

  return navigator;
}

export function useNavigatorState(): NavigatorState {
  const navigatorState = useContext(NavigatorStateContext);

  if (!navigatorState) {
    throw new Error("No navigator state context available.");
  }

  return navigatorState;
}

export function useActivity(): Activity {
  const activity = useContext(ActivityContext);

  if (!activity) {
    throw new Error("useActivity: No activity found for the current path.");
  }

  return activity;
}

export function usePush(): Navigator["push"] {
  const navigator = useNavigator();

  return navigator.push;
}

export function usePop() {
  const navigator = useNavigator();
  const activity = useActivity();

  return (value?: unknown) => navigator.popFrom(activity.fullPath, value);
}

export function useReplace(): Navigator["replace"] {
  const navigator = useNavigator();

  return navigator.replace;
}
