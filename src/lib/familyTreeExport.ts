import type { RelationshipType } from "./types";

// Shared, dependency-free types + grouping logic for the family tree export
// — the first of the per-category exports that followed the life-story PDF
// (§17). Mirrors the split used by lifeStoryExport.ts: this file has no
// "server-only" and no React, so it's importable from both the server
// action that gathers the data and the client PDF template that lays it
// out.
//
// Per the agreed scope, this is a text list (name + relationship + notes),
// not a visual snapshot of the Family Tree page's node diagram — more
// robust, lossless of detail like notes, and far simpler to lay out on a
// printed page.

export interface ExportPerson {
  id: string;
  name: string;
  relationshipToSenior: RelationshipType;
  relationshipLabel?: string;
  notes?: string;
  livingStatus?: "living" | "deceased" | "unknown";
}

export interface FamilyTreeExportData {
  seniorName: string;
  people: ExportPerson[];
}

export interface FamilyTreeSection {
  title: string;
  people: ExportPerson[];
}

// Same groupings as the Family Tree page (src/app/photos/family-tree/page.tsx)
// so the export reads in the order people already expect.
const SECTION_ORDER: { title: string; relations: RelationshipType[] }[] = [
  { title: "Grandparents", relations: ["grandparent"] },
  { title: "Parents, Aunts & Uncles", relations: ["parent", "aunt_uncle"] },
  { title: "Siblings & Spouse", relations: ["sibling", "spouse"] },
  { title: "Children", relations: ["child"] },
  { title: "Grandchildren, Nieces & Nephews", relations: ["grandchild", "niece_nephew"] },
  { title: "Close Friends & Others", relations: ["friend", "other"] },
];

export function groupFamilyTreeForExport(people: ExportPerson[]): FamilyTreeSection[] {
  return SECTION_ORDER.map(({ title, relations }) => ({
    title,
    people: people.filter((p) => relations.includes(p.relationshipToSenior)),
  })).filter((section) => section.people.length > 0);
}
