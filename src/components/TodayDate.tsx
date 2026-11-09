"use client";

import { useSyncExternalStore } from "react";

// Same reasoning as Greeting.tsx: a server-rendered date would reflect the
// *server's* time zone (Vercel's functions run in UTC), not the visitor's —
// so this is computed here, in the browser, from the visitor's own clock,
// using useSyncExternalStore the same way Greeting does.
//
// Unlike the greeting, this value is meant to help someone orient themselves
// to today's day of the week and date (design principle §2 / §1 — this is
// aimed at users who may have short-term memory difficulties), so it's worth
// keeping correct even if the Home page is left open for a while (e.g. on a
// tablet) rather than only computing it once at load. The subscription below
// re-checks every minute and only notifies React when the formatted string
// has actually changed (i.e. in practice, right after midnight).

function computeToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function subscribe(onStoreChange: () => void) {
  let current = computeToday();
  const interval = setInterval(() => {
    const next = computeToday();
    if (next !== current) {
      current = next;
      onStoreChange();
    }
  }, 60_000);
  return () => clearInterval(interval);
}

// Neutral placeholder for the server/first-paint snapshot — swapped for the
// visitor's real local date right after hydration, same pattern as Greeting.
function getServerSnapshot() {
  return "";
}

export function TodayDate() {
  const text = useSyncExternalStore(subscribe, computeToday, getServerSnapshot);
  if (!text) return null;
  return (
    <p className="mt-1 text-lg text-[var(--color-text-muted)] text-center">
      {text}
    </p>
  );
}
