"use client";

import { useRef, useState, useTransition } from "react";
import { submitNewPerson } from "@/app/actions";
import { Icon } from "@/components/Icon";
import { RELATIONSHIP_LABELS, SENIOR_SPOUSE_VALUE } from "@/lib/ui";
import type { Person, RelationshipType } from "@/lib/types";
import { errorText } from "@/lib/errorText";

/** The "add a person" form. `onDone` runs after the person is saved (the
 * Photos page uses it to fold the form away again). */
export function NewPersonForm({
  people,
  seniorName,
  onDone,
}: {
  people: Person[];
  seniorName?: string;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const field = "rounded-xl border-2 border-[var(--color-border)] p-3 text-lg";

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await submitNewPerson(formData);
            formRef.current?.reset();
            onDone?.();
          } catch (err) {
            setError(errorText(err, "Something went wrong adding this person."));
          }
        });
      }}
      className="grid gap-4 sm:grid-cols-3"
    >
      <input name="name" required placeholder="Full name" aria-label="Full name" className={field} />
      <select name="relationship" defaultValue="other" aria-label="Relationship" className={field}>
        {(Object.keys(RELATIONSHIP_LABELS) as RelationshipType[]).map((key) => (
          <option key={key} value={key}>
            {RELATIONSHIP_LABELS[key]}
          </option>
        ))}
      </select>
      <input name="relationshipLabel" placeholder="Add detail (optional)" aria-label="Relationship detail" className={field} />

      <select name="spouseId" defaultValue="" aria-label="Spouse or partner (optional)" className={field}>
        <option value="">Spouse / partner (optional)</option>
        {seniorName && <option value={SENIOR_SPOUSE_VALUE}>{seniorName} (you)</option>}
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {people.length > 0 && (
        <>
          <select name="parentId1" defaultValue="" aria-label="Parent (optional)" className={field}>
            <option value="">Parent (optional)</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select name="parentId2" defaultValue="" aria-label="Second parent (optional)" className={field}>
            <option value="">Second parent (optional)</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </>
      )}

      {error && (
        <p role="alert" className="text-lg text-[var(--color-danger)] sm:col-span-3">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-lg btn-primary sm:col-span-3 sm:w-auto">
        <Icon name="plus" className="h-5 w-5" /> {pending ? "Adding…" : "Add person"}
      </button>
    </form>
  );
}
