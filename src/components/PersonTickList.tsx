"use client";

import { useState } from "react";

export interface TickOption {
  /** Sent as `personId` — a people-table id, or the senior sentinel. */
  value: string;
  label: string;
}

/**
 * A "who is in this photo?" tick-list: big tick boxes in a scrolling box
 * (two columns from tablet width up), with a "Select none" button. Each
 * ticked box is submitted as its own `personId` value, so a server action
 * reads them with formData.getAll("personId").
 */
export function PersonTickList({ options, legend }: { options: TickOption[]; legend: string }) {
  const [ticked, setTicked] = useState<Set<string>>(new Set());

  const toggle = (value: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  return (
    <fieldset>
      <legend className="mb-2 text-lg font-bold">{legend}</legend>
      <div className="grid max-h-72 gap-1 overflow-y-auto rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-2 sm:grid-cols-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-lg hover:bg-[var(--color-photo-tint)]"
          >
            <input
              type="checkbox"
              name="personId"
              value={o.value}
              checked={ticked.has(o.value)}
              onChange={() => toggle(o.value)}
              className="h-6 w-6 shrink-0 accent-[var(--color-primary)]"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-base text-[var(--color-text-muted)]">
        <span aria-live="polite">{ticked.size === 0 ? "No one ticked yet" : `${ticked.size} ticked`}</span>
        {ticked.size > 0 && (
          <button
            type="button"
            onClick={() => setTicked(new Set())}
            className="font-semibold underline decoration-2 underline-offset-4"
          >
            Select none
          </button>
        )}
      </div>
    </fieldset>
  );
}
