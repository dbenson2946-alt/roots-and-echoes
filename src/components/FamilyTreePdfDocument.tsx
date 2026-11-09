"use client";

import type { ReactElement, ReactNode } from "react";
import { Document, Page, View, Text, Svg, Circle, Path, Font, StyleSheet } from "@react-pdf/renderer";
import type { FamilyTreeExportData, ExportPerson } from "@/lib/familyTreeExport";
import { buildFamilyTreeStructure } from "@/lib/familyTreeStructure";
import { computeFamilyTreeLayout, FAMILY_TREE_GEOMETRY, type FamilyTreeLayout } from "@/lib/familyTreeLayout";
import { RELATIONSHIP_LABELS } from "@/lib/ui";

// The family tree export, rebuilt from a text list (the original §18
// version) into a real diagram — circles connected by the same computed
// connector lines the live Family Tree page draws (§34). Both renderers
// consume the exact same computeFamilyTreeLayout() output from
// familyTreeLayout.ts, so the PDF always matches the live page's shape;
// this file only adds the react-pdf-specific drawing (Svg/Circle/Path/Text
// primitives instead of browser SVG) and the one thing a browser page
// doesn't need to think about — fitting the whole diagram onto a fixed
// page size, since there's no scrollbar on paper. Landscape, scaled down
// (never up) to fit the available width and height together, so nothing
// at the edges gets clipped; a very large family's diagram shrinks rather
// than spilling off the page.
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
  gold: "#b8925a",
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
  coverRule: { width: 120, height: 2, backgroundColor: COLORS.primary, marginTop: 18, marginBottom: 18 },
  coverTitle: { fontFamily: "Playfair Display", fontWeight: 900, fontSize: 32, color: COLORS.text, textAlign: "center" },
  coverSubtitle: { fontFamily: "Fraunces", fontStyle: "italic", fontWeight: 400, fontSize: 15, color: COLORS.textMuted, textAlign: "center", marginTop: 6 },
  coverMeta: { fontFamily: "Atkinson Hyperlegible", fontSize: 10, color: COLORS.textMuted, marginTop: 40 },
  diagramPage: { backgroundColor: COLORS.bg, padding: 28, display: "flex", flexDirection: "column", alignItems: "center" },
  pageHeading: { fontFamily: "Playfair Display", fontWeight: 700, fontSize: 16, color: COLORS.primaryDark, marginBottom: 10 },
  emptyState: { fontFamily: "Atkinson Hyperlegible", fontSize: 11, color: COLORS.textMuted },
});

const R = FAMILY_TREE_GEOMETRY.circleRadius;
const SENIOR_R = FAMILY_TREE_GEOMETRY.seniorCircleRadius;
const LABEL_PAD = 14;
const LABEL_H = 56;

// react-pdf's own .d.ts for a <Text> nested inside <Svg> (its internal
// SVGTextProps interface) doesn't declare fontSize/fontFamily/fontWeight
// as valid props at all -- not directly, and not inside `style` either
// (that's typed as SVGPresentationAttributes, which also omits them) --
// so TypeScript rejects every SVG-nested <Text> below with "No overload
// matches this call". Reading @react-pdf/layout's lib/index.js shows this
// is a documentation gap, not a missing feature: BASE_SVG_INHERITED_PROPS
// explicitly lists fontFamily/fontSize/fontWeight/fontStyle/fill as
// SVG-text props the layout engine reads and applies (and mergeStyles()
// folds a `style` object into those same props before layout runs,
// so either spot genuinely works at runtime). This widened alias keeps
// <Text>'s real implementation and just stops the compiler rejecting
// props the renderer already honors.
type SvgTextProps = {
  x: number;
  y: number;
  textAnchor?: "start" | "middle" | "end";
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  fill?: string;
  style?: Record<string, unknown>;
  children?: ReactNode;
};
const SvgText = Text as unknown as (props: SvgTextProps) => ReactElement;

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function sublabelFor(person: ExportPerson, useRelationshipFallback: boolean, seniorSpouseFirstName?: string): string | undefined {
  if (person.relationshipLabel) return person.relationshipLabel;
  if (person.livingStatus === "deceased") return "In loving memory";
  if (seniorSpouseFirstName) return `Spouse of ${seniorSpouseFirstName}`;
  return useRelationshipFallback ? RELATIONSHIP_LABELS[person.relationshipToSenior] : undefined;
}

function PersonCircle({
  cx,
  cy,
  r,
  initials,
  color,
  name,
  sublabel,
}: {
  cx: number;
  cy: number;
  r: number;
  initials: string;
  color: string;
  name: string;
  sublabel?: string;
}) {
  const displayName = name.length > 18 ? `${name.slice(0, 17)}…` : name;
  return (
    <>
      <Circle cx={cx} cy={cy} r={r} fill={color} stroke={COLORS.gold} strokeWidth={2} />
      <SvgText x={cx} y={cy + r * 0.2} textAnchor="middle" fontSize={r * 0.5} fontFamily="Atkinson Hyperlegible" fontWeight={700} fill={COLORS.text}>
        {initials}
      </SvgText>
      <SvgText x={cx} y={cy + r + 16} textAnchor="middle" fontSize={9} fontFamily="Playfair Display" fontWeight={700} fill={COLORS.text}>
        {displayName}
      </SvgText>
      {sublabel && (
        <SvgText x={cx} y={cy + r + 29} textAnchor="middle" fontSize={7.5} fontFamily="Atkinson Hyperlegible" fill={COLORS.textMuted}>
          {sublabel}
        </SvgText>
      )}
    </>
  );
}

function FamilyTreeSvg({
  layout,
  peopleById,
  friendsOtherIds,
  seniorSpouseIds,
  seniorName,
  seniorAvatarInitials,
  seniorAvatarColor,
  scale,
}: {
  layout: FamilyTreeLayout;
  peopleById: Map<string, ExportPerson>;
  friendsOtherIds: Set<string>;
  seniorSpouseIds: Set<string>;
  seniorName: string;
  seniorAvatarInitials: string;
  seniorAvatarColor: string;
  scale: number;
}) {
  const topPad = SENIOR_R + 32;
  const totalWidth = Math.max(layout.width, 300);
  const totalHeight = layout.height + topPad + LABEL_H + 20;

  return (
    <Svg width={totalWidth * scale} height={totalHeight * scale} viewBox={`0 0 ${totalWidth} ${totalHeight}`}>
      {layout.bands.map((band) => (
        <SvgText
          key={band.title}
          x={layout.width / 2}
          y={band.y + topPad - R - 22}
          textAnchor="middle"
          fontSize={9}
          fontFamily="Atkinson Hyperlegible"
          fontWeight={700}
          fill={COLORS.textMuted}
        >
          {band.title.toUpperCase()}
        </SvgText>
      ))}
      <SvgText
        x={layout.width / 2}
        y={layout.seniorNode.y + topPad - SENIOR_R - 22}
        textAnchor="middle"
        fontSize={9}
        fontFamily="Atkinson Hyperlegible"
        fontWeight={700}
        fill={COLORS.textMuted}
      >
        {`SIBLINGS, ${seniorName.split(" ")[0].toUpperCase()}, & SPOUSE`}
      </SvgText>

      {layout.edges.map((e, i) => {
        const isSeniorEnd = (x: number, y: number) => Math.abs(x - layout.seniorNode.x) < 0.01 && Math.abs(y - layout.seniorNode.y) < 0.01;
        const r1 = isSeniorEnd(e.x1, e.y1) ? SENIOR_R : R;
        const r2 = isSeniorEnd(e.x2, e.y2) ? SENIOR_R : R;
        const y1 = e.y1 + topPad + r1 + LABEL_PAD;
        const y2 = e.y2 + topPad - r2 - LABEL_PAD;
        const midX = (e.x1 + e.x2) / 2;
        const c1y = y1 + (y2 - y1) * 0.25;
        const c2y = y1 + (y2 - y1) * 0.75;
        const d = `M ${e.x1} ${y1} C ${midX} ${c1y}, ${midX} ${c2y}, ${e.x2} ${y2}`;
        return <Path key={i} d={d} fill="none" stroke={COLORS.border} strokeWidth={1.4} strokeDasharray="4 3" />;
      })}

      {layout.nodes
        .filter((n) => n.spouseX !== undefined)
        .map((n) => (
          <Path
            key={`couple-${n.id}`}
            d={`M ${n.x + R} ${n.y + topPad} L ${n.spouseX! - R} ${n.y + topPad}`}
            stroke={COLORS.primary}
            strokeWidth={2}
          />
        ))}

      {layout.nodes.flatMap((n) => {
        const person = peopleById.get(n.id);
        if (!person) return [];
        const useFallback = friendsOtherIds.has(n.id);
        const circles = [
          <PersonCircle
            key={n.id}
            cx={n.x}
            cy={n.y + topPad}
            r={R}
            initials={person.photoInitials || initialsOf(person.name)}
            color={person.photoColor}
            name={person.name}
            sublabel={sublabelFor(person, useFallback, seniorSpouseIds.has(n.id) ? seniorName.split(" ")[0] : undefined)}
          />,
        ];
        if (n.spouseId && n.spouseX !== undefined) {
          const spouse = peopleById.get(n.spouseId);
          if (spouse) {
            circles.push(
              <PersonCircle
                key={n.spouseId}
                cx={n.spouseX}
                cy={n.y + topPad}
                r={R}
                initials={spouse.photoInitials || initialsOf(spouse.name)}
                color={spouse.photoColor}
                name={spouse.name}
                sublabel={spouse.relationshipLabel || (spouse.livingStatus === "deceased" ? "In loving memory" : `Spouse of ${person.name.split(" ")[0]}`)}
              />
            );
          }
        }
        return circles;
      })}

      <PersonCircle
        cx={layout.seniorNode.x}
        cy={layout.seniorNode.y + topPad}
        r={SENIOR_R}
        initials={seniorAvatarInitials}
        color={seniorAvatarColor}
        name={seniorName}
        sublabel="You"
      />
    </Svg>
  );
}

export function FamilyTreePdfDocument({ data, generatedOn }: { data: FamilyTreeExportData; generatedOn: string }) {
  const sections = buildFamilyTreeStructure(data.people);
  const byTitle = new Map(sections.map((s) => [s.title, s.nodes]));
  const siblingsAndSpouse = byTitle.get("Siblings & Spouse") ?? [];
  const siblings = siblingsAndSpouse.filter((n) => n.person.relationshipToSenior === "sibling");
  const seniorsSpouse = siblingsAndSpouse.filter((n) => n.person.relationshipToSenior === "spouse");
  const friendsOther = byTitle.get("Close Friends & Others") ?? [];

  const flattenIds = (nodes: typeof friendsOther): string[] => nodes.flatMap((n) => [n.person.id, ...flattenIds(n.children)]);
  const friendsOtherIds = new Set(flattenIds(friendsOther));
  const peopleById = new Map(data.people.map((p) => [p.id, p]));

  const layout =
    data.people.length === 0
      ? null
      : computeFamilyTreeLayout({
          grandparents: byTitle.get("Grandparents") ?? [],
          parentsAndAuntsUncles: byTitle.get("Parents, Aunts & Uncles") ?? [],
          siblings,
          seniorsSpouse,
          children: byTitle.get("Children") ?? [],
          grandchildren: byTitle.get("Grandchildren, Nieces & Nephews") ?? [],
          friendsOther,
        });

  // Landscape A4 content area, minus padding — scaled DOWN (never up) to
  // fit both dimensions at once, so a large tree shrinks rather than
  // spilling past the page edge in either direction.
  const PAGE_W = 842; // A4 landscape points
  const PAGE_H = 595;
  const PAD = 28;
  const HEADER_H = 46;
  const availW = PAGE_W - PAD * 2;
  const availH = PAGE_H - PAD * 2 - HEADER_H;
  const scale = layout ? Math.min(1, availW / Math.max(layout.width, 300), availH / (layout.height + SENIOR_R + 32 + 56 + 20)) : 1;

  return (
    <Document title={`${data.seniorName}'s Family Tree`}>
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>{`${data.seniorName}’s Family Tree`}</Text>
        <View style={styles.coverRule} />
        <Text style={styles.coverSubtitle}>The people who shaped this story, from Roots &amp; Echoes</Text>
        <Text style={styles.coverMeta}>{`Generated ${generatedOn}`}</Text>
      </Page>

      <Page size="A4" orientation="landscape" style={styles.diagramPage}>
        <Text style={styles.pageHeading}>{`${data.seniorName}’s Family Tree`}</Text>
        {!layout ? (
          <Text style={styles.emptyState}>No family or friends have been added yet.</Text>
        ) : (
          <FamilyTreeSvg
            layout={layout}
            peopleById={peopleById}
            friendsOtherIds={friendsOtherIds}
            seniorSpouseIds={new Set(seniorsSpouse.map((n) => n.person.id))}
            seniorName={data.seniorName}
            seniorAvatarInitials={data.seniorAvatarInitials}
            seniorAvatarColor={data.seniorAvatarColor}
            scale={scale}
          />
        )}
      </Page>
    </Document>
  );
}
