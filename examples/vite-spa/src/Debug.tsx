import { useNavigator, useNavigatorState } from "@normalize-stack/react";

export function Debug() {
  const navigator = useNavigator();
  const state = useNavigatorState();

  // `stack` will be the current array of RouterLocation
  const top = state.flatActivities[state.flatActivities.length - 1];

  return (
    <div>
      <h2>Current Path</h2>
      <p>Pathname: {state.location.pathname}</p>
      <p>Search: {state.location.search}</p>
      <p>Hash: {state.location.hash}</p>
      <p>Index: {state.activityIndex}</p>
      <p>
        Matched routes: {top.matchedRoutes.map((r) => r.route.path).join(", ")}
      </p>

      <h2>Flat Activities</h2>
      <pre>
        <code>{JSON.stringify(state.flatActivities, null, 2)}</code>
      </pre>

      <h2>Nested Activities</h2>
      <pre>
        <code>{JSON.stringify(state.activities, null, 2)}</code>
      </pre>

      {/* Example controls to push/pop/replace via the router */}
      <button onClick={() => navigator.push("/")}>Push Main</button>
      <button onClick={() => navigator.pop()}>Pop</button>
      <button onClick={() => navigator.replace("/")}>Replace Main</button>
      <button onClick={() => window.location.replace("/")}>Reset</button>
    </div>
  );
}
