import type { Activity } from "@normalize-stack/core";
import type React from "react";
import { createContext, useContext, useEffect, useRef } from "react";
import {
  ActivityContext,
  useActivity,
  useNavigatorState,
  useReplace,
} from "./context";

const OutletContext = createContext<React.ReactNode>(null);
const OutletPropsContext = createContext<OutletProps>({});

export interface OutletProps {
  initial?: string;

  activityPropsMap?: Record<string, unknown>;
}

/** Consumed by parent route components. */
export function Outlet(props: OutletProps) {
  const childElement = useContext(OutletContext);
  const activity = useActivity();
  const replace = useReplace();
  const { location } = useNavigatorState();
  const replacedInitalRef = useRef(false);

  useEffect(() => {
    if (
      !replacedInitalRef.current &&
      props.initial &&
      activity.fullPath === location.pathname
    ) {
      replace(props.initial);
      replacedInitalRef.current = true;
    }
  }, [props.initial, activity.fullPath, location.pathname, replace]);

  return (
    <OutletPropsContext.Provider value={props}>
      {childElement}
    </OutletPropsContext.Provider>
  );
}

/**
 * A small wrapper that places `childElement` into context,
 * so that `<Outlet />` can render it.
 */
function RouteWrapper({
  activity,
  childElement,
}: {
  activity: Activity;
  childElement: React.ReactNode;
}) {
  const { activityPropsMap = {} } = useContext(OutletPropsContext);
  const activityProps = activityPropsMap[activity.fullPath] || {};
  const Component = activity.render;

  return (
    <ActivityContext.Provider value={activity}>
      <OutletContext.Provider value={childElement}>
        <Component {...activityProps} />
      </OutletContext.Provider>
    </ActivityContext.Provider>
  );
}

function createNestedElements(activity: Activity): React.ReactNode {
  return (
    <RouteWrapper
      key={activity.fullPath}
      activity={activity}
      childElement={activity.children.map((child) => {
        return createNestedElements(child);
      })}
    />
  );
}

export function StackRenderer() {
  const { activities } = useNavigatorState();

  return (
    <>
      {activities.map((activity) => {
        return createNestedElements(activity);
      })}
    </>
  );
}
