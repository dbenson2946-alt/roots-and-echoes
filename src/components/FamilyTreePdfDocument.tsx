"use client";

import { Document, Page, View, Text, Font, StyleSheet } from "@react-pdf/renderer";
import type { FamilyTreeExportData, ExportPerson } from "@/lib/familyTreeExport";
import { groupFamilyTreeForExport } from "@/lib/familyTreeExport";
import { RELATIONSHIP_LABELS, LIVING_STATUS_LABELS } from "@/lib/ui";

// The family tree export (the first of the per-category exports that
// followed §17's life-story PDF — see the "Full life-story export" entry
// in the plan doc). Per the agreed scope this is a text list — name,
// relationship, notes — not a visual snapshot of the Family Tree page's
// node diagram: lossless of detail like notes, and far simpler to lay out
// on a printed page than trying to reproduce a diagram in react-pdf.
//
// Fonts and the "Warm Keepsake" palette are duplicated from
// LifeStoryPdfDocument.tsx rather than shared for now — worth factoring
// into one module once a couple more category exports exist and the
// duplication is actually costing something (noted in the plan doc).

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
    padding: 44,
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
  personBlock: {
    marginBottom: 10,
  },
  personName: {
    fontFamily: "Atkinson Hyperlegible",
    fontWeight: 700,
    fontSize: 12,
    color: COLORS.text,
  },
  personMeta: {
    fontFamily: "Atkinson Hyperlegible",
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  personNotes: {
    fontFamily: "Atkinson Hyperlegible",
    fontSize: 10,
    lineHeight: 1.4,
    color: COLORS.text,
    marginTop: 3,
  },
  emptyState: {
    fontFamily: "Atkinson Hyperlegible",
    fontSize: 11,
    color: COLORS.textMuted,
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

function PersonRow({ person }: { person: ExportPerson }) {
  const relationLabel = person.relationshipLabel || RELATIONSHIP_LABELS[person.relationshipToSenior];
  const livingLabel = person.livingStatus === "deceased" ? LIVING_STATUS_LABELS.deceased : undefined;
  const metaLine = [relationLabel, livingLabel].filter(Boolean).join("  ·  ");
  return (
    <View style={styles.personBlock} wrap={false}>
      <Text style={styles.personName}>{person.name}</Text>
      {metaLine && <Text style={styles.personMeta}>{metaLine}</Text>}
      {person.notes && <Text style={styles.personNotes}>{person.notes}</Text>}
    </View>
  );
}

export function FamilyTreePdfDocument({ data, generatedOn }: { data: FamilyTreeExportData; generatedOn: string }) {
  const sections = groupFamilyTreeForExport(data.people);

  return (
    <Document title={`${data.seniorName}'s Family Tree`}>
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>{`${data.seniorName}’s Family Tree`}</Text>
        <View style={styles.coverRule} />
        <Text style={styles.coverSubtitle}>The people who shaped this story, from Roots &amp; Echoes</Text>
        <Text style={styles.coverMeta}>{`Generated ${generatedOn}`}</Text>
      </Page>

      <Page size="A4" style={styles.page} wrap>
        {sections.length === 0 ? (
          <Text style={styles.emptyState}>No family or friends have been added yet.</Text>
        ) : (
          sections.map((section) => (
            <View key={section.title} wrap={false}>
              <Text style={styles.sectionHeading}>{section.title}</Text>
              {section.people.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </View>
          ))
        )}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
