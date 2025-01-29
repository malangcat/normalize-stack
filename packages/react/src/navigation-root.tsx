import type { Navigator } from "@normalize-stack/core";
import { NavigatorProvider } from "./context";
import { StackRenderer } from "./renderer";

export interface NavigationRootProps {
  navigator: Navigator;
}

export function NavigationRoot(props: NavigationRootProps) {
  return (
    <NavigatorProvider navigator={props.navigator}>
      <StackRenderer />
    </NavigatorProvider>
  );
}
