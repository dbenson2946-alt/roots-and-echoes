"use client";

import { useEffect, useRef } from "react";

/** Placed after the last line of a conversation (with a `key` that changes
 * when a line is added) so the newest line scrolls into view. */
export function ScrollToLatest() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);
  return <div ref={ref} aria-hidden="true" />;
}
