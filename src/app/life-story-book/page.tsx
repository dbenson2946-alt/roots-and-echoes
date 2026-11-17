import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getMilestones, getGrant, getProfile } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { LifeStoryTimeline } from "@/components/lifeStoryBook/LifeStoryTimeline";
import { buildTimeline } from "@/lib/lifeStoryBook";
import type { LifeMilestone } from "@/lib/types";

/**
 * The Life Story Book: a timeline of the key milestones in a person's
 * life — its own section on Home, separate from Story Time (see the doc
 * comment on LifeMilestone in types.ts). This page only gathers the data
 * and the permission; LifeStoryTimeline does the drawing.
 */
export default async function LifeStoryBookPage() {
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const [senior, grant] = await Promise.all([
    getProfile(seniorId),
    session.isSelf ? Promise.resolve(undefined) : getGrant(session.profile.id, seniorId),
  ]);
  // Same "contribute" gate as every other write in the app (§4a): a
  // view-only caregiver can read the book but not add to it.
  const canContribute = session.isSelf || grant?.permission === "contribute";

  // If the milestones can't be read at all — in practice, because
  // supabase/migration_13_life_milestones.sql hasn't been run yet — say so
  // plainly instead of showing a crash page.
  let milestones: LifeMilestone[] = [];
  let unavailable = false;
  try {
    milestones = await getMilestones(seniorId);
  } catch (err) {
    unstable_rethrow(err);
    console.error("Life Story Book could not load milestones:", err);
    unavailable = true;
  }

  const currentYear = new Date().getFullYear();
  const timeline = buildTimeline(milestones, currentYear);
  const firstName = senior?.name.split(" ")[0] ?? "";
  const possessive = session.isSelf || !firstName ? "your" : `${firstName}’s`;

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Medallion icon="timeline" accent="var(--color-life)" />
            <div>
              <h1 className="text-3xl font-bold">Life Story Book</h1>
              <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
                The key moments of {possessive} life, in order.
              </p>
            </div>
          </div>
          {canContribute && !unavailable && milestones.length > 0 && (
            <Link href="/life-story-book/new" className="btn-lg btn-primary">
              <Icon name="plus" className="h-5 w-5" /> Add a milestone
            </Link>
          )}
        </div>

        {unavailable ? (
          <p className="tile tile-accent-life p-6 text-xl leading-relaxed">
            The Life Story Book isn&rsquo;t quite ready yet — one setup step for the database still needs to be
            run. Everything else in the app is working as usual.
          </p>
        ) : (
          <LifeStoryTimeline
            timeline={timeline}
            currentYear={currentYear}
            canContribute={canContribute}
            possessive={possessive}
          />
        )}
      </main>
    </div>
  );
}
