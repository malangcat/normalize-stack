import type React from "react";
import { createContext, useContext } from "react";
import { ActivityContext, useNavigatorState } from "./context";
import type { Activity } from "@normalize-stack/core";

const OutletContext = createContext<React.ReactNode>(null);
const OutletPropsContext = createContext<OutletProps>({});

export interface OutletProps {
  activityPropsMap?: Record<string, unknown>;
}

/** Consumed by parent route components. */
export function Outlet(props: OutletProps) {
  const childElement = useContext(OutletContext);

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
  if (!activity) {
    return null;
  }

  return (
    <RouteWrapper
      key={activity.fullPath}
      activity={activity}
      childElement={
        activity.children.map((child) => {
          return createNestedElements(child);
        }) || null
      }
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
