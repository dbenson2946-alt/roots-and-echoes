"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { submitDeletePerson, submitEditOwnName } from "@/app/actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { PersonEditForm, type SavedPersonValues } from "@/components/PersonEditForm";
import type { Person } from "@/lib/types";

/**
 * The panel that opens under the family tree when someone taps a circle.
 * It is deliberately NOT a modal dialog (the app never traps people in a
 * pop-up — see plan §2.4): it sits in the page, has a visible Cancel, closes
 * with Escape, and the tree stays visible and scrollable above it.
 */
function PanelShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  // Escape closes the panel wherever the keyboard focus happens to be (it is
  // usually still on the circle that was tapped, outside the panel).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <section
      ref={ref}
      aria-label={title}
      className="mt-6 rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-5"
    >
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function PersonEditPanel({
  person,
  allPeople,
  seniorName,
  onSaved,
  onDeleted,
  onClose,
}: {
  person: Person;
  allPeople: Person[];
  seniorName: string;
  onSaved: (saved: SavedPersonValues) => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
  return (
    <PanelShell title={`Edit ${person.name}`} onClose={onClose}>
      <PersonEditForm
        key={person.id}
        person={person}
        allPeople={allPeople}
        seniorName={seniorName}
        idPrefix="tree-"
        onSaved={onSaved}
        onCancel={onClose}
        extraActions={
          <ConfirmDeleteButton
            action={submitDeletePerson}
            fields={{ personId: person.id }}
            idleLabel="Delete"
            confirmQuestion={`Remove ${person.name.split(" ")[0]}? Their tags on photos and links to memories will go too — the photos and memories themselves stay.`}
            onDone={onDeleted}
          />
        }
      />
    </PanelShell>
  );
}

/** The account owner changing their own name from their circle. */
export function OwnNamePanel({
  name,
  onSaved,
  onClose,
}: {
  name: string;
  onSaved: (newName: string) => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <PanelShell title="Change your name" onClose={onClose}>
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            try {
              const result = await submitEditOwnName(formData);
              if (result.status === "error") {
                setError(result.message);
                return;
              }
              onSaved(String(formData.get("name") || "").trim().replace(/\s+/g, " "));
            } catch (err) {
              setError(err instanceof Error ? err.message : "Something went wrong saving this.");
            }
          });
        }}
        className="space-y-3"
      >
        <label htmlFor="own-name" className="block text-base font-semibold">
          Your name
        </label>
        <input
          id="own-name"
          name="name"
          defaultValue={name}
          required
          maxLength={80}
          className="w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-lg sm:max-w-md"
        />
        <p className="text-sm text-[var(--color-text-muted)] text-accent">
          The letters in your circle follow your name automatically.
        </p>
        {error && (
          <p role="alert" className="text-base text-[var(--color-danger)]">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="btn-lg btn-primary !min-h-0 !py-2 !px-4 text-base">
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base"
          >
            Cancel
          </button>
        </div>
      </form>
    </PanelShell>
  );
}
