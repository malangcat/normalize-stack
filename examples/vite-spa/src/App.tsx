import { Debug } from "./Debug";
import {
  createHistoryNavigator,
  NavigatorProvider,
  StackRenderer,
} from "@normalize-stack/react";
import { routes } from "./routes";

const navigator = createHistoryNavigator(routes, console);

export function App() {
  return (
    <NavigatorProvider navigator={navigator}>
      <div
        style={{
          position: "relative",
          width: "480px",
          height: "640px",
          border: "1px solid black",
        }}
      >
        <StackRenderer />
      </div>
      <Debug />
    </NavigatorProvider>
  );
}
