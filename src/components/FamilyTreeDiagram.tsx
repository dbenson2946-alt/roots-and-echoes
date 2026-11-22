"use client";

import { useMemo, useState } from "react";
import type { Person } from "@/lib/types";
import { RELATIONSHIP_LABELS } from "@/lib/ui";
import { FAMILY_TREE_GEOMETRY, connectorPath, type FamilyTreeLayout } from "@/lib/familyTreeLayout";
import { sectionTitleForRelationship } from "@/lib/familyTreeStructure";
import { describeEditChange } from "@/lib/familyEditNote";
import { SENIOR_SPOUSE_VALUE } from "@/lib/ui";
import { PersonEditPanel, OwnNamePanel } from "@/components/FamilyTreeEditPanel";
import type { SavedPersonValues } from "@/components/PersonEditForm";

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
const LABEL_PAD = 8; // gap between a circle's top edge and the END of a connector line
const START_PAD = FAMILY_TREE_GEOMETRY.connectorStartPad; // a connector STARTS below the name labels, not through them
const SIDE_PAD = 28; // so a long name under the outermost circle isn't clipped
const LABEL_H = 56; // vertical space reserved below a circle for name + sublabel text

// Band headings are drawn on top of the connector lines, with a halo in the
// tile's own fill color, so a line that happens to pass behind one (the
// line down to the senior always passes right under the middle heading)
// breaks around the words instead of striking through them.
const HEADING_STYLE = {
  textTransform: "uppercase",
  paintOrder: "stroke",
  stroke: "var(--color-surface)",
  strokeWidth: 8,
  strokeLinejoin: "round",
} as const;

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
  onSelect,
  selected,
}: {
  cx: number;
  cy: number;
  r: number;
  initials: string;
  color: string;
  name: string;
  sublabel?: string;
  /** When given, the circle is a button that opens its edit panel. */
  onSelect?: () => void;
  selected?: boolean;
}) {
  return (
    <g
      {...(onSelect
        ? {
            role: "button",
            tabIndex: 0,
            "aria-label": `Edit ${name}`,
            "aria-expanded": Boolean(selected),
            className: "tree-person",
            onClick: onSelect,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            },
          }
        : {})}
    >
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
  people,
  friendsOtherIds,
  seniorSpouseIds,
  senior,
  editable,
  canEditOwnName,
}: {
  layout: FamilyTreeLayout;
  people: Person[];
  friendsOtherIds: string[];
  /** The senior isn't a `people` row, so their own spouse can't be paired
   * via the normal Person.spouseId mechanism — these ids get a default
   * "Spouse of {senior}" sublabel instead, same as the old page did. */
  seniorSpouseIds: string[];
  senior: { name: string; avatarInitials: string; avatarColor: string };
  /** Circles open an edit panel when tapped — only for the account owner and
   * caregivers with "contribute" access; a view-only caregiver gets a plain
   * picture with nothing to tap. */
  editable: boolean;
  /** The senior's own circle is tappable too (to change their name) — only
   * for the account owner themselves. */
  canEditOwnName: boolean;
}) {
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const friendsOther = useMemo(() => new Set(friendsOtherIds), [friendsOtherIds]);
  const seniorSpouses = useMemo(() => new Set(seniorSpouseIds), [seniorSpouseIds]);
  const [selected, setSelected] = useState<{ kind: "person"; id: string } | { kind: "senior" } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const select = (next: NonNullable<typeof selected>) => {
    setNotice(null);
    setSelected(next);
  };
  const selectedPerson = selected?.kind === "person" ? peopleById.get(selected.id) : undefined;
  const selectPerson = (id: string) => (editable ? () => select({ kind: "person", id }) : undefined);

  const onPersonSaved = (before: Person, saved: SavedPersonValues) => {
    const after = {
      name: saved.name,
      relationshipToSenior: saved.relationshipToSenior,
      spouseId: saved.spouseChoice === SENIOR_SPOUSE_VALUE ? null : saved.spouseChoice,
      parentIds: saved.parentIds,
    };
    setNotice(
      describeEditChange(
        { name: before.name, relationshipToSenior: before.relationshipToSenior, spouseId: before.spouseId ?? null, parentIds: before.parentIds },
        after,
        (id) => peopleById.get(id)?.name,
        sectionTitleForRelationship
      )
    );
    setSelected(null);
  };

  const topPad = SENIOR_R + 32; // room for the first band's heading above its circles
  const totalHeight = layout.height + topPad + LABEL_H + 20;

  return (
    <div>
      {editable && (
        <p className="mb-3 text-lg text-[var(--color-text-muted)] text-accent">
          Tap anyone&rsquo;s circle to change their details{canEditOwnName ? " — including your own name" : ""}.
        </p>
      )}
      {notice && (
        <p role="status" className="mb-3 rounded-xl bg-[var(--color-primary-tint)] p-3 text-lg font-semibold">
          {notice}
        </p>
      )}
      <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label={`${senior.name}'s family tree diagram`}
        width={Math.max(layout.width, 300) + SIDE_PAD * 2}
        height={totalHeight}
        viewBox={`${-SIDE_PAD} 0 ${Math.max(layout.width, 300) + SIDE_PAD * 2} ${totalHeight}`}
        className="mx-auto block"
      >
        {/* Connector lines. Each leaves its parent below the name labels and
            runs down, across in the gap between the two rows, and down into
            the child (see connectorPath in familyTreeLayout.ts, shared with
            the PDF). Drawn before the headings so a heading's halo can
            break a line that passes behind it. */}
        {layout.edges.map((e, i) => {
          const isSeniorEnd = (x: number, y: number) =>
            Math.abs(x - layout.seniorNode.x) < 0.01 && Math.abs(y - layout.seniorNode.y) < 0.01;
          const r1 = isSeniorEnd(e.x1, e.y1) ? SENIOR_R : R;
          const r2 = isSeniorEnd(e.x2, e.y2) ? SENIOR_R : R;
          const y1 = e.y1 + topPad + r1 + START_PAD;
          const y2 = e.y2 + topPad - r2 - LABEL_PAD;
          const d = connectorPath(e.x1, y1, e.x2, y2);
          return <path key={i} d={d} fill="none" stroke="var(--color-border)" strokeWidth={2} strokeDasharray="5 4" />;
        })}

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
            style={HEADING_STYLE}
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
          style={HEADING_STYLE}
        >
          {`Siblings, ${senior.name.split(" ")[0]}, & Spouse`}
        </text>

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
          const useFallback = friendsOther.has(n.id);
          const nodes = [
            <PersonCircle
              key={n.id}
              cx={n.x}
              cy={n.y + topPad}
              r={R}
              initials={person.photoInitials}
              color={person.photoColor}
              name={person.name}
              sublabel={sublabelFor(person, useFallback, seniorSpouses.has(n.id) ? senior.name.split(" ")[0] : undefined)}
              onSelect={selectPerson(n.id)}
              selected={selected?.kind === "person" && selected.id === n.id}
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
                  onSelect={selectPerson(n.spouseId)}
                  selected={selected?.kind === "person" && selected.id === n.spouseId}
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
          onSelect={canEditOwnName ? () => select({ kind: "senior" }) : undefined}
          selected={selected?.kind === "senior"}
        />
      </svg>
      </div>

      {selectedPerson && (
        <PersonEditPanel
          key={selectedPerson.id}
          person={selectedPerson}
          allPeople={people}
          seniorName={senior.name}
          onSaved={(saved) => onPersonSaved(selectedPerson, saved)}
          onDeleted={() => {
            setNotice(`${selectedPerson.name} was removed from the family tree.`);
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}
      {selected?.kind === "senior" && canEditOwnName && (
        <OwnNamePanel
          name={senior.name}
          onSaved={(newName) => {
            setNotice(`Your name is now ${newName}.`);
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
