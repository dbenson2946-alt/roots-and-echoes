"use client";

import { useState } from "react";
import { submitDeletePerson } from "@/app/actions";
import { PersonEditForm } from "@/components/PersonEditForm";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { Icon } from "@/components/Icon";
import { RELATIONSHIP_LABELS } from "@/lib/ui";
import type { Person } from "@/lib/types";

/** One row in the "Family & friends" list — a plain view by default, or an
 * inline edit form in place of it when "Edit" is tapped. Deleting uses the
 * shared two-step ConfirmDeleteButton rather than a native confirm().
 *
 * `allPeople` is the full family & friends list (this person included) —
 * used to populate the Spouse/Parent pickers with everyone else already in
 * the tree, and to look up names for the read-only "Spouse" / "Parent(s)"
 * summary line. */
export function PersonRow({
  person,
  allPeople,
  seniorName,
  canEdit = true,
}: {
  person: Person;
  allPeople: Person[];
  seniorName?: string;
  /** false for a view-only helper: the Edit and Delete buttons are left out */
  canEdit?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const spouse = person.spouseId
    ? allPeople.find((p) => p.id === person.spouseId)
    : undefined;
  const parents = person.parentIds
    .map((id) => allPeople.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p));

  if (editing) {
    return (
      <div className="tile tile-compact tile-accent-photo p-4">
        <PersonEditForm
          person={person}
          allPeople={allPeople}
          seniorName={seniorName}
          idPrefix="row-"
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="tile tile-compact tile-accent-photo flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-lg font-bold">{person.name}</p>
        <p className="text-base text-[var(--color-text-muted)]">
          {person.relationshipLabel ||
            RELATIONSHIP_LABELS[person.relationshipToSenior]}
          {person.livingStatus === "deceased" ? " · In loving memory" : ""}
        </p>
        {(spouse || parents.length > 0) && (
          <p className="text-sm text-[var(--color-text-muted)] text-accent">
            {spouse && `Spouse: ${spouse.name}`}
            {spouse && parents.length > 0 && "  ·  "}
            {parents.length > 0 &&
              `Parent${parents.length > 1 ? "s" : ""}: ${parents.map((p) => p.name).join(" & ")}`}
          </p>
        )}
      </div>
      {canEdit && (
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
      )}
    </div>
  );
}
