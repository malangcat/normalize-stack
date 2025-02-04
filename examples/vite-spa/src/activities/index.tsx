import { Dismissed, Outlet, usePop, usePush } from "@normalize-stack/react";
import { AppScreen } from "../ui/AppScreen/AppScreen";

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
    <AppScreen>
      <h1>Main</h1>
      <p>This is the main page.</p>
      <button onClick={handleFunnelPush}>Go to Funnel</button>
    </AppScreen>
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
    <AppScreen>
      <h1>Funnel Name</h1>
      <p>This is the funnel name page.</p>
      <button onClick={() => pop()}>Back</button>
      <button onClick={() => push("/funnel/email")}>Next</button>
    </AppScreen>
  );
}

export function FunnelEmail(props: { onComplete: () => void }) {
  const pop = usePop();

  return (
    <AppScreen>
      <h1>Funnel Email</h1>
      <p>This is the funnel email page.</p>
      <button onClick={() => pop()}>Back</button>
      <button onClick={() => props.onComplete()}>Complete</button>
    </AppScreen>
  );
}

export function NotFound() {
  return (
    <AppScreen>
      <h1>Not Found</h1>
      <p>404: Page not found.</p>
    </AppScreen>
  );
}
