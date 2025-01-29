import {
  Dismissed,
  Outlet,
  useActivity,
  usePop,
  usePush,
} from "@normalize-stack/react";

function Screen(props: { children: React.ReactNode }) {
  const activity = useActivity();

  return (
    <div
      style={{
        position: "absolute",
        zIndex: activity.index,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "white",
      }}
    >
      {props.children}
    </div>
  );
}

export function Main() {
  const push = usePush();

  const handleFunnelPush = async () => {
    const result = await push("/funnel");
    if (result === Dismissed) {
      window.alert("Push Dismissed");
    } else {
      window.alert(`Push Callback: ${result}`);
    }
  };

  return (
    <Screen>
      <h1>Main</h1>
      <p>This is the main page.</p>
      <button onClick={handleFunnelPush}>Go to Funnel</button>
    </Screen>
  );
}

export function Funnel() {
  const pop = usePop();

  return (
    <Outlet
      initial="/funnel/name"
      activityPropsMap={{
        "/funnel/email": {
          onComplete: () => pop("Hello"),
        },
      }}
    />
  );
}

export function FunnelName() {
  const push = usePush();
  const pop = usePop();

  return (
    <Screen>
      <h1>Funnel Name</h1>
      <p>This is the funnel name page.</p>
      <button onClick={() => pop()}>Back</button>
      <button onClick={() => push("/funnel/email")}>Next</button>
    </Screen>
  );
}

export function FunnelEmail(props: { onComplete: () => void }) {
  const pop = usePop();

  return (
    <Screen>
      <h1>Funnel Email</h1>
      <p>This is the funnel email page.</p>
      <button onClick={() => pop()}>Back</button>
      <button onClick={() => props.onComplete()}>Complete</button>
    </Screen>
  );
}

export function NotFound() {
  return (
    <Screen>
      <h1>Not Found</h1>
      <p>404: Page not found.</p>
    </Screen>
  );
}
