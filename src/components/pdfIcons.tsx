"use client";

import { Svg, Path, Circle } from "@react-pdf/renderer";
import type { MemoryCategory } from "@/lib/types";

// react-pdf equivalents of the category icons in Icon.tsx (§11's hand-drawn
// line-icon set), reused directly for the PDF export's per-memory category
// glyphs — same path data, same 24x24 viewBox, redrawn with react-pdf's
// <Svg>/<Path>/<Circle> primitives instead of raw SVG tags (per §17 of the
// plan: warm and recognizably branded, not a pixel-perfect app screenshot).

function CategoryGlyph({ category, color }: { category: MemoryCategory; color: string }) {
  const stroke = { stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (category) {
    case "childhood":
      return (
        <>
          <Circle cx="12" cy="13" r="5.4" {...stroke} />
          <Circle cx="7.3" cy="7" r="2.1" {...stroke} />
          <Circle cx="16.7" cy="7" r="2.1" {...stroke} />
          <Circle cx="10" cy="12" r="0.9" fill={color} />
          <Circle cx="14" cy="12" r="0.9" fill={color} />
          <Path d="M10.3 15.3c.6.6 2.8.6 3.4 0" {...stroke} />
        </>
      );
    case "family":
      return (
        <>
          <Circle cx="9" cy="8" r="3" {...stroke} />
          <Circle cx="16.2" cy="9.3" r="2.3" {...stroke} />
          <Path d="M3.2 20.5c0-3.6 2.6-6.3 5.8-6.3s5.8 2.7 5.8 6.3" {...stroke} />
          <Path d="M15.4 14.5c2.3.5 4 2.7 4 6" {...stroke} />
        </>
      );
    case "work":
      return (
        <>
          <Path d="M3.5 7.5h17v11.5h-17Z" {...stroke} />
          <Path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" {...stroke} />
          <Path d="M3.5 12.5h17" {...stroke} />
        </>
      );
    case "travel":
      return <Path d="M11.2 3.5 12 2.7l.8.8v6l6.7 4v2l-6.7-2v4l2 1.6v1.6l-2.8-1-2.8 1v-1.6l2-1.6v-4l-6.7 2v-2l6.7-4Z" {...stroke} />;
    case "music":
      return (
        <>
          <Path d="M9.5 18.2V5.6l11-2.1v12.6" {...stroke} />
          <Circle cx="6.7" cy="18.2" r="2.8" {...stroke} />
          <Circle cx="17.7" cy="16.1" r="2.8" {...stroke} />
        </>
      );
    case "love":
      return <Path d="M12 20.2s-7.4-4.5-9.7-9A5 5 0 0 1 12 6.6a5 5 0 0 1 9.7 4.6c-2.3 4.5-9.7 9-9.7 9Z" {...stroke} />;
    case "milestone":
      return (
        <>
          <Path d="M6 3.5v17" {...stroke} />
          <Path d="M6 4.5h10.5l-2.2 3.3 2.2 3.3H6Z" {...stroke} />
        </>
      );
    case "other":
      return (
        <>
          <Path d="M12 3.5c.4 3 1.6 4.6 4.5 5.5-2.9.9-4.1 2.5-4.5 5.5-.4-3-1.6-4.6-4.5-5.5 2.9-.9 4.1-2.5 4.5-5.5Z" {...stroke} />
          <Path d="M18.5 14.5c.25 1.6.9 2.4 2.5 2.8-1.6.4-2.25 1.2-2.5 2.8-.25-1.6-.9-2.4-2.5-2.8 1.6-.4 2.25-1.2 2.5-2.8Z" {...stroke} />
        </>
      );
  }
}

/** A small circular medallion badge (echoing Medallion.tsx) with the
 * category glyph inside, sized for the PDF's per-memory heading. */
export function PdfCategoryMedallion({ category, color, size = 28 }: { category: MemoryCategory; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <CategoryGlyph category={category} color={color} />
    </Svg>
  );
}
