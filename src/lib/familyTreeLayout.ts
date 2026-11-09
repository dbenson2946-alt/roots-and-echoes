// Shared, dependency-free tree-layout engine for the Family Tree diagram —
// pure geometry (node x/y positions + connector-line endpoints), no React,
// no DOM, no PDF-library imports. The same computed layout gets drawn two
// different ways: inline SVG on the live Family Tree page
// (FamilyTreeDiagram.tsx) and react-pdf's own Svg primitives in the PDF
// export (FamilyTreePdfDocument.tsx) — same "shared engine, two renderers"
// pattern already used by familyTreeStructure.ts (which this module
// consumes) and every per-category export in this app.
//
// Hand-rolled rather than pulling in a layout library (e.g. d3-hierarchy):
// a couple takes twice the horizontal space of a single person, and
// getting that variable-node-width case right with d3's own tree()
// needs either a second package (d3-flextree) or the same amount of
// custom width-accounting this file has to write anyway — so this stays
// a plain function with zero new runtime dependencies, consistent with
// every other export/structure module in this app (resizeImageForPdf.ts,
// letterboxImageToSquare.ts, familyTreeStructure.ts itself, etc.).
//
// This returns pure positions/ids only — no name, photo, or any other
// person field — by design. A renderer looks each node's `id` up against
// its own people-by-id map to get display content. Keeps this module
// completely dependency-free and independently testable with synthetic
// data (see the inline sanity check this file's own comment history
// describes running before wiring it into either renderer).
//
// What actually gets a drawn connector line, and what doesn't:
//  - Every parent/child link recorded via Person.parentIds (surfaced as
//    FamilyTreeStructureNode.children by buildFamilyTreeStructure) always
//    gets one — unambiguous, single-direction, already cycle-guarded
//    upstream.
//  - Two synthetic links the data model makes true *by definition*, not
//    by an explicit parentIds row: every relationshipToSenior === "parent"
//    person connects down to the senior, and every "child" person connects
//    up from the senior — found wherever they land, including nested
//    several levels deep under a grandparent or under a specific child.
//  - Everything else (a grandparent with no linked parent, an aunt/uncle,
//    a friend, anyone with no recorded parent link) floats in its own band
//    with no synthetic line — same as today's flat-row fallback. We
//    genuinely don't know enough to draw one.

import type { FamilyTreeStructureNode } from "./familyTreeStructure";

const NODE_W = 110; // horizontal space reserved for one circle + name label
const COUPLE_GAP = 14; // gap between a couple's two circles
const SIBLING_GAP = 36; // gap between adjacent top-level subtrees in a row
const LEVEL_H = 160; // vertical distance between a node's row and its children's row
const CIRCLE_R = 40; // circle radius — a node's y is its circle's CENTER, not its top
const SENIOR_CIRCLE_R = 46;
const LABEL_CLEARANCE = 60; // space below a circle's bottom edge for its two lines of text
const BAND_GAP = 40; // pure visual breathing room between one band's content and the next

/** Visual constants exported so both renderers draw the same-size circles
 * and leave the same label space — one source of truth, not duplicated.
 * Every node's x/y from computeFamilyTreeLayout is a circle CENTER —
 * drawing a circle, its label, or a connector line all need circleRadius
 * (or seniorCircleRadius for the one senior node) to find the actual edges. */
export const FAMILY_TREE_GEOMETRY = {
  nodeWidth: NODE_W,
  coupleGap: COUPLE_GAP,
  siblingGap: SIBLING_GAP,
  levelHeight: LEVEL_H,
  bandGap: BAND_GAP,
  circleRadius: CIRCLE_R,
  seniorCircleRadius: SENIOR_CIRCLE_R,
  labelClearance: LABEL_CLEARANCE,
};

export interface FamilyTreeLayoutPerson {
  id: string;
  relationshipToSenior: string;
}

export interface FamilyTreeLayoutNode {
  id: string;
  x: number;
  y: number;
  spouseId?: string;
  spouseX?: number;
}

export interface FamilyTreeLayoutEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface FamilyTreeLayoutBand {
  title: string;
  y: number;
  height: number;
}

export interface FamilyTreeLayout {
  width: number;
  height: number;
  nodes: FamilyTreeLayoutNode[];
  edges: FamilyTreeLayoutEdge[];
  bands: FamilyTreeLayoutBand[];
  /** The senior isn't a `people` row, so they're returned separately
   * rather than mixed into `nodes`. */
  seniorNode: { x: number; y: number };
}

interface RawNodeEntry<T> {
  person: T;
  x: number; // primary person's own circle center
  y: number;
  spouse?: T;
  spouseX?: number;
  anchorX: number; // pair-center (== x when there's no spouse) — used for connector lines
}

interface RawLayout<T> {
  width: number;
  nodes: RawNodeEntry<T>[]; // nodes[0] is always this layout's own top-level root(s) info is tracked by the caller
  edges: FamilyTreeLayoutEdge[];
}

function unitWidth(hasSpouse: boolean): number {
  return hasSpouse ? NODE_W * 2 + COUPLE_GAP : NODE_W;
}

function layoutSubtree<T extends { id: string }>(node: FamilyTreeStructureNode<T>, y: number): RawLayout<T> {
  const hasSpouse = !!node.spouse;
  const ownWidth = unitWidth(hasSpouse);
  const half = NODE_W / 2 + COUPLE_GAP / 2;

  const childLayouts = node.children.map((c) => layoutSubtree(c, y + LEVEL_H));
  const totalChildrenWidth = childLayouts.length
    ? childLayouts.reduce((sum, l) => sum + l.width, 0) + SIBLING_GAP * (childLayouts.length - 1)
    : 0;
  const width = Math.max(ownWidth, totalChildrenWidth);
  const anchorX = width / 2;

  const selfEntry: RawNodeEntry<T> = {
    person: node.person,
    x: hasSpouse ? anchorX - half : anchorX,
    y,
    spouse: node.spouse,
    spouseX: hasSpouse ? anchorX + half : undefined,
    anchorX,
  };

  const nodes: RawNodeEntry<T>[] = [selfEntry];
  const edges: FamilyTreeLayoutEdge[] = [];

  let cursor = (width - totalChildrenWidth) / 2;
  for (const cl of childLayouts) {
    const shift = cursor;
    for (const n of cl.nodes) {
      nodes.push({
        ...n,
        x: n.x + shift,
        spouseX: n.spouseX !== undefined ? n.spouseX + shift : undefined,
        anchorX: n.anchorX + shift,
      });
    }
    for (const e of cl.edges) edges.push({ x1: e.x1 + shift, y1: e.y1, x2: e.x2 + shift, y2: e.y2 });
    edges.push({ x1: anchorX, y1: y, x2: cl.nodes[0].anchorX + shift, y2: y + LEVEL_H });
    cursor += cl.width + SIBLING_GAP;
  }

  return { width, nodes, edges };
}

/** Packs several independent layouts left-to-right with SIBLING_GAP between
 * them (no parent anchor above the group — used for a whole band's row of
 * top-level people, and for combining siblings/senior/spouse into one
 * middle row). */
function packRawLayouts<T>(layouts: RawLayout<T>[]): RawLayout<T> {
  const width = layouts.reduce((sum, l) => sum + l.width, 0) + SIBLING_GAP * Math.max(0, layouts.length - 1);
  const nodes: RawNodeEntry<T>[] = [];
  const edges: FamilyTreeLayoutEdge[] = [];
  let cursor = 0;
  for (const l of layouts) {
    for (const n of l.nodes) {
      nodes.push({
        ...n,
        x: n.x + cursor,
        spouseX: n.spouseX !== undefined ? n.spouseX + cursor : undefined,
        anchorX: n.anchorX + cursor,
      });
    }
    for (const e of l.edges) edges.push({ x1: e.x1 + cursor, y1: e.y1, x2: e.x2 + cursor, y2: e.y2 });
    cursor += l.width + SIBLING_GAP;
  }
  return { width, nodes, edges };
}

function packRow<T extends { id: string }>(trees: FamilyTreeStructureNode<T>[], y: number): RawLayout<T> {
  if (trees.length === 0) return { width: 0, nodes: [], edges: [] };
  return packRawLayouts(trees.map((t) => layoutSubtree(t, y)));
}

// A node's y is its circle's CENTER — the space the band actually occupies
// on screen runs from the topmost circle's top edge down past the
// deepest row's circle AND its two-line name/sublabel underneath it. Used
// to decide where the *next* band can safely start without its own
// circles colliding with this band's label text.
function bandHeight<T>(raw: RawLayout<T>, radius: number): number {
  if (raw.nodes.length === 0) return 0;
  return Math.max(...raw.nodes.map((n) => n.y)) + radius + LABEL_CLEARANCE;
}

export function computeFamilyTreeLayout<T extends FamilyTreeLayoutPerson>(input: {
  grandparents: FamilyTreeStructureNode<T>[];
  parentsAndAuntsUncles: FamilyTreeStructureNode<T>[];
  siblings: FamilyTreeStructureNode<T>[];
  seniorsSpouse: FamilyTreeStructureNode<T>[];
  children: FamilyTreeStructureNode<T>[];
  grandchildren: FamilyTreeStructureNode<T>[];
  friendsOther: FamilyTreeStructureNode<T>[];
}): FamilyTreeLayout {
  // First pass: lay out every band independently, starting at y=0, so we
  // can find the widest one and center every other band under it.
  const grandparentsRaw = packRow(input.grandparents, 0);
  const parentsRaw = packRow(input.parentsAndAuntsUncles, 0);

  const siblingsRaw = packRow(input.siblings, 0);
  const spouseRaw = packRow(input.seniorsSpouse, 0);
  const midSegments: RawLayout<T>[] = [siblingsRaw, { width: NODE_W, nodes: [], edges: [] }, spouseRaw];
  let midCursor = 0;
  let seniorLocalX = 0;
  const midNodes: RawNodeEntry<T>[] = [];
  const midEdges: FamilyTreeLayoutEdge[] = [];
  midSegments.forEach((seg, i) => {
    if (i === 1) seniorLocalX = midCursor + seg.width / 2;
    for (const n of seg.nodes) {
      midNodes.push({
        ...n,
        x: n.x + midCursor,
        spouseX: n.spouseX !== undefined ? n.spouseX + midCursor : undefined,
        anchorX: n.anchorX + midCursor,
      });
    }
    for (const e of seg.edges) midEdges.push({ x1: e.x1 + midCursor, y1: e.y1, x2: e.x2 + midCursor, y2: e.y2 });
    midCursor += seg.width + (i < midSegments.length - 1 ? SIBLING_GAP : 0);
  });
  const midRaw: RawLayout<T> = { width: midCursor, nodes: midNodes, edges: midEdges };

  const childrenRaw = packRow(input.children, 0);
  const grandchildrenRaw = packRow(input.grandchildren, 0);
  const friendsRaw = packRow(input.friendsOther, 0);

  // No per-band "synth" tag here on purpose: a "parent" person can be
  // nested several levels deep inside the *Grandparents* band's own box
  // (if they're linked as a grandparent's child), not necessarily sitting
  // in the "Parents, Aunts & Uncles" band at all — so every node, in every
  // band, gets checked below regardless of which band it physically
  // renders inside.
  const bandsInOrder: { title: string; raw: RawLayout<T>; isMid?: boolean }[] = [
    { title: "Grandparents", raw: grandparentsRaw },
    { title: "Parents, Aunts & Uncles", raw: parentsRaw },
    { title: "", raw: midRaw, isMid: true },
    { title: "Children", raw: childrenRaw },
    { title: "Grandchildren, Nieces & Nephews", raw: grandchildrenRaw },
    { title: "Close Friends & Others", raw: friendsRaw },
  ].filter((b) => b.raw.width > 0);

  const maxWidth = Math.max(0, ...bandsInOrder.map((b) => b.raw.width));

  const nodes: FamilyTreeLayoutNode[] = [];
  const edges: FamilyTreeLayoutEdge[] = [];
  const bands: FamilyTreeLayoutBand[] = [];
  const parentCandidates: { x: number; y: number }[] = [];
  const childCandidates: { x: number; y: number }[] = [];
  let seniorNode = { x: 0, y: 0 };

  let cursorY = 0;
  for (const band of bandsInOrder) {
    const xOffset = (maxWidth - band.raw.width) / 2;
    const h = bandHeight(band.raw, band.isMid ? SENIOR_CIRCLE_R : CIRCLE_R);
    for (const n of band.raw.nodes) {
      const absX = n.x + xOffset;
      const absY = n.y + cursorY;
      const absSpouseX = n.spouseX !== undefined ? n.spouseX + xOffset : undefined;
      nodes.push({ id: n.person.id, x: absX, y: absY, spouseId: n.spouse?.id, spouseX: absSpouseX });
      if (n.person.relationshipToSenior === "parent") {
        parentCandidates.push({ x: n.anchorX + xOffset, y: absY });
      }
      if (n.person.relationshipToSenior === "child") {
        childCandidates.push({ x: n.anchorX + xOffset, y: absY });
      }
    }
    for (const e of band.raw.edges) {
      edges.push({ x1: e.x1 + xOffset, y1: e.y1 + cursorY, x2: e.x2 + xOffset, y2: e.y2 + cursorY });
    }
    if (band.isMid) {
      seniorNode = { x: seniorLocalX + xOffset, y: cursorY };
    }
    if (band.title) bands.push({ title: band.title, y: cursorY, height: h });
    cursorY += h + BAND_GAP;
  }
  const totalHeight = Math.max(0, cursorY - BAND_GAP);

  for (const p of parentCandidates) edges.push({ x1: p.x, y1: p.y, x2: seniorNode.x, y2: seniorNode.y });
  for (const c of childCandidates) edges.push({ x1: seniorNode.x, y1: seniorNode.y, x2: c.x, y2: c.y });

  return { width: maxWidth, height: totalHeight, nodes, edges, bands, seniorNode };
}
