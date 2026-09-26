"use client";

import { Document, Page, View, Text, Image as PdfImage, Font, StyleSheet } from "@react-pdf/renderer";
import type { PhotosExportData, ExportPhoto } from "@/lib/photosExport";
import { sortPhotosForExport } from "@/lib/photosExport";

// The Photos & Family export (second of the per-category exports from §18,
// after the family tree). Covers every photo in the account — tagged or
// not, memory-linked or not — as a two-column grid, chronological by
// best-effort year (dateTaken is free text, same approach as
// lifeStoryExport.ts), with a trailing "Undated Photos" section.
//
// No audio here, so — per the plan's documented build order — this stays a
// PDF, same as the family tree, rather than needing the client-side
// ZIP-assembly approach Music will require.
//
// Fonts and the "Warm Keepsake" palette are duplicated from
// LifeStoryPdfDocument.tsx / FamilyTreePdfDocument.tsx rather than shared
// for now — see the plan doc's note about factoring this out once the
// duplication is actually costing something.

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
    padding: 40,
    fontFamily: "Atkinson Hyperlegible",
  },
  sectionHeading: {
    fontFamily: "Playfair Display",
    fontWeight: 700,
    fontSize: 15,
    color: COLORS.primaryDark,
    marginTop: 14,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 6,
  },
  grid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  photoCard: {
    width: "48%",
    marginBottom: 16,
  },
  photoImage: {
    width: "100%",
    height: 130,
    objectFit: "cover",
    borderRadius: 3,
    marginBottom: 6,
  },
  photoPlaceholder: {
    width: "100%",
    height: 130,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: {
    fontFamily: "Atkinson Hyperlegible",
    fontSize: 9,
    color: COLORS.textMuted,
  },
  photoLabel: {
    fontFamily: "Playfair Display",
    fontWeight: 700,
    fontSize: 11,
    color: COLORS.text,
  },
  photoCaption: {
    fontFamily: "Atkinson Hyperlegible",
    fontSize: 9.5,
    lineHeight: 1.3,
    color: COLORS.text,
    marginTop: 2,
  },
  photoMeta: {
    fontFamily: "Atkinson Hyperlegible",
    fontSize: 8.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyState: {
    fontFamily: "Atkinson Hyperlegible",
    fontSize: 11,
    color: COLORS.textMuted,
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 40,
    fontSize: 8.5,
    color: COLORS.textMuted,
    fontFamily: "Atkinson Hyperlegible",
  },
});

function PhotoCard({ photo }: { photo: ExportPhoto }) {
  const metaBits = [
    photo.dateTaken,
    photo.taggedNames.length > 0 ? `With: ${photo.taggedNames.join(", ")}` : undefined,
  ].filter(Boolean);

  return (
    <View style={styles.photoCard} wrap={false}>
      {photo.imageUrl ? (
        <PdfImage src={photo.imageUrl} style={styles.photoImage} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoPlaceholderText}>No photo uploaded</Text>
        </View>
      )}
      <Text style={styles.photoLabel}>{photo.label}</Text>
      {photo.caption && <Text style={styles.photoCaption}>{photo.caption}</Text>}
      {metaBits.length > 0 && <Text style={styles.photoMeta}>{metaBits.join("  ·  ")}</Text>}
    </View>
  );
}

export function PhotosPdfDocument({ data, generatedOn }: { data: PhotosExportData; generatedOn: string }) {
  const { dated, undated } = sortPhotosForExport(data.photos);

  return (
    <Document title={`${data.seniorName}'s Photos`}>
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>{`${data.seniorName}’s Photos`}</Text>
        <View style={styles.coverRule} />
        <Text style={styles.coverSubtitle}>A collection of photos from Roots &amp; Echoes</Text>
        <Text style={styles.coverMeta}>{`Generated ${generatedOn}`}</Text>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        {data.photos.length === 0 ? (
          <Text style={styles.emptyState}>No photos have been added yet.</Text>
        ) : (
          <>
            {dated.length > 0 && (
              <View style={styles.grid}>
                {dated.map((p) => (
                  <PhotoCard key={p.id} photo={p} />
                ))}
              </View>
            )}
            {undated.length > 0 && (
              <>
                <Text style={styles.sectionHeading}>Undated Photos</Text>
                <View style={styles.grid}>
                  {undated.map((p) => (
                    <PhotoCard key={p.id} photo={p} />
                  ))}
                </View>
              </>
            )}
          </>
        )}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
