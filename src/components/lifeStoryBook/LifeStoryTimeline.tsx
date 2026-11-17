import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Medallion } from "@/components/Medallion";
import { TimelineOverview } from "@/components/lifeStoryBook/TimelineOverview";
import {
  MILESTONE_KIND_META,
  MILESTONE_KINDS,
  MONTH_NAMES,
  type Timeline,
  type TimelineItem,
} from "@/lib/lifeStoryBook";
import type { MilestoneKind } from "@/lib/types";

/**
 * The Life Story Book's timeline: the pinned "whole life at a glance"
 * strip, then every decade from the first milestone to today, oldest
 * first, with a card per milestone. Purely presentational — it's handed a
 * ready-built Timeline (lifeStoryBook.ts) and never reads the session or
 * the database itself, so it renders the same wherever it's given data.
 */
export function LifeStoryTimeline({
  timeline,
  currentYear,
  canContribute,
  possessive,
}: {
  timeline: Timeline;
  currentYear: number;
  canContribute: boolean;
  /** "your" when the senior is looking at their own book, otherwise
   * e.g. "Ken's" */
  possessive: string;
}) {
  const total = timeline.ordered.length;

  if (total === 0) {
    return <EmptyBook canContribute={canContribute} possessive={possessive} />;
  }

  const usedKinds = new Set(timeline.ordered.map((m) => m.kind));
  const remainingStarters = MILESTONE_KINDS.filter(
    (kind) => kind !== "other" && !(MILESTONE_KIND_META[kind].once && usedKinds.has(kind))
  );

  return (
    <div className="space-y-6">
      <p className="!mb-2 text-lg text-[var(--color-text-muted)]">
        {total === 1 ? "1 milestone" : `${total} milestones`}, {timeline.firstYear} to today. Tap a decade to
        jump to it.
      </p>
      {/* A direct child of this tall container on purpose: a pinned
          (sticky) element only stays pinned while its own parent is on
          screen, so wrapping the strip in a small box of its own would
          let it scroll away with that box. */}
      <TimelineOverview
        decades={timeline.decades.map((d) => ({
          start: d.start,
          label: d.label,
          positions: d.items.map((item) => item.positionInDecade),
        }))}
      />

      <div>
        {timeline.decades.map((decade) =>
          decade.items.length === 0 ? (
            <section
              key={decade.start}
              id={`decade-${decade.start}`}
              tabIndex={-1}
              aria-label={`${decade.label}: no milestones yet`}
              className="ml-2 flex flex-wrap items-baseline gap-x-3 border-l-[3px] border-dashed border-[var(--color-border)] py-2 pl-6 text-[var(--color-text-muted)] focus:outline-none"
            >
              <span className="text-xl font-bold font-[family-name:var(--font-display)]">{decade.label}</span>
              <span className="text-base">No milestones yet</span>
            </section>
          ) : (
            <section
              key={decade.start}
              id={`decade-${decade.start}`}
              tabIndex={-1}
              aria-labelledby={`decade-${decade.start}-heading`}
              className="focus:outline-none"
            >
              <div className="flex flex-wrap items-baseline gap-x-4 border-b-2 border-[var(--color-life)] pb-1 pt-6">
                <h2
                  id={`decade-${decade.start}-heading`}
                  className="text-3xl font-bold"
                  style={{ color: "var(--color-life)" }}
                >
                  {decade.label}
                </h2>
                {decade.ageRange && (
                  <span className="text-lg text-[var(--color-text-muted)]">
                    {decade.ageRange.from === decade.ageRange.to
                      ? `Age ${decade.ageRange.to}`
                      : `Ages ${decade.ageRange.from} to ${decade.ageRange.to}`}
                  </span>
                )}
              </div>
              <ol className="ml-2 space-y-4 border-l-[3px] border-[var(--color-life)] pb-4 pl-6 pt-4">
                {decade.items.map((item) => (
                  <li key={item.milestone.id} id={`m-${item.milestone.id}`} className="relative scroll-mt-28">
                    <span
                      aria-hidden="true"
                      className="absolute left-[calc(-1.5rem_-_10.5px)] top-7 h-[18px] w-[18px] rounded-full border-[3px] border-[var(--color-bg)] bg-[var(--color-life)]"
                    />
                    <MilestoneCard item={item} />
                  </li>
                ))}
              </ol>
            </section>
          )
        )}

        <div className="ml-2 flex items-center gap-3 border-l-[3px] border-dashed border-[var(--color-border)] pb-1 pl-6 pt-4">
          <Icon name="clock" className="h-6 w-6 shrink-0" style={{ color: "var(--color-life)" }} />
          <p className="text-xl font-bold">
            Today <span className="font-normal text-[var(--color-text-muted)]">· {currentYear}</span>
          </p>
        </div>
      </div>

      {canContribute && (
        <div className="tile tile-accent-life space-y-4 p-6">
          <Link href="/life-story-book/new" className="btn-lg btn-primary w-full sm:w-auto">
            <Icon name="plus" className="h-5 w-5" /> Add a milestone
          </Link>
          {remainingStarters.length > 0 && (
            <details>
              <summary className="cursor-pointer text-lg font-semibold underline decoration-2 underline-offset-4">
                Ideas for what to add next
              </summary>
              <div className="mt-4">
                <StarterChips kinds={remainingStarters} />
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function MilestoneCard({ item }: { item: TimelineItem }) {
  const m = item.milestone;
  const meta = MILESTONE_KIND_META[m.kind];
  // No age beside the birth itself — its own "Born" label already says it.
  const ageLabel = item.age !== undefined ? `Age ${item.age}` : null;
  const dayAndMonth = m.month ? (m.day ? `${MONTH_NAMES[m.month - 1]} ${m.day}` : MONTH_NAMES[m.month - 1]) : null;

  return (
    <Link
      href={`/life-story-book/${m.id}`}
      className="tile tile-compact tile-accent-life flex flex-col gap-4 hover:bg-[var(--color-life-tint)] sm:flex-row sm:items-start"
    >
      <span className="flex shrink-0 items-baseline gap-3 sm:w-28 sm:flex-col sm:gap-0">
        <span
          className="text-3xl font-bold leading-tight font-[family-name:var(--font-display)]"
          style={{ color: "var(--color-life)" }}
        >
          {m.year}
        </span>
        {ageLabel && <span className="text-lg text-[var(--color-text-muted)]">{ageLabel}</span>}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 text-base text-[var(--color-text-muted)]">
          <Icon name={meta.icon} className="h-5 w-5 shrink-0" style={{ color: "var(--color-life)" }} />
          <span>{meta.label}</span>
          {dayAndMonth && <span>· {dayAndMonth}</span>}
        </span>
        <span className="mt-1 block text-xl font-bold">{m.title}</span>
        {m.description && (
          <span className="mt-1 block text-lg text-accent">
            {m.description.slice(0, 160)}
            {m.description.length > 160 ? "…" : ""}
          </span>
        )}
      </span>

      {m.photo?.imageUrl && (
        <span className="flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-life-tint)] sm:h-28 sm:w-36">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset Next's optimizer can cache */}
          <img src={m.photo.imageUrl} alt="" className="h-full w-full object-contain" />
        </span>
      )}
    </Link>
  );
}

function StarterChips({ kinds }: { kinds: MilestoneKind[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {kinds.map((kind) => (
        <li key={kind}>
          <Link
            href={`/life-story-book/new?kind=${kind}`}
            className="tile tile-compact tile-accent-life flex items-center gap-3 hover:bg-[var(--color-life-tint)]"
          >
            <Medallion icon={MILESTONE_KIND_META[kind].icon} size="sm" />
            <span className="text-lg font-bold">{MILESTONE_KIND_META[kind].label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyBook({ canContribute, possessive }: { canContribute: boolean; possessive: string }) {
  return (
    <div className="tile tile-accent-life space-y-5 p-6">
      <p className="text-xl leading-relaxed">
        This is where the key moments of {possessive} life will appear, in order — being born, starting
        school, a first job, a wedding, children, retirement. It doesn&rsquo;t need everything: a handful of
        milestones is a fine start, and more can be added any time.
      </p>
      {canContribute ? (
        <>
          <h2 className="text-2xl font-bold">Where would you like to start?</h2>
          <StarterChips kinds={MILESTONE_KINDS} />
        </>
      ) : (
        <p className="text-lg text-[var(--color-text-muted)]">No milestones have been added yet.</p>
      )}
    </div>
  );
}
