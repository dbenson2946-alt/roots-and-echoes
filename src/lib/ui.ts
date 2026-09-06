import type { MemoryCategory, RelationshipType, ArtMedium, ActivityType } from "./types";
import type { IconName } from "@/components/Icon";

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  parent: "Parent",
  child: "Child",
  sibling: "Sibling",
  spouse: "Spouse",
  grandparent: "Grandparent",
  grandchild: "Grandchild",
  aunt_uncle: "Aunt / Uncle",
  niece_nephew: "Niece / Nephew",
  friend: "Friend",
  other: "Other",
};

export const CATEGORY_META: Record<MemoryCategory, { label: string; icon: IconName }> = {
  childhood: { label: "Childhood", icon: "childhood" },
  family: { label: "Family", icon: "family" },
  work: { label: "Work", icon: "work" },
  travel: { label: "Travel", icon: "travel" },
  music: { label: "Music", icon: "music" },
  love: { label: "Love", icon: "heart" },
  milestone: { label: "Milestone", icon: "milestone" },
  other: { label: "Other", icon: "sparkle" },
};

export const ART_MEDIUM_META: Record<ArtMedium, { label: string; icon: IconName }> = {
  painting: { label: "Painting", icon: "art" },
  sculpture: { label: "Sculpture", icon: "sculpture" },
  photography: { label: "Photography", icon: "camera" },
  other: { label: "Other", icon: "sparkle" },
};

export const ACTIVITY_TYPE_META: Record<ActivityType, { icon: IconName; section: string }> = {
  memory_added: { icon: "story", section: "Story Time" },
  person_added: { icon: "family", section: "Photos & Family" },
  photo_added: { icon: "photo", section: "Photos & Family" },
  photo_tagged: { icon: "tag", section: "Photos & Family" },
  photo_caption_added: { icon: "note", section: "Photos & Family" },
  song_added: { icon: "music", section: "Music" },
  song_audio_added: { icon: "headphones", section: "Music" },
  recording_added: { icon: "mic", section: "Music" },
  book_added: { icon: "books", section: "Books" },
  art_added: { icon: "art", section: "Art" },
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** A gentle, plain-language version of a date for the Activity page — "Today",
 * "Yesterday", "3 days ago", falling back to the full date further out. */
export function relativeDayLabel(iso: string): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(iso);
}

// ---- Placeholder "photo" generation for Games ----
// Photos in this demo are colored tiles rather than real image files (see
// README). The jigsaw/quiz games still need something visual to work with,
// so this builds a small generated SVG "photo" from a photo's swatch + label
// — replace with the real uploaded image URL once Supabase Storage lands.

const SWATCH_TO_HEX: Record<string, string> = {
  "var(--color-story-tint)": "#f7e6d8",
  "var(--color-photo-tint)": "#dcece6",
  "var(--color-music-tint)": "#e6e0f2",
  "var(--color-primary-tint)": "#f7e6d8",
  "var(--color-books-tint)": "#f3ead0",
  "var(--color-games-tint)": "#d9eef2",
  "var(--color-art-tint)": "#f2dde6",
};

export function swatchToHex(swatch: string): string {
  return SWATCH_TO_HEX[swatch] || "#d9d2c4";
}

function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const r = clamp(((num >> 16) & 0xff) + Math.round(2.55 * percent));
  const g = clamp(((num >> 8) & 0xff) + Math.round(2.55 * percent));
  const b = clamp((num & 0xff) + Math.round(2.55 * percent));
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      default: return "&quot;";
    }
  });
}

/** A generated stand-in "photo" (as a data: URI) used by the Games mode —
 * distinct colors/shapes per photo so a jigsaw of it is actually solvable. */
export function placeholderPhotoDataUri(label: string, hex: string): string {
  const light = shade(hex, 28);
  const dark = shade(hex, -32);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
    <rect width="480" height="480" fill="${hex}" />
    <circle cx="360" cy="120" r="150" fill="${light}" opacity="0.6" />
    <circle cx="90" cy="380" r="130" fill="${dark}" opacity="0.35" />
    <rect x="6" y="6" width="468" height="468" fill="none" stroke="${dark}" stroke-width="10" />
    <text x="240" y="250" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="${dark}" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
