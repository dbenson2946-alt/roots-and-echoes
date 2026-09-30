"use client";

import { useState, useTransition } from "react";
import { submitEditPerson, submitDeletePerson } from "@/app/actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { Icon } from "@/components/Icon";
import { RELATIONSHIP_LABELS, LIVING_STATUS_LABELS } from "@/lib/ui";
import type { Person, RelationshipType } from "@/lib/types";

/** One row in the "Family & friends" list — a plain view by default, or an
 * inline edit form in place of it when "Edit" is tapped. Deleting uses the
 * shared two-step ConfirmDeleteButton rather than a native confirm().
 *
 * `allPeople` is the full family & friends list (this person included) —
 * used to populate the Spouse/Parent pickers with everyone else already in
 * the tree, and to look up names for the read-only "Spouse" / "Parent(s)"
 * summary line. */
export function PersonRow({ person, allPeople }: { person: Person; allPeople: Person[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const others = allPeople.filter((p) => p.id !== person.id);
  const spouse = person.spouseId ? allPeople.find((p) => p.id === person.spouseId) : undefined;
  const parents = person.parentIds.map((id) => allPeople.find((p) => p.id === id)).filter((p): p is Person => Boolean(p));

  if (editing) {
    return (
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            try {
              await submitEditPerson(formData);
              setEditing(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Something went wrong saving this.");
            }
          });
        }}
        className="tile tile-compact tile-accent-photo space-y-3 p-4"
      >
        <input type="hidden" name="personId" value={person.id} />
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            name="name"
            defaultValue={person.name}
            required
            placeholder="Full name"
            aria-label="Full name"
            className="rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
          />
          <select
            name="relationship"
            defaultValue={person.relationshipToSenior}
            aria-label="Relationship"
            className="rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
          >
            {(Object.keys(RELATIONSHIP_LABELS) as RelationshipType[]).map((key) => (
              <option key={key} value={key}>
                {RELATIONSHIP_LABELS[key]}
              </option>
            ))}
          </select>
          <input
            name="relationshipLabel"
            defaultValue={person.relationshipLabel || ""}
            placeholder="Add detail (optional)"
            aria-label="Relationship detail"
            className="rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
          />
        </div>

        <div>
          <label htmlFor={`living-${person.id}`} className="mb-1 block text-base font-semibold">
            Living status
          </label>
          <select
            id={`living-${person.id}`}
            name="livingStatus"
            defaultValue={person.livingStatus ?? "living"}
            className="w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-lg sm:w-auto"
          >
            {(Object.keys(LIVING_STATUS_LABELS) as (keyof typeof LIVING_STATUS_LABELS)[]).map((key) => (
              <option key={key} value={key}>
                {LIVING_STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor={`spouse-${person.id}`} className="mb-1 block text-base font-semibold">
              Spouse / partner
            </label>
            <select
              id={`spouse-${person.id}`}
              name="spouseId"
              defaultValue={person.spouseId ?? ""}
              className="w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
            >
              <option value="">Not set</option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`parent1-${person.id}`} className="mb-1 block text-base font-semibold">
              Parent
            </label>
            <select
              id={`parent1-${person.id}`}
              name="parentId1"
              defaultValue={person.parentIds[0] ?? ""}
              className="w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
            >
              <option value="">Not set</option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`parent2-${person.id}`} className="mb-1 block text-base font-semibold">
              Second parent
            </label>
            <select
              id={`parent2-${person.id}`}
              name="parentId2"
              defaultValue={person.parentIds[1] ?? ""}
              className="w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
            >
              <option value="">Not set</option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] text-accent">
          Setting a spouse pairs the two of them together on the family tree. Setting a parent (or two) nests this person
          underneath them, instead of in the general row for their generation.
        </p>

        {error && (
          <p role="status" className="text-base text-[var(--color-danger)]">
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
            onClick={() => setEditing(false)}
            className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="tile tile-compact tile-accent-photo flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-lg font-bold">{person.name}</p>
        <p className="text-base text-[var(--color-text-muted)]">
          {person.relationshipLabel || RELATIONSHIP_LABELS[person.relationshipToSenior]}
          {person.livingStatus === "deceased" ? " · In loving memory" : ""}
        </p>
        {(spouse || parents.length > 0) && (
          <p className="text-sm text-[var(--color-text-muted)] text-accent">
            {spouse && `Spouse: ${spouse.name}`}
            {spouse && parents.length > 0 && "  ·  "}
            {parents.length > 0 && `Parent${parents.length > 1 ? "s" : ""}: ${parents.map((p) => p.name).join(" & ")}`}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base"
        >
          <Icon name="edit" className="h-4 w-4" /> Edit
        </button>
        <ConfirmDeleteButton
          action={submitDeletePerson}
          fields={{ personId: person.id }}
          idleLabel="Delete"
          confirmQuestion={`Remove ${person.name.split(" ")[0]}? Their tags on photos and links to memories will go too — the photos and memories themselves stay.`}
        />
      </div>
    </div>
  );
}
