import type { Person } from "@/lib/types";
import { RELATIONSHIP_LABELS } from "@/lib/ui";
import { FAMILY_TREE_GEOMETRY, type FamilyTreeLayout } from "@/lib/familyTreeLayout";

// Draws the Family Tree page's diagram as real SVG: circles connected by
// actual elbow connector lines (computed by familyTreeLayout.ts), not the
// old flex-wrap-plus-dashed-border approximation. The exact same computed
// layout is also drawn by FamilyTreePdfDocument.tsx via react-pdf's own Svg
// primitives, so the live page and the PDF export always show the same
// shape — this component just adds the browser-side styling (CSS vars,
// warm-keepsake colors) on top of the shared geometry.
//
// Sized at its natural pixel width/height (not a scaled viewBox) and
// wrapped in a horizontally-scrolling container, rather than shrinking
// everything to fit the screen — keeps every name/photo legible at a
// consistent size no matter how wide the tree grows, matching the choice
// made for the live page (the PDF export, which can't offer a scrollbar,
// scales to fit the page instead).

const R = FAMILY_TREE_GEOMETRY.circleRadius;
const SENIOR_R = FAMILY_TREE_GEOMETRY.seniorCircleRadius;
const LABEL_PAD = 14; // gap between circle edge and the start of connector lines
const LABEL_H = 56; // vertical space reserved below a circle for name + sublabel text

function sublabelFor(person: Person, useRelationshipFallback: boolean, seniorSpouseFirstName?: string): string | undefined {
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
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="var(--color-gold)" strokeWidth={2.5} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={r * 0.55} fontWeight={700} fill="var(--color-text)">
        {initials}
      </text>
      <text
        x={cx}
        y={cy + r + 20}
        textAnchor="middle"
        fontSize={15}
        fontWeight={700}
        fill="var(--color-text)"
        className="font-[family-name:var(--font-display)]"
      >
        {name.length > 16 ? `${name.slice(0, 15)}…` : name}
      </text>
      {sublabel && (
        <text x={cx} y={cy + r + 38} textAnchor="middle" fontSize={12} fill="var(--color-text-muted)">
          {sublabel}
        </text>
      )}
    </g>
  );
}

export function FamilyTreeDiagram({
  layout,
  peopleById,
  friendsOtherIds,
  seniorSpouseIds,
  senior,
}: {
  layout: FamilyTreeLayout;
  peopleById: Map<string, Person>;
  friendsOtherIds: Set<string>;
  /** The senior isn't a `people` row, so their own spouse can't be paired
   * via the normal Person.spouseId mechanism — these ids get a default
   * "Spouse of {senior}" sublabel instead, same as the old page did. */
  seniorSpouseIds: Set<string>;
  senior: { name: string; avatarInitials: string; avatarColor: string };
}) {
  const topPad = SENIOR_R + 32; // room for the first band's heading above its circles
  const totalHeight = layout.height + topPad + LABEL_H + 20;

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label={`${senior.name}'s family tree diagram`}
        width={Math.max(layout.width, 300)}
        height={totalHeight}
        viewBox={`0 0 ${Math.max(layout.width, 300)} ${totalHeight}`}
        className="mx-auto block"
      >
        {/* Band headings */}
        {layout.bands.map((band) => (
          <text
            key={band.title}
            x={layout.width / 2}
            y={band.y + topPad - R - 22}
            textAnchor="middle"
            fontSize={13}
            fontWeight={600}
            letterSpacing={1}
            fill="var(--color-text-muted)"
            style={{ textTransform: "uppercase" }}
          >
            {band.title}
          </text>
        ))}
        <text
          x={layout.width / 2}
          y={layout.seniorNode.y + topPad - SENIOR_R - 22}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          letterSpacing={1}
          fill="var(--color-text-muted)"
          style={{ textTransform: "uppercase" }}
        >
          {`Siblings, ${senior.name.split(" ")[0]}, & Spouse`}
        </text>

        {/* Connector lines, drawn as smooth curves rather than sharp elbows:
            when two ends share the same x (ordinary direct nesting, one row
            apart) the curve degenerates to a plain straight vertical line.
            When they don't — most often one of the two synthetic
            senior<->parent/child links, which can span a long way through
            columns other people also happen to occupy — a curve eases
            sideways gradually instead of tracing straight down someone
            else's column and appearing to pierce through their circle, the
            way a sharp right-angle elbow would. */}
        {layout.edges.map((e, i) => {
          const isSeniorEnd = (x: number, y: number) =>
            Math.abs(x - layout.seniorNode.x) < 0.01 && Math.abs(y - layout.seniorNode.y) < 0.01;
          const r1 = isSeniorEnd(e.x1, e.y1) ? SENIOR_R : R;
          const r2 = isSeniorEnd(e.x2, e.y2) ? SENIOR_R : R;
          const y1 = e.y1 + topPad + r1 + LABEL_PAD;
          const y2 = e.y2 + topPad - r2 - LABEL_PAD;
          const x1 = e.x1;
          const x2 = e.x2;
          // Control points sit at the horizontal MIDPOINT between the two
          // ends (not at each end's own x) — so the curve spends most of
          // its vertical travel between the two columns rather than
          // hugging either one, and only swings to x1/x2 right at its very
          // ends. A short same-column edge (x1 === x2, the common case for
          // ordinary direct nesting) still degenerates to a plain straight
          // line either way.
          const midX = (x1 + x2) / 2;
          const c1y = y1 + (y2 - y1) * 0.25;
          const c2y = y1 + (y2 - y1) * 0.75;
          const d = `M ${x1} ${y1} C ${midX} ${c1y}, ${midX} ${c2y}, ${x2} ${y2}`;
          return <path key={i} d={d} fill="none" stroke="var(--color-border)" strokeWidth={2} strokeDasharray="5 4" />;
        })}

        {/* Couple-pairing brackets: a short connecting line between a
            couple's two circles, so they read as one unit rather than two
            independent people who happen to be adjacent. */}
        {layout.nodes
          .filter((n) => n.spouseX !== undefined)
          .map((n) => (
            <line
              key={`couple-${n.id}`}
              x1={n.x + R}
              y1={n.y + topPad}
              x2={n.spouseX! - R}
              y2={n.y + topPad}
              stroke="var(--color-primary)"
              strokeWidth={3}
            />
          ))}

        {/* People */}
        {layout.nodes.map((n) => {
          const person = peopleById.get(n.id);
          if (!person) return null;
          const useFallback = friendsOtherIds.has(n.id);
          const nodes = [
            <PersonCircle
              key={n.id}
              cx={n.x}
              cy={n.y + topPad}
              r={R}
              initials={person.photoInitials}
              color={person.photoColor}
              name={person.name}
              sublabel={sublabelFor(person, useFallback, seniorSpouseIds.has(n.id) ? senior.name.split(" ")[0] : undefined)}
            />,
          ];
          if (n.spouseId && n.spouseX !== undefined) {
            const spouse = peopleById.get(n.spouseId);
            if (spouse) {
              nodes.push(
                <PersonCircle
                  key={n.spouseId}
                  cx={n.spouseX}
                  cy={n.y + topPad}
                  r={R}
                  initials={spouse.photoInitials}
                  color={spouse.photoColor}
                  name={spouse.name}
                  sublabel={spouse.relationshipLabel || (spouse.livingStatus === "deceased" ? "In loving memory" : `Spouse of ${person.name.split(" ")[0]}`)}
                />
              );
            }
          }
          return nodes;
        })}

        {/* The senior themself — not a `people` row, drawn specially, a
            little larger than everyone else. */}
        <PersonCircle
          cx={layout.seniorNode.x}
          cy={layout.seniorNode.y + topPad}
          r={SENIOR_R}
          initials={senior.avatarInitials}
          color={senior.avatarColor}
          name={senior.name}
          sublabel="You"
        />
      </svg>
    </div>
  );
}
