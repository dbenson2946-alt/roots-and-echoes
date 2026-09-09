// Shared shape + sorting logic for the life-story PDF export (§17 of the
// project plan). Kept dependency-free (no "server-only", no React) so it can
// be imported from both the server action that assembles the data and the
// client-side PDF template that lays it out.

import type { MemoryCategory } from "./types";

export interface ExportPhoto {
  id: string;
  imageUrl: string;
  caption?: string;
}

export interface ExportMemory {
  id: string;
  title: string;
  transcript: string;
  category: MemoryCategory;
  /** free text, e.g. "Summer 1968" — may be absent */
  memoryDate?: string;
  photos: ExportPhoto[];
}

export interface LifeStoryExportData {
  seniorName: string;
  memories: ExportMemory[];
}

/** Best-effort: pull a 4-digit year out of free-text memoryDate ("Summer
 * 1968", "around 2003") so entries can be sorted chronologically without a
 * structured date column. Returns undefined when no year is found. */
export function extractYear(memoryDate: string | undefined): number | undefined {
  if (!memoryDate) return undefined;
  const match = memoryDate.match(/\b(1[89]\d{2}|20\d{2})\b/);
  return match ? Number(match[0]) : undefined;
}

/** Groups memories into year-sorted entries plus a trailing "undated" bucket,
 * matching the plan's decision: best-effort year extraction, undated
 * memories collected at the end rather than guessed at or dropped. */
export function sortMemoriesForExport(memories: ExportMemory[]): {
  dated: (ExportMemory & { year: number })[];
  undated: ExportMemory[];
} {
  const dated: (ExportMemory & { year: number })[] = [];
  const undated: ExportMemory[] = [];
  for (const m of memories) {
    const year = extractYear(m.memoryDate);
    if (year !== undefined) dated.push({ ...m, year });
    else undated.push(m);
  }
  dated.sort((a, b) => a.year - b.year);
  return { dated, undated };
}
