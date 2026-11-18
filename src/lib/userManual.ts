// Pure parser for the user manual (src/content/userManual.ts). Turns the
// manual's small Markdown subset into plain data, so the Help page (HTML)
// and the downloadable PDF are built from exactly the same sections and
// can never drift apart. No React, no "server-only" — the same pattern as
// familyTreeStructure.ts. See the header of the content file for the
// subset it understands.

export interface ManualRun {
  text: string;
  bold: boolean;
}

/** A line of text with optional **bold** runs. */
export type ManualInline = ManualRun[];

export interface ManualListItem {
  text: ManualInline;
  /** A nested list directly under this item, if any. */
  children?: ManualListBlock;
}

export interface ManualListBlock {
  type: "list";
  ordered: boolean;
  items: ManualListItem[];
}

export type ManualBlock =
  | { type: "paragraph"; text: ManualInline }
  | { type: "subheading"; text: string }
  | ManualListBlock
  | { type: "table"; header: ManualInline[]; rows: ManualInline[][] };

export interface ManualSection {
  /** URL-safe anchor, e.g. "getting-started". */
  id: string;
  /** The leading number from "## 2. Getting started", if there was one. */
  number?: number;
  /** The title without its number. */
  title: string;
  blocks: ManualBlock[];
}

/** Splits **bold** markers into runs. An unmatched "**" is kept as text. */
export function parseInline(raw: string): ManualInline {
  const runs: ManualRun[] = [];
  const parts = raw.split("**");
  // An even number of parts means an unpaired "**": treat all of it as plain.
  if (parts.length % 2 === 0) return raw ? [{ text: raw, bold: false }] : [];
  parts.forEach((part, i) => {
    if (part) runs.push({ text: part, bold: i % 2 === 1 });
  });
  return runs;
}

/** The text of an inline value with the bold markers removed. */
export function inlineToPlain(inline: ManualInline): string {
  return inline.map((r) => r.text).join("");
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

const isTableDivider = (line: string) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line);
const LIST_RE = /^(\s*)(?:([-*])|(\d+)[.)])\s+(.*)$/;

function parseBlocks(lines: string[]): ManualBlock[] {
  const blocks: ManualBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    // Table: a "|" row followed by a divider row.
    if (line.trim().startsWith("|") && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const header = splitTableRow(line).map(parseInline);
      i += 2;
      const rows: ManualInline[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = splitTableRow(lines[i]).map(parseInline);
        // Pad/trim so every row has as many cells as the header.
        while (cells.length < header.length) cells.push([]);
        rows.push(cells.slice(0, header.length));
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    // List (possibly nested): consume consecutive list lines and blank
    // lines that are followed by more list lines.
    if (LIST_RE.test(line)) {
      const start = i;
      let end = i;
      while (end < lines.length) {
        if (LIST_RE.test(lines[end])) {
          end++;
        } else if (!lines[end].trim() && end + 1 < lines.length && LIST_RE.test(lines[end + 1])) {
          end++;
        } else {
          break;
        }
      }
      blocks.push(parseList(lines.slice(start, end).filter((l) => l.trim())));
      i = end;
      continue;
    }

    // A line made only of **bold** is a sub-heading.
    const sub = /^\*\*([^*]+)\*\*\s*$/.exec(line.trim());
    if (sub) {
      blocks.push({ type: "subheading", text: sub[1].trim() });
      i++;
      continue;
    }

    // Otherwise a paragraph: gather lines up to a blank line or another block.
    const para: string[] = [line.trim()];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !LIST_RE.test(lines[i]) &&
      !lines[i].trim().startsWith("|") &&
      !/^\*\*([^*]+)\*\*\s*$/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: "paragraph", text: parseInline(para.join(" ")) });
  }

  return blocks;
}

function parseList(lines: string[]): ManualListBlock {
  const indentOf = (l: string) => (LIST_RE.exec(l)?.[1].replace(/\t/g, "    ").length ?? 0);
  const baseIndent = Math.min(...lines.map(indentOf));
  const first = LIST_RE.exec(lines.find((l) => indentOf(l) === baseIndent) ?? lines[0])!;
  const list: ManualListBlock = { type: "list", ordered: first[3] !== undefined, items: [] };

  let i = 0;
  while (i < lines.length) {
    const m = LIST_RE.exec(lines[i])!;
    const item: ManualListItem = { text: parseInline(m[4].trim()) };
    i++;
    // Everything indented deeper than the base belongs to this item.
    const nested: string[] = [];
    while (i < lines.length && indentOf(lines[i]) > baseIndent) {
      nested.push(lines[i]);
      i++;
    }
    if (nested.length > 0) item.children = parseList(nested);
    list.items.push(item);
  }
  return list;
}

export function parseManual(markdown: string): ManualSection[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections: ManualSection[] = [];
  const usedIds = new Set<string>();
  let current: { heading: string; body: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const m = /^(\d+)\.\s+(.*)$/.exec(current.heading);
    const title = (m ? m[2] : current.heading).trim();
    let id = slugify(title);
    for (let n = 2; usedIds.has(id); n++) id = `${slugify(title)}-${n}`;
    usedIds.add(id);
    sections.push({ id, number: m ? Number(m[1]) : undefined, title, blocks: parseBlocks(current.body) });
  };
  for (const line of lines) {
    const h = /^##\s+(.*)$/.exec(line);
    if (h) {
      flush();
      current = { heading: h[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  flush();
  return sections;
}

/** Flattens a section (title, paragraphs, lists, tables) to plain text for
 * the Read aloud button. Tables read row by row as "Heading: value." */
export function sectionToSpeech(section: ManualSection): string {
  const out: string[] = [section.title + "."];
  const listText = (list: ManualListBlock, depth = 0): void => {
    list.items.forEach((item, idx) => {
      const lead = list.ordered && depth === 0 ? `Step ${idx + 1}. ` : "";
      const t = inlineToPlain(item.text).trim();
      out.push(lead + (/[.!?:]$/.test(t) ? t : t + "."));
      if (item.children) listText(item.children, depth + 1);
    });
  };
  for (const b of section.blocks) {
    if (b.type === "paragraph") out.push(inlineToPlain(b.text));
    else if (b.type === "subheading") out.push(b.text + ".");
    else if (b.type === "list") listText(b);
    else {
      for (const row of b.rows) {
        const cells = row.map((c, ci) => {
          const t = inlineToPlain(c).trim();
          return ci === 0 || !t ? t : `${inlineToPlain(b.header[ci] ?? []).trim()}: ${t}`;
        });
        out.push(cells.filter(Boolean).map((c) => (/[.!?]$/.test(c) ? c : c + ".")).join(" "));
      }
    }
  }
  return out.join("\n");
}
