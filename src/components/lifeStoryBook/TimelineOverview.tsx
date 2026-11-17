"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

export interface OverviewDecade {
  /** first year of the decade, e.g. 1950 */
  start: number;
  /** "1950s" */
  label: string;
  /** one entry per milestone in this decade: 0–100, where in the decade
   * its year falls */
  positions: number[];
}

/**
 * The "whole life at a glance" strip that sits above the Life Story Book
 * timeline and stays pinned to the top of the screen while scrolling: one
 * cell per decade from the first milestone to today, a dot for every
 * milestone, and the decade currently on screen highlighted. Tapping a
 * decade scrolls the timeline to it.
 *
 * Each cell is a plain link to its decade's section (`#decade-1950`), so
 * it still works before this script has loaded; the click handler only
 * improves on that by allowing for the height of this pinned strip and
 * scrolling smoothly.
 *
 * One row at every screen size: the cells share the width evenly when
 * they fit, and the row scrolls sideways when they don't (a narrow phone,
 * or the largest text size) — a pinned strip that wrapped onto two or
 * three rows would cover too much of a small screen.
 */
export function TimelineOverview({ decades }: { decades: OverviewDecade[] }) {
  const navRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState<number | null>(null);

  // Work out which decade is at the top of the screen as the page scrolls.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const navBottom = navRef.current?.getBoundingClientRect().bottom ?? 0;
      let current: number | null = null;
      for (const d of decades) {
        const el = document.getElementById(`decade-${d.start}`);
        if (el && el.getBoundingClientRect().top <= navBottom + 40) current = d.start;
      }
      // At the very bottom of the page the last decade may be too short to
      // ever reach the top of the screen — it's still the one being read.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom && current !== null && decades.length > 0) current = decades[decades.length - 1].start;
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [decades]);

  // When the row is scrolling sideways, keep the highlighted decade in view.
  useEffect(() => {
    const row = rowRef.current;
    if (!row || active === null || row.scrollWidth <= row.clientWidth) return;
    const cell = row.querySelector<HTMLElement>(`[data-decade-cell="${active}"]`);
    if (!cell) return;
    row.scrollTo({ left: cell.offsetLeft - row.clientWidth / 2 + cell.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  function jumpTo(event: MouseEvent<HTMLAnchorElement>, start: number) {
    const target = document.getElementById(`decade-${start}`);
    if (!target) return; // fall back to the plain #link
    event.preventDefault();
    const navHeight = navRef.current?.offsetHeight ?? 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - navHeight - 12,
      behavior: reduceMotion ? "auto" : "smooth",
    });
    history.replaceState(null, "", `#decade-${start}`);
    target.focus({ preventScroll: true });
  }

  return (
    <nav
      ref={navRef}
      aria-label="Jump to a decade"
      className="sticky top-0 z-20 -mx-4 border-y border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 shadow-[0_6px_10px_-8px_rgba(43,36,32,0.35)]"
    >
      <ol ref={rowRef} className="flex overflow-x-auto">
        {decades.map((d, i) => {
          const isActive = active === d.start;
          const empty = d.positions.length === 0;
          const count = d.positions.length;
          return (
            <li key={d.start} className="flex flex-[1_0_4.1rem]">
              <a
                href={`#decade-${d.start}`}
                data-decade-cell={d.start}
                aria-current={isActive ? "true" : undefined}
                aria-label={`${d.label}: ${empty ? "no milestones" : count === 1 ? "1 milestone" : `${count} milestones`}`}
                onClick={(event) => jumpTo(event, d.start)}
                className={`flex w-full flex-col items-center gap-1 rounded-md pb-2 pt-1 ${
                  isActive ? "bg-[var(--color-life-tint)]" : "hover:bg-[var(--color-surface)]"
                }`}
              >
                <span
                  className={`text-base font-bold leading-tight ${
                    isActive
                      ? "text-[var(--color-life)]"
                      : empty
                        ? "text-[var(--color-text-muted)]"
                        : "text-[var(--color-text)]"
                  }`}
                >
                  {d.label}
                </span>
                {/* The life line: one continuous rule across every cell,
                    with a tick at the start of each decade and a dot per
                    milestone. Decorative — the count is in aria-label. */}
                <span aria-hidden="true" className="relative block h-4 w-full">
                  <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[var(--color-gold)]" />
                  <span className="absolute left-0 top-1/2 h-3 w-[2px] -translate-y-1/2 bg-[var(--color-gold)]" />
                  {i === decades.length - 1 && (
                    <span className="absolute right-0 top-1/2 h-3 w-[2px] -translate-y-1/2 bg-[var(--color-gold)]" />
                  )}
                  {/* kept a little clear of the cell's edges so a dot never
                      sits on top of a decade tick */}
                  {d.positions.map((position, index) => (
                    <span
                      key={index}
                      className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-bg)] bg-[var(--color-life)]"
                      style={{ left: `${Math.min(88, Math.max(12, position))}%` }}
                    />
                  ))}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
