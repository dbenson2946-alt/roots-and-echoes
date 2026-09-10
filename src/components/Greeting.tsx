"use client";

import { useSyncExternalStore } from "react";

// The Home page's greeting used to be computed server-side (new Date() in a
// Server Component), which reflects the *server's* time zone (Vercel's
// functions run in UTC), not the visitor's — so "Good morning" could show up
// at 8pm local time. Computing it here instead, in the browser, uses the
// visitor's real local clock.
//
// useSyncExternalStore (rather than a useState+useEffect pair) is the
// React-recommended way to read a value that's necessarily different on the
// server (which can't know the visitor's time zone) than on the client: the
// server/first-paint snapshot is a neutral placeholder, and React swaps in
// the real client snapshot right after hydration, without a manual effect.

function computeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// The greeting never changes on its own after mount, so there's nothing to
// subscribe to — just hand back a no-op unsubscribe.
function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return "Hello";
}

export function Greeting() {
  const text = useSyncExternalStore(subscribe, computeGreeting, getServerSnapshot);
  return <>{text}</>;
}
