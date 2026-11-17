import type { LifeMilestone, MilestoneKind } from "./types";
import type { IconName } from "@/components/Icon";

// Pure, dependency-free helpers for the Life Story Book (no "server-only",
// no React) — same split as familyTreeLayout.ts / lifeStoryExport.ts, so
// the timeline page, the overview strip, the forms and any future PDF
// export can all share one definition of "what order are milestones in"
// and "how old was the person then".

export const MILESTONE_KIND_META: Record<
  MilestoneKind,
  {
    /** shown on the starter chip, in the type picker, and on each card */
    label: string;
    icon: IconName;
    /** a neutral title pre-filled when this kind is chosen from a starter
     * chip — worded so it reads right whether the senior or a caregiver
     * is typing. Empty where the title needs a name ("Sister Mary born"). */
    starterTitle: string;
    /** example shown as the title field's placeholder */
    titleExample: string;
    /** true for things that normally happen once in a life, so the starter
     * chip is dropped once one exists. */
    once: boolean;
  }
> = {
  born: { label: "Born", icon: "sun", starterTitle: "Born", titleExample: "Born in Milwaukee", once: true },
  sibling_born: { label: "Brother or sister born", icon: "family", starterTitle: "", titleExample: "Sister Mary was born", once: false },
  school: { label: "Started school", icon: "books", starterTitle: "Started school", titleExample: "Started at Lincoln Elementary", once: false },
  graduation: { label: "Graduated", icon: "milestone", starterTitle: "Graduated", titleExample: "Graduated from high school", once: false },
  first_job: { label: "First job", icon: "work", starterTitle: "First job", titleExample: "First job at the paper mill", once: true },
  marriage: { label: "Married", icon: "heart", starterTitle: "Married", titleExample: "Married Dorothy", once: false },
  child_born: { label: "Child born", icon: "childhood", starterTitle: "", titleExample: "Our son David was born", once: false },
  career: { label: "Career milestone", icon: "work", starterTitle: "", titleExample: "Promoted to foreman", once: false },
  moved: { label: "Moved home", icon: "home", starterTitle: "", titleExample: "Moved to the house on Oak Street", once: false },
  retirement: { label: "Retired", icon: "waves", starterTitle: "Retired", titleExample: "Retired after 38 years", once: true },
  other: { label: "Something else", icon: "sparkle", starterTitle: "", titleExample: "A day to remember", once: false },
};

/** Order the kinds are offered in — roughly the order they happen in a life. */
export const MILESTONE_KINDS = Object.keys(MILESTONE_KIND_META) as MilestoneKind[];

export function isMilestoneKind(value: unknown): value is MilestoneKind {
  return typeof value === "string" && value in MILESTONE_KIND_META;
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** The earliest year the forms accept. Generous on purpose — a timeline
 * may reasonably begin with a parent's wedding or a grandparent's arrival. */
export const MIN_MILESTONE_YEAR = 1850;

type Dated = Pick<LifeMilestone, "year" | "month" | "day">;

/** "June 12, 1958", "June 1958" or just "1958", depending on how much of
 * the date is known. A day without a month is ignored. */
export function formatMilestoneDate(m: Dated): string {
  if (!m.month) return String(m.year);
  const month = MONTH_NAMES[m.month - 1];
  return m.day ? `${month} ${m.day}, ${m.year}` : `${month} ${m.year}`;
}

/** Chronological order. Within the same year, entries are ordered by month
 * and day where those are known; an entry with only a year comes after the
 * dated ones ("sometime that year"), except a "Born" entry with only a
 * year, which comes first — nothing else that year can sensibly precede
 * it. Remaining ties keep the order they were added in. Expressed as a
 * single sort key (rather than pairwise special cases) so the ordering is
 * always consistent. */
function sortKey(m: LifeMilestone): [number, number, number, number] {
  const month = m.month ?? (m.kind === "born" ? 0 : 13);
  const day = m.month ? m.day ?? 0 : 0;
  return [m.year, month, day, m.kind === "born" ? 0 : 1];
}

export function compareMilestones(a: LifeMilestone, b: LifeMilestone): number {
  const ka = sortKey(a);
  const kb = sortKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i];
  }
  return a.createdAt.localeCompare(b.createdAt);
}

export function sortMilestones(milestones: LifeMilestone[]): LifeMilestone[] {
  return [...milestones].sort(compareMilestones);
}

/** The "Born" milestone ages are counted from — the earliest one, in the
 * unlikely case there is more than one. */
export function findBirth(milestones: LifeMilestone[]): LifeMilestone | undefined {
  return sortMilestones(milestones).find((m) => m.kind === "born");
}

/**
 * How old the person was at a given point, counted from their "Born"
 * milestone. Exact when both dates include a month (and, in the birthday
 * month, a day); otherwise simply the difference in years, which can be
 * one more than the true age if the birthday hadn't come round yet.
 * Undefined when there's no birth date to count from, or the date is
 * before the birth.
 */
export function ageAt(point: Dated, birth: Dated | undefined): number | undefined {
  if (!birth) return undefined;
  let age = point.year - birth.year;
  if (point.month && birth.month) {
    const beforeBirthday =
      point.month < birth.month ||
      (point.month === birth.month && !!point.day && !!birth.day && point.day < birth.day);
    if (beforeBirthday) age -= 1;
  }
  return age >= 0 ? age : undefined;
}

export interface TimelineItem {
  milestone: LifeMilestone;
  /** age at the time; undefined for the birth itself, for anything before
   * it, or when no "Born" milestone exists yet */
  age?: number;
  /** 0–100: where in its decade the year falls, for the overview strip */
  positionInDecade: number;
}

export interface TimelineDecade {
  /** first year of the decade, e.g. 1950 */
  start: number;
  /** "1950s" */
  label: string;
  items: TimelineItem[];
  /** youngest/oldest the person was during the part of this decade that
   * falls inside the timeline; undefined without a "Born" milestone or
   * for a decade entirely before the birth */
  ageRange?: { from: number; to: number };
}

export interface Timeline {
  /** every milestone, in chronological order */
  ordered: LifeMilestone[];
  birth?: LifeMilestone;
  /** year of the earliest milestone (currentYear when there are none) */
  firstYear: number;
  /** the later of the current year and the latest milestone */
  lastYear: number;
  /** every decade from the first milestone's to the current one, including
   * empty ones — so the whole span of the life is always visible */
  decades: TimelineDecade[];
}

const decadeOf = (year: number) => Math.floor(year / 10) * 10;

export function buildTimeline(milestones: LifeMilestone[], currentYear: number): Timeline {
  const ordered = sortMilestones(milestones);
  const birth = ordered.find((m) => m.kind === "born");
  const firstYear = ordered.length > 0 ? ordered[0].year : currentYear;
  const lastYear = ordered.length > 0 ? Math.max(currentYear, ordered[ordered.length - 1].year) : currentYear;

  const decades: TimelineDecade[] = [];
  for (let start = decadeOf(firstYear); start <= decadeOf(lastYear); start += 10) {
    const items: TimelineItem[] = ordered
      .filter((m) => decadeOf(m.year) === start)
      .map((m) => ({
        milestone: m,
        age: m === birth ? undefined : ageAt(m, birth),
        // mid-year when the month isn't known; by month when it is, so two
        // milestones in the same year don't sit exactly on top of each other
        positionInDecade:
          Math.round((m.year - start + (m.month ? (m.month - 0.5) / 12 : 0.5)) * 1000) / 100,
      }));

    let ageRange: TimelineDecade["ageRange"];
    if (birth) {
      const from = Math.max(start, firstYear) - birth.year;
      const to = Math.min(start + 9, lastYear) - birth.year;
      if (to >= 0) ageRange = { from: Math.max(0, from), to };
    }

    decades.push({ start, label: `${start}s`, items, ageRange });
  }

  return { ordered, birth, firstYear, lastYear, decades };
}

/** The milestones either side of one, in chronological order — for the
 * detail page's Previous / Next buttons. */
export function neighbours(
  ordered: LifeMilestone[],
  id: string
): { index: number; previous?: LifeMilestone; next?: LifeMilestone } {
  const index = ordered.findIndex((m) => m.id === id);
  if (index === -1) return { index };
  return { index, previous: ordered[index - 1], next: ordered[index + 1] };
}

/** Validates the date fields of the add/edit form. Returns the cleaned
 * values, or a message safe to show the person. */
export function parseMilestoneDate(
  input: { year: string; month: string; day: string },
  currentYear: number
): { ok: true; year: number; month?: number; day?: number } | { ok: false; message: string } {
  const year = Number(input.year.trim());
  if (!input.year.trim() || !Number.isInteger(year)) {
    return { ok: false, message: "Please enter the year as four digits, like 1958." };
  }
  if (year < MIN_MILESTONE_YEAR || year > currentYear) {
    return { ok: false, message: `Please enter a year between ${MIN_MILESTONE_YEAR} and ${currentYear}.` };
  }
  const month = input.month.trim() ? Number(input.month) : undefined;
  if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
    return { ok: false, message: "Please choose a month from the list." };
  }
  let day = input.day.trim() ? Number(input.day) : undefined;
  if (day !== undefined) {
    if (!month) {
      // A day on its own can't be placed — keep the year, drop the day.
      day = undefined;
    } else {
      const daysInMonth = new Date(year, month, 0).getDate();
      if (!Number.isInteger(day) || day < 1 || day > daysInMonth) {
        return { ok: false, message: `${MONTH_NAMES[month - 1]} ${year} has ${daysInMonth} days — please check the day.` };
      }
    }
  }
  return { ok: true, year, month, day };
}
