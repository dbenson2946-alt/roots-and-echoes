import { extractYear } from "./lifeStoryExport";

// Shared, dependency-free types + sort logic for the Photos & Family export
// — the second of the per-category exports planned in §18 of the project
// plan, after the family tree. Unlike the family tree (text only) or the
// life-story PDF (only memory-linked photos), this covers *every* photo in
// the account, tagged or not, memory-linked or not.
//
// No audio is involved here, so — per the plan's documented build order —
// this stays a PDF like the family tree, reusing the same best-effort
// year-extraction/sort approach as lifeStoryExport.ts (dateTaken is free
// text, same as memoryDate, not a structured date column).

export interface ExportPhoto {
  id: string;
  label: string;
  caption?: string;
  dateTaken?: string;
  imageUrl?: string;
  taggedNames: string[];
}

export interface PhotosExportData {
  seniorName: string;
  photos: ExportPhoto[];
}

export function sortPhotosForExport(photos: ExportPhoto[]): {
  dated: (ExportPhoto & { year: number })[];
  undated: ExportPhoto[];
} {
  const dated: (ExportPhoto & { year: number })[] = [];
  const undated: ExportPhoto[] = [];
  for (const p of photos) {
    const year = extractYear(p.dateTaken);
    if (year !== undefined) dated.push({ ...p, year });
    else undated.push(p);
  }
  dated.sort((a, b) => a.year - b.year);
  return { dated, undated };
}
