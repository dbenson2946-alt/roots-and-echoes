import type { RelationshipType } from "./types";

interface Snapshot {
  name: string;
  relationshipToSenior: RelationshipType;
  spouseId: string | null;
  parentIds: string[];
}

/**
 * A plain-language sentence telling the person what their edit did to the
 * family tree — shown after saving from the tree, where a relationship or
 * parent change moves a circle somewhere else and can otherwise look like
 * the person vanished. Pure so it can be unit-tested.
 *
 * `nameOf` turns a person id into a name (a missing id is skipped);
 * `sectionTitleFor` gives the tree heading for a relationship (pass
 * `sectionTitleForRelationship` from familyTreeStructure).
 */
export function describeEditChange(
  before: Snapshot,
  after: Snapshot,
  nameOf: (id: string) => string | undefined,
  sectionTitleFor: (relationship: RelationshipType) => string
): string {
  const first = after.name.trim().split(/\s+/)[0] || "This person";
  const parts: string[] = [];

  if (before.relationshipToSenior !== after.relationshipToSenior) {
    parts.push(`${first} now appears under ${sectionTitleFor(after.relationshipToSenior)}.`);
  }

  const sameParents =
    before.parentIds.length === after.parentIds.length && before.parentIds.every((id) => after.parentIds.includes(id));
  if (!sameParents) {
    const names = after.parentIds.map(nameOf).filter((n): n is string => Boolean(n));
    parts.push(
      names.length > 0
        ? `${first} is now shown as the child of ${names.join(" and ")}.`
        : `${first} is no longer shown under a parent.`
    );
  }

  if (before.spouseId !== after.spouseId) {
    const spouseName = after.spouseId ? nameOf(after.spouseId) : undefined;
    parts.push(spouseName ? `${first} is now paired with ${spouseName}.` : after.spouseId ? "" : `${first} is no longer paired with a partner.`);
  }

  const joined = parts.filter(Boolean).join(" ");
  return joined || `Saved ${first}'s details.`;
}
