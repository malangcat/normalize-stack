import { useActivity, useNavigator } from "@normalize-stack/react";
import type * as React from "react";
import { usePresence } from "../Presence/usePresence";
import { flushSync } from "react-dom";

export interface AppScreenProps extends React.HTMLAttributes<HTMLDivElement> {}

const enterStyle = {
  animationName: "stack-enter",
  "--stack-enter-translate-x": "100%",
  animationTimingFunction: "cubic-bezier(0.22, 0.1, 0.3, 0.85)",
  animationDuration: "300ms",
} as React.CSSProperties;

const exitStyle = {
  animationName: "stack-exit",
  "--stack-exit-translate-x": "100%",
  animationTimingFunction: "cubic-bezier(0.22, 0.1, 0.3, 0.85)",
  animationDuration: "300ms",
};

export function AppScreen(props: { children: React.ReactNode }) {
  const activity = useActivity();
  const { exitFinished } = useNavigator();
  const { ref } = usePresence({
    present: activity.isPresent,
    onUnmount: () => {
      flushSync(() => {
        exitFinished();
      });
    },
  });

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      style={{
        position: "absolute",
        zIndex: activity.index,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "white",
        ...(activity.isPresent ? enterStyle : exitStyle),
      }}
    >
      {props.children}
    </div>
  );
}
