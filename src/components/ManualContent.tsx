import type { ReactNode } from "react";
import type { ManualBlock, ManualInline, ManualListBlock } from "@/lib/userManual";

// Renders the parsed user manual (src/lib/userManual.ts) as HTML in the
// app's Warm Keepsake style. Server component — nothing here is
// interactive. The PDF version of the same blocks is ManualPdfDocument.tsx.

export function Inline({ text }: { text: ManualInline }): ReactNode {
  return (
    <>
      {text.map((run, i) =>
        run.bold ? (
          <strong key={i} className="font-bold text-[var(--color-text)]">
            {run.text}
          </strong>
        ) : (
          <span key={i}>{run.text}</span>
        )
      )}
    </>
  );
}

function List({ list, nested = false }: { list: ManualListBlock; nested?: boolean }) {
  const Tag = list.ordered ? "ol" : "ul";
  return (
    <Tag
      className={
        (list.ordered ? "list-decimal" : "list-disc") +
        " space-y-2 pl-7 marker:font-bold marker:text-[var(--color-primary)]" +
        (nested ? " mt-2" : "")
      }
    >
      {list.items.map((item, i) => (
        <li key={i} className="pl-1">
          <Inline text={item.text} />
          {item.children && <List list={item.children} nested />}
        </li>
      ))}
    </Tag>
  );
}

function Table({ header, rows }: { header: ManualInline[]; rows: ManualInline[][] }) {
  return (
    <>
      {/* Wide screens: a real table. */}
      <div className="hidden overflow-hidden rounded-[12px] border-2 border-[var(--color-border)] md:block">
        <table className="w-full border-collapse text-left text-lg">
          <thead>
            <tr className="bg-[var(--color-bg)]">
              {header.map((h, i) => (
                <th key={i} scope="col" className="border-b-2 border-[var(--color-border)] px-4 py-3 text-base font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  <Inline text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="align-top odd:bg-transparent even:bg-[var(--color-bg)]/60">
                {row.map((cell, c) =>
                  c === 0 ? (
                    <th key={c} scope="row" className="border-t border-[var(--color-border)] px-4 py-3 font-bold">
                      <Inline text={cell} />
                    </th>
                  ) : (
                    <td key={c} className="border-t border-[var(--color-border)] px-4 py-3">
                      <Inline text={cell} />
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: each row becomes a small card, so nothing scrolls sideways. */}
      <div className="space-y-3 md:hidden">
        {rows.map((row, r) => (
          <div key={r} className="rounded-[12px] border-2 border-[var(--color-border)] bg-[var(--color-bg)]/60 p-4">
            <p className="text-xl font-bold">
              <Inline text={row[0]} />
            </p>
            {row.slice(1).map((cell, c) =>
              cell.length === 0 ? null : (
                <p key={c} className="mt-2">
                  <span className="block text-sm font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    <Inline text={header[c + 1]} />
                  </span>
                  <Inline text={cell} />
                </p>
              )
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function ManualBlocks({ blocks }: { blocks: ManualBlock[] }) {
  return (
    <div className="space-y-5 text-xl leading-relaxed">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={i}>
                <Inline text={block.text} />
              </p>
            );
          case "subheading":
            return (
              <h3 key={i} className="pt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-primary)]">
                {block.text}
              </h3>
            );
          case "list":
            return <List key={i} list={block} />;
          case "table":
            return <Table key={i} header={block.header} rows={block.rows} />;
        }
      })}
    </div>
  );
}
