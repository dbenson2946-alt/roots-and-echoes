"use client";

import { Document, Page, View, Text, Image as PdfImage, Font, StyleSheet } from "@react-pdf/renderer";
import type { LifeStoryExportData, ExportMemory } from "@/lib/lifeStoryExport";
import { sortMemoriesForExport } from "@/lib/lifeStoryExport";
import { CATEGORY_META } from "@/lib/ui";
import { PdfCategoryMedallion } from "./pdfIcons";

// The life-story PDF export (§17 of the project plan) — built entirely
// client-side with @react-pdf/renderer, approximating the app's "Warm
// Keepsake" visual identity (§11: Playfair Display / Fraunces headings, the
// rust accent color, category medallions reusing Icon.tsx's own path data)
// without attempting a pixel-perfect reproduction of the CSS corner-tick
// ornament, which has no equivalent in react-pdf's layout primitives.
//
// Fonts are registered from real .woff binaries served from /public/fonts
// (copied from the same @fontsource packages the app's CSS already uses —
// see §17 in the plan for why: @react-pdf/renderer needs actual font files
// for Font.register(), not CSS @font-face).

Font.register({
  family: "Playfair Display",
  fonts: [
    { src: "/fonts/playfair-display-700.woff", fontWeight: 700 },
    { src: "/fonts/playfair-display-900.woff", fontWeight: 900 },
  ],
});
Font.register({
  family: "Atkinson Hyperlegible",
  fonts: [
    { src: "/fonts/atkinson-hyperlegible-400.woff", fontWeight: 400 },
    { src: "/fonts/atkinson-hyperlegible-700.woff", fontWeight: 700 },
  ],
});
Font.register({
  family: "Fraunces",
  fonts: [
    { src: "/fonts/fraunces-400-italic.woff", fontStyle: "italic", fontWeight: 400 },
    { src: "/fonts/fraunces-500.woff", fontWeight: 500 },
  ],
});

// Mirrors the CSS custom properties in globals.css (the "Warm Keepsake"
// palette) — react-pdf can't read CSS variables, so the values are copied
// here directly.
const COLORS = {
  bg: "#f3e9d6",
  text: "#2a1f14",
  textMuted: "#6e5c46",
  border: "#cdab7c",
  primary: "#9c4a1f",
  primaryDark: "#7a3714",
};

const styles = StyleSheet.create({
  coverPage: {
    backgroundColor: COLORS.bg,
    padding: 56,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  coverRule: {
    width: 120,
    height: 2,
    backgroundColor: COLORS.primary,
    marginTop: 18,
    marginBottom: 18,
  },
  coverTitle: {
    fontFamily: "Playfair Display",
    fontWeight: 900,
    fontSize: 32,
    color: COLORS.text,
    textAlign: "center",
  },
  coverSubtitle: {
    fontFamily: "Fraunces",
    fontStyle: "italic",
    fontWeight: 400,
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 6,
  },
  coverMeta: {
    fontFamily: "Atkinson Hyperlegible",
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 40,
  },
  page: {
    backgroundColor: COLORS.bg,
    padding: 44,
    fontFamily: "Atkinson Hyperlegible",
  },
  sectionHeading: {
    fontFamily: "Playfair Display",
    fontWeight: 700,
    fontSize: 17,
    color: COLORS.primaryDark,
    marginTop: 6,
    marginBottom: 12,
  },
  memoryBlock: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  memoryHeaderRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  memoryTitle: {
    fontFamily: "Playfair Display",
    fontWeight: 700,
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
  },
  memoryMeta: {
    fontFamily: "Atkinson Hyperlegible",
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 8,
    marginLeft: 30,
  },
  transcript: {
    fontFamily: "Atkinson Hyperlegible",
    fontSize: 10.5,
    lineHeight: 1.5,
    color: COLORS.text,
  },
  photoRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  photo: {
    width: 138,
    height: 104,
    objectFit: "cover",
    borderRadius: 3,
    marginRight: 8,
    marginBottom: 8,
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 44,
    fontSize: 8.5,
    color: COLORS.textMuted,
    fontFamily: "Atkinson Hyperlegible",
  },
});

function MemoryBlock({ memory, yearLabel }: { memory: ExportMemory; yearLabel?: string }) {
  const meta = CATEGORY_META[memory.category];
  const metaLine = [yearLabel ?? memory.memoryDate, meta.label].filter(Boolean).join("  ·  ");
  return (
    <View style={styles.memoryBlock} wrap={false}>
      <View style={styles.memoryHeaderRow}>
        <PdfCategoryMedallion category={memory.category} color={COLORS.primary} size={22} />
        <Text style={styles.memoryTitle}>{memory.title}</Text>
      </View>
      {metaLine && <Text style={styles.memoryMeta}>{metaLine}</Text>}
      <Text style={styles.transcript}>{memory.transcript}</Text>
      {memory.photos.length > 0 && (
        <View style={styles.photoRow}>
          {memory.photos.map((p) => (
            <PdfImage key={p.id} src={p.imageUrl} style={styles.photo} />
          ))}
        </View>
      )}
    </View>
  );
}

export function LifeStoryPdfDocument({ data, generatedOn }: { data: LifeStoryExportData; generatedOn: string }) {
  const { dated, undated } = sortMemoriesForExport(data.memories);

  return (
    <Document title={`${data.seniorName}'s Life Story`}>
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>{`${data.seniorName}’s Life Story`}</Text>
        <View style={styles.coverRule} />
        <Text style={styles.coverSubtitle}>A collection of memories from Roots &amp; Echoes</Text>
        <Text style={styles.coverMeta}>{`Generated ${generatedOn}`}</Text>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        {dated.map((m) => (
          <MemoryBlock key={m.id} memory={m} yearLabel={String(m.year)} />
        ))}
        {undated.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Undated memories</Text>
            {undated.map((m) => (
              <MemoryBlock key={m.id} memory={m} />
            ))}
          </>
        )}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
