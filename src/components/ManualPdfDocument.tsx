"use client";

import type { ReactNode } from "react";
import { Document, Page, View, Text, Font, StyleSheet } from "@react-pdf/renderer";
import { USER_MANUAL_MARKDOWN, USER_MANUAL_SUBTITLE, USER_MANUAL_TITLE } from "@/content/userManual";
import { parseManual, type ManualBlock, type ManualInline, type ManualListBlock } from "@/lib/userManual";

// The user manual as a printable PDF — drawn from the same parsed content
// as the Help page (see src/lib/userManual.ts), so the two always agree.
// Fonts and palette are duplicated from the other PDF documents (same
// note as in FamilyTreePdfDocument.tsx). Only .woff files work here —
// react-pdf shows invisible text for .woff2.

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
  gold: "#b8925a",
  primary: "#9c4a1f",
  primaryDark: "#7a3714",
  band: "#ecdfc6",
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
  coverRule: { width: 120, height: 2, backgroundColor: COLORS.primary, marginTop: 18, marginBottom: 18 },
  coverTitle: { fontFamily: "Playfair Display", fontWeight: 900, fontSize: 34, color: COLORS.text, textAlign: "center" },
  coverSubtitle: { fontFamily: "Fraunces", fontStyle: "italic", fontWeight: 400, fontSize: 15, color: COLORS.textMuted, textAlign: "center" },
  coverMeta: { fontFamily: "Atkinson Hyperlegible", fontSize: 10, color: COLORS.textMuted, marginTop: 40 },
  page: { backgroundColor: COLORS.bg, paddingTop: 48, paddingBottom: 56, paddingHorizontal: 54, fontFamily: "Atkinson Hyperlegible", fontSize: 11.5, color: COLORS.text, lineHeight: 1.45 },
  contentsTitle: { fontFamily: "Playfair Display", fontWeight: 700, fontSize: 20, color: COLORS.primaryDark, marginBottom: 12 },
  contentsRow: { fontSize: 13, marginBottom: 7 },
  h2: { fontFamily: "Playfair Display", fontWeight: 700, fontSize: 19, color: COLORS.primaryDark, marginBottom: 4, paddingBottom: 4, borderBottomWidth: 1.5, borderBottomColor: COLORS.border, borderBottomStyle: "solid" },
  h3: { fontFamily: "Playfair Display", fontWeight: 700, fontSize: 13, color: COLORS.primary, marginTop: 6, marginBottom: 3 },
  p: { marginBottom: 7 },
  bold: { fontWeight: 700 },
  listRow: { flexDirection: "row", marginBottom: 4 },
  marker: { width: 18, fontWeight: 700, color: COLORS.primary },
  listBody: { flex: 1 },
  table: { marginVertical: 6, borderWidth: 1, borderColor: COLORS.border, borderStyle: "solid" },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.border, borderTopStyle: "solid" },
  trHead: { flexDirection: "row", backgroundColor: COLORS.band },
  th: { fontWeight: 700, fontSize: 9.5, color: COLORS.textMuted, padding: 5 },
  td: { padding: 5, fontSize: 10.5 },
  footer: { position: "absolute", bottom: 24, left: 54, right: 54, flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: COLORS.textMuted },
});

function Runs({ text }: { text: ManualInline }): ReactNode {
  return (
    <>
      {text.map((r, i) =>
        r.bold ? (
          <Text key={i} style={styles.bold}>
            {r.text}
          </Text>
        ) : (
          r.text
        )
      )}
    </>
  );
}

function PdfList({ list, depth = 0 }: { list: ManualListBlock; depth?: number }) {
  return (
    <View style={{ marginLeft: depth * 16, marginBottom: depth === 0 ? 5 : 0, marginTop: depth > 0 ? 3 : 0 }}>
      {list.items.map((item, i) => (
        <View key={i} wrap={false}>
          <View style={styles.listRow}>
            <Text style={styles.marker}>{list.ordered ? `${i + 1}.` : "•"}</Text>
            <Text style={styles.listBody}>
              <Runs text={item.text} />
            </Text>
          </View>
          {item.children && <PdfList list={item.children} depth={depth + 1} />}
        </View>
      ))}
    </View>
  );
}

// Column widths: a wide last column for prose, a narrower first column.
function columnWidths(count: number): string[] {
  if (count === 2) return ["32%", "68%"];
  if (count === 3) return ["28%", "36%", "36%"];
  return Array.from({ length: count }, () => `${100 / count}%`);
}

function PdfTable({ header, rows }: { header: ManualInline[]; rows: ManualInline[][] }) {
  const widths = columnWidths(header.length);
  return (
    <View style={styles.table}>
      {/* Header and first row travel together, so a header is never left
          alone at the bottom of a page. */}
      <View wrap={false}>
        <View style={styles.trHead}>
          {header.map((h, i) => (
            <Text key={i} style={[styles.th, { width: widths[i] }]}>
              <Runs text={h} />
            </Text>
          ))}
        </View>
        {rows.slice(0, 1).map((row, r) => (
          <PdfRow key={r} row={row} widths={widths} />
        ))}
      </View>
      {rows.slice(1).map((row, r) => (
        <PdfRow key={r} row={row} widths={widths} />
      ))}
    </View>
  );
}

function PdfRow({ row, widths }: { row: ManualInline[]; widths: string[] }) {
  return (
    <View style={styles.tr} wrap={false}>
      {row.map((cell, c) => (
        <Text key={c} style={[styles.td, { width: widths[c] }, c === 0 ? styles.bold : {}]}>
          <Runs text={cell} />
        </Text>
      ))}
    </View>
  );
}

function PdfBlock({ block }: { block: ManualBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <Text style={styles.p}>
          <Runs text={block.text} />
        </Text>
      );
    case "subheading":
      return (
        <Text style={styles.h3} minPresenceAhead={100}>
          {block.text}
        </Text>
      );
    case "list":
      return <PdfList list={block} />;
    case "table":
      return <PdfTable header={block.header} rows={block.rows} />;
  }
}

export function ManualPdfDocument({ updatedOn }: { updatedOn: string }) {
  const sections = parseManual(USER_MANUAL_MARKDOWN);
  return (
    <Document title={USER_MANUAL_TITLE} author="Roots & Echoes">
      <Page size="LETTER" style={styles.coverPage}>
        <Text style={styles.coverTitle}>{USER_MANUAL_TITLE}</Text>
        <View style={styles.coverRule} />
        <Text style={styles.coverSubtitle}>{USER_MANUAL_SUBTITLE}</Text>
        <Text style={styles.coverMeta}>Printed {updatedOn}</Text>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Text style={styles.contentsTitle}>Contents</Text>
        {sections.map((s) => (
          <Text key={s.id} style={styles.contentsRow}>
            {s.number ? `${s.number}.  ` : ""}
            {s.title}
          </Text>
        ))}

        {sections.map((s) => (
          <View key={s.id}>
            <Text style={[styles.h2, { marginTop: 22 }]} minPresenceAhead={170}>
              {s.number ? `${s.number}. ` : ""}
              {s.title}
            </Text>
            {s.blocks.map((b, i) => (
              <PdfBlock key={i} block={b} />
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>{USER_MANUAL_TITLE}</Text>
          <Text render={({ pageNumber }) => `Page ${pageNumber - 1}`} />
        </View>
      </Page>
    </Document>
  );
}
