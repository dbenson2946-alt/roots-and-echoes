// Shared, dependency-free family-tree grouping/pairing/nesting engine —
// used by both the live Family Tree page (src/app/photos/family-tree/page.tsx)
// and the Family Tree PDF export (src/components/FamilyTreePdfDocument.tsx),
// so the two always render the same structure. No "server-only", no React —
// same pattern as lifeStoryExport.ts / familyTreeExport.ts / photosExport.ts.
//
// What this adds on top of the old flat "group by relationshipToSenior"
// grouping (still the base of SECTION_ORDER below): a spouse/in-law can now
// be tied to a specific person (Person.spouseId) instead of only ever "the
// senior's spouse", and a grandchild/niece-or-nephew can be assigned to a
// specific parent (Person.parentIds) instead of only ever landing in the
// general "Grandchildren, Nieces & Nephews" bucket.
//
// Known limitation (by design — see the plan doc): nesting only goes
// "downward" one relationship generation from a bucket anchor. There's no
// "upward" nesting (e.g. showing a spouse's own parents as the senior's
// in-laws) — someone like that still just gets their own flat row wherever
// their relationshipToSenior places them.

import type { RelationshipType } from "./types";

export interface FamilyTreeNodeLike {
  id: string;
  relationshipToSenior: RelationshipType;
  spouseId?: string;
  parentIds?: string[];
}

export interface FamilyTreeStructureNode<T> {
  person: T;
  /** This person's spouse/partner, resolved from spouseId, if any and if
   * they're also in the tree. Shown paired alongside `person` rather than
   * as their own top-level row. */
  spouse?: T;
  /** This person's (or their spouse's) children one generation down, e.g. a
   * Children-bucket anchor's grandchildren, or a Parents/Aunts & Uncles
   * anchor's nieces/nephews. Recursed the same way, so it keeps going as
   * deep as the data actually supports. */
  children: FamilyTreeStructureNode<T>[];
}

export interface FamilyTreeStructureSection<T> {
  title: string;
  nodes: FamilyTreeStructureNode<T>[];
}

const SECTION_ORDER: { title: string; relations: RelationshipType[] }[] = [
  { title: "Grandparents", relations: ["grandparent"] },
  { title: "Parents, Aunts & Uncles", relations: ["parent", "aunt_uncle"] },
  { title: "Siblings & Spouse", relations: ["sibling", "spouse"] },
  { title: "Children", relations: ["child"] },
  { title: "Grandchildren, Nieces & Nephews", relations: ["grandchild", "great_grandchild", "niece_nephew"] },
  { title: "Close Friends & Others", relations: ["friend", "other"] },
];

export function buildFamilyTreeStructure<T extends FamilyTreeNodeLike>(people: T[]): FamilyTreeStructureSection<T>[] {
  const byId = new Map(people.map((p) => [p.id, p]));

  // A person is a "secondary/absorbed spouse" — excluded from their own
  // top-level bucket and shown paired with their partner instead — when
  // their only recorded relationship to the senior is "other" (i.e. they
  // were added purely as someone's spouse/in-law) and their spouse
  // actually resolves to someone else already in the tree.
  //
  // A second case: two people who are each other's spouse AND are filed in
  // the same section (typically both added as "Parent", e.g. the senior's
  // mother and father). Neither is an "other", so by the rule above both
  // would get their own top-level entry and each would also be drawn as the
  // other's partner — the couple would appear twice. Treat the pair as one
  // unit instead: the one added first stays the anchor, the other is
  // absorbed into it. (A couple filed in two different sections — say one
  // as "Child" and their partner as "Spouse" — is left alone; that is a
  // question of how they were categorised, not a duplicate.)
  const sectionOf = new Map<RelationshipType, number>();
  SECTION_ORDER.forEach(({ relations }, index) => relations.forEach((r) => sectionOf.set(r, index)));

  const absorbed = new Set<string>();
  // The absorbed halves of same-section couples (as opposed to "other"
  // in-laws) — see where their parent links are carried over, below.
  const absorbedPartners = new Set<string>();
  const indexOf = new Map(people.map((p, i) => [p.id, i]));
  for (const p of people) {
    const spouse = p.spouseId ? byId.get(p.spouseId) : undefined;
    // Never absorb into someone who has themselves been absorbed — that
    // would leave a couple with nobody left to display them.
    if (!spouse || absorbed.has(spouse.id)) continue;
    if (p.relationshipToSenior === "other") {
      absorbed.add(p.id);
    } else if (
      spouse.spouseId === p.id &&
      sectionOf.get(spouse.relationshipToSenior) === sectionOf.get(p.relationshipToSenior) &&
      // the one listed first stays as the anchor; the later one is absorbed
      (indexOf.get(spouse.id) ?? 0) < (indexOf.get(p.id) ?? 0)
    ) {
      absorbed.add(p.id);
      absorbedPartners.add(p.id);
    }
  }

  // Which people are nested under some anchor (so they're pulled out of
  // their own flat section), and the reverse lookup used to build that
  // nesting: anchor person id -> their children.
  const nestedChildIds = new Set<string>();
  const childrenByParent = new Map<string, T[]>();
  for (const p of people) {
    if (absorbed.has(p.id)) continue;
    // The senior's own spouse always stays beside the senior. Recording
    // their parents (the senior's in-laws) must not pull them out of that
    // row and redraw them under those parents — there is no upward nesting
    // for in-laws (see the limitation noted at the top of this file).
    if (p.relationshipToSenior === "spouse") continue;
    // If this person's partner was folded into them (same-section couple),
    // the partner's own recorded parents count as the couple's too — they
    // would otherwise be silently dropped along with the partner's row.
    const partner = p.spouseId ? byId.get(p.spouseId) : undefined;
    const partnerParentIds = partner && absorbedPartners.has(partner.id) ? partner.parentIds ?? [] : [];
    const parentIds = [...new Set([...(p.parentIds ?? []), ...partnerParentIds])].filter((id) => id !== p.id && id !== partner?.id);
    if (parentIds.length === 0) continue;

    // Resolve each recorded parent to the anchor that will actually render
    // in a section — if that parent is themselves an absorbed spouse,
    // nest under their partner instead, since the absorbed spouse never
    // gets their own row to nest under.
    const anchorIds = new Set<string>();
    for (const parentId of parentIds) {
      const parent = byId.get(parentId);
      if (!parent) continue;
      const anchorId = absorbed.has(parent.id) && parent.spouseId ? parent.spouseId : parent.id;
      if (byId.has(anchorId)) anchorIds.add(anchorId);
    }
    if (anchorIds.size === 0) continue;

    nestedChildIds.add(p.id);
    for (const anchorId of anchorIds) {
      const list = childrenByParent.get(anchorId) ?? [];
      list.push(p);
      childrenByParent.set(anchorId, list);
    }
  }

  function buildNode(person: T, visited: Set<string>): FamilyTreeStructureNode<T> {
    const spouse = person.spouseId ? byId.get(person.spouseId) : undefined;
    const rawChildren = childrenByParent.get(person.id) ?? [];
    const children = rawChildren
      // Defensive cycle guard — bad data (e.g. a parent-link loop) can't
      // send this into infinite recursion.
      .filter((child) => !visited.has(child.id))
      .map((child) => buildNode(child, new Set(visited).add(child.id)));
    return { person, spouse, children };
  }

  const sections = SECTION_ORDER.map(({ title, relations }) => {
    const bucketPeople = people.filter(
      (p) => relations.includes(p.relationshipToSenior) && !absorbed.has(p.id) && !nestedChildIds.has(p.id)
    );
    const nodes = bucketPeople.map((person) => buildNode(person, new Set([person.id])));
    return { title, nodes };
  });

  return sections.filter((section) => section.nodes.length > 0);
}
