import type { RelationshipType } from "./types";

// Shared, dependency-free types for the family tree export — the first of
// the per-category exports that followed the life-story PDF (§17). Mirrors
// the split used by lifeStoryExport.ts: this file has no "server-only" and
// no React, so it's importable from both the server action that gathers
// the data and the client PDF template that lays it out.
//
// The grouping/pairing/nesting logic itself lives in familyTreeStructure.ts
// (buildFamilyTreeStructure), shared with the live Family Tree page, so the
// export always mirrors what's on screen — spouses paired together,
// grandchildren/nieces-and-nephews nested under the specific parent they're
// assigned to, per the relationship-model expansion in the plan doc.

export interface ExportPerson {
  id: string;
  name: string;
  relationshipToSenior: RelationshipType;
  relationshipLabel?: string;
  notes?: string;
  livingStatus?: "living" | "deceased" | "unknown";
  spouseId?: string;
  parentIds: string[];
}

export interface FamilyTreeExportData {
  seniorName: string;
  people: ExportPerson[];
}
