"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { NewPhotoForm } from "@/components/NewPhotoForm";
import { NewPersonForm } from "@/components/NewPersonForm";
import type { Person } from "@/lib/types";

/** A big "+ Add …" button that unfolds its form in place, and folds it away
 * again once the thing has been saved (or on Cancel) — so the Photos &
 * Family page isn't a wall of forms. */
function Reveal({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-lg btn-primary">
        <Icon name="plus" className="h-5 w-5" /> {label}
      </button>
    );
  }
  return (
    <section className="tile tile-accent-photo w-full p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button type="button" onClick={() => setOpen(false)} className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base">
          Cancel
        </button>
      </div>
      {children(() => setOpen(false))}
    </section>
  );
}

export function AddPhotoPanel() {
  return (
    <Reveal label="Add a photo" title="Add a photo">
      {(close) => <NewPhotoForm onDone={close} />}
    </Reveal>
  );
}

export function AddPersonPanel({ people, seniorName }: { people: Person[]; seniorName?: string }) {
  return (
    <Reveal label="Add a person" title="Add a person to the family & friends circle">
      {(close) => <NewPersonForm people={people} seniorName={seniorName} onDone={close} />}
    </Reveal>
  );
}
