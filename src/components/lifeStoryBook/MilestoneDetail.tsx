import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { DeleteMilestoneButton } from "@/components/lifeStoryBook/DeleteMilestoneButton";
import { MILESTONE_KIND_META, formatMilestoneDate } from "@/lib/lifeStoryBook";
import { formatDate } from "@/lib/ui";
import type { LifeMilestone } from "@/lib/types";

/**
 * One milestone, full size — the "page" of the Life Story Book. The large
 * Previous / Next buttons underneath move through the book in date order,
 * so a whole life can be paged through one milestone at a time. Purely
 * presentational, like LifeStoryTimeline.
 */
export function MilestoneDetail({
  milestone,
  age,
  position,
  total,
  previous,
  next,
  canContribute,
}: {
  milestone: LifeMilestone;
  /** age at the time, when it can be worked out */
  age?: number;
  /** 1-based place in the book */
  position: number;
  total: number;
  previous?: LifeMilestone;
  next?: LifeMilestone;
  canContribute: boolean;
}) {
  const meta = MILESTONE_KIND_META[milestone.kind];
  const dateText = formatMilestoneDate(milestone);
  const ageLabel = milestone.kind === "born" ? null : age !== undefined ? `Age ${age}` : null;
  const readAloudText = [milestone.title, dateText, ageLabel, milestone.description].filter(Boolean).join(". ");

  return (
    <div className="space-y-6">
      <article className="tile tile-accent-life space-y-5 p-6">
        <div className="flex flex-wrap items-center gap-3 text-lg text-[var(--color-text-muted)]">
          <Icon name={meta.icon} className="h-7 w-7" style={{ color: "var(--color-life)" }} />
          <span>{meta.label}</span>
        </div>

        <p className="flex flex-wrap items-baseline gap-x-4">
          <span
            className="text-4xl font-bold font-[family-name:var(--font-display)]"
            style={{ color: "var(--color-life)" }}
          >
            {dateText}
          </span>
          {ageLabel && <span className="text-2xl text-[var(--color-text-muted)]">{ageLabel}</span>}
        </p>

        <h1 className="text-3xl font-bold">{milestone.title}</h1>

        {milestone.photo?.imageUrl && (
          <div className="flex h-64 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-life-tint)] sm:h-96">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset Next's optimizer can cache */}
            <img
              src={milestone.photo.imageUrl}
              alt={milestone.photo.caption || milestone.photo.label || milestone.title}
              className="h-full w-full object-contain"
            />
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <ReadAloudButton text={readAloudText} />
        </div>

        {milestone.description && (
          <p className="whitespace-pre-wrap text-xl leading-relaxed">{milestone.description}</p>
        )}

        <p className="text-base text-[var(--color-text-muted)]">
          Added by {milestone.enteredBy.name} · {formatDate(milestone.createdAt)}
        </p>

        {canContribute && (
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-4">
            <Link
              href={`/life-story-book/${milestone.id}/edit`}
              className="btn-lg btn-secondary !min-h-0 !px-4 !py-2 text-base"
            >
              <Icon name="edit" className="h-4 w-4" /> Edit this milestone
            </Link>
            <DeleteMilestoneButton milestoneId={milestone.id} />
          </div>
        )}
      </article>

      <nav aria-label="Move through the Life Story Book" className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {previous ? (
            <Link
              href={`/life-story-book/${previous.id}`}
              className="btn-lg btn-secondary !items-start !justify-start flex-col !gap-1 text-left"
            >
              <span className="flex items-center gap-2">
                <Icon name="arrowLeft" className="h-5 w-5" /> Previous
              </span>
              <span className="text-base font-normal text-[var(--color-text-muted)]">
                {previous.year} · {previous.title}
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next ? (
            <Link
              href={`/life-story-book/${next.id}`}
              className="btn-lg btn-primary !items-end !justify-start flex-col !gap-1 text-right"
            >
              <span className="flex items-center gap-2">
                Next <Icon name="arrowRight" className="h-5 w-5" />
              </span>
              <span className="text-base font-normal">
                {next.year} · {next.title}
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
        </div>
        <p className="text-center text-lg text-[var(--color-text-muted)]">
          Milestone {position} of {total}
        </p>
      </nav>
    </div>
  );
}
