"use client";

import { useState, useTransition, type ReactNode } from "react";
import { submitEditPerson } from "@/app/actions";
import { RELATIONSHIP_LABELS, LIVING_STATUS_LABELS, SENIOR_SPOUSE_VALUE } from "@/lib/ui";
import { possibleParentsFor } from "@/lib/familyGraph";
import type { Person, RelationshipType } from "@/lib/types";

/** What was just saved, handed back to the caller so it can say what changed. */
export interface SavedPersonValues {
  name: string;
  relationshipToSenior: RelationshipType;
  /** A person id, SENIOR_SPOUSE_VALUE for "the senior's spouse", or null. */
  spouseChoice: string | null;
  parentIds: string[];
}

/**
 * The edit-a-person form, shared by the "Family & friends" list (PersonRow)
 * and the tap-a-circle panel on the family tree.
 *
 * `allPeople` is everyone in the tree (this person included). The Parent
 * pickers leave out this person and everyone below them, so a loop (someone
 * being their own ancestor) can't be set up; the server checks again.
 * `extraActions` is rendered beside Save / Cancel (the tree adds Delete).
 */
export function PersonEditForm({
  person,
  allPeople,
  seniorName,
  idPrefix = "",
  onSaved,
  onCancel,
  extraActions,
}: {
  person: Person;
  allPeople: Person[];
  seniorName?: string;
  idPrefix?: string;
  onSaved: (saved: SavedPersonValues) => void;
  onCancel: () => void;
  extraActions?: ReactNode;
}) {
  // The relationship and spouse pickers are tied together: choosing the
  // senior as someone's spouse makes them the senior's spouse, and moving
  // them off "Spouse" un-picks the senior again.
  const isSeniorsSpouse = person.relationshipToSenior === "spouse" && !person.spouseId;
  const [relationship, setRelationship] = useState<RelationshipType>(person.relationshipToSenior);
  const [spouseChoice, setSpouseChoice] = useState(isSeniorsSpouse ? SENIOR_SPOUSE_VALUE : person.spouseId ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const others = allPeople.filter((p) => p.id !== person.id);
  const parentChoices = possibleParentsFor(allPeople, person.id);
  const id = (name: string) => `${idPrefix}${name}-${person.id}`;

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            const result = await submitEditPerson(formData);
            if (result.status === "error") {
              setError(result.message);
              return;
            }
            onSaved({
              name: String(formData.get("name") || "").trim(),
              relationshipToSenior: spouseChoice === SENIOR_SPOUSE_VALUE ? "spouse" : relationship,
              spouseChoice: spouseChoice || null,
              parentIds: [String(formData.get("parentId1") || ""), String(formData.get("parentId2") || "")].filter(
                (v) => v && v !== person.id
              ),
            });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong saving this.");
          }
        });
      }}
      className="space-y-3"
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
          value={relationship}
          onChange={(e) => {
            const next = e.target.value as RelationshipType;
            setRelationship(next);
            if (next === "spouse") {
              if (!spouseChoice) setSpouseChoice(SENIOR_SPOUSE_VALUE);
            } else if (spouseChoice === SENIOR_SPOUSE_VALUE) {
              setSpouseChoice("");
            }
          }}
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
        <label htmlFor={id("living")} className="mb-1 block text-base font-semibold">
          Living status
        </label>
        <select
          id={id("living")}
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
          <label htmlFor={id("spouse")} className="mb-1 block text-base font-semibold">
            Spouse / partner
          </label>
          <select
            id={id("spouse")}
            name="spouseId"
            value={spouseChoice}
            onChange={(e) => {
              setSpouseChoice(e.target.value);
              if (e.target.value === SENIOR_SPOUSE_VALUE) setRelationship("spouse");
            }}
            className="w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
          >
            <option value="">Not set</option>
            {seniorName && <option value={SENIOR_SPOUSE_VALUE}>{seniorName} (you)</option>}
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id("parent1")} className="mb-1 block text-base font-semibold">
            Parent
          </label>
          <select
            id={id("parent1")}
            name="parentId1"
            defaultValue={person.parentIds[0] ?? ""}
            className="w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
          >
            <option value="">Not set</option>
            {parentChoices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id("parent2")} className="mb-1 block text-base font-semibold">
            Second parent
          </label>
          <select
            id={id("parent2")}
            name="parentId2"
            defaultValue={person.parentIds[1] ?? ""}
            className="w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
          >
            <option value="">Not set</option>
            {parentChoices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-[var(--color-text-muted)] text-accent">
        Setting a spouse pairs the two of them together on the family tree. Setting a parent (or two) nests this person
        underneath them, instead of in the general row for their generation. The senior&rsquo;s own spouse always stays beside
        the senior &mdash; choose {seniorName ? `${seniorName.split(" ")[0]} (you)` : "the senior"} as the spouse to set that.
        Someone&rsquo;s own children and grandchildren aren&rsquo;t offered as their parent.
      </p>

      {error && (
        <p role="alert" className="text-base text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="btn-lg btn-primary !min-h-0 !py-2 !px-4 text-base">
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base"
        >
          Cancel
        </button>
        {extraActions}
      </div>
    </form>
  );
}
