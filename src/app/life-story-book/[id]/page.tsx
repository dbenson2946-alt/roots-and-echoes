import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getMilestones, getGrant } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { MilestoneDetail } from "@/components/lifeStoryBook/MilestoneDetail";
import { ageAt, neighbours, sortMilestones } from "@/lib/lifeStoryBook";

/** One milestone, full size, with Previous / Next through the book. The
 * whole list is loaded (it's small by design) so the neighbours and the
 * "3 of 14" position come from the same ordering the timeline uses. */
export default async function MilestonePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const { id } = await params;

  const ordered = sortMilestones(await getMilestones(seniorId));
  const { index, previous, next } = neighbours(ordered, id);
  // Not found — most often because it was just removed, or the link is an
  // old one. Going back to the timeline is kinder than a "not found" page.
  if (index === -1) redirect("/life-story-book");
  const milestone = ordered[index];

  const grant = session.isSelf ? undefined : await getGrant(session.profile.id, seniorId);
  const canContribute = session.isSelf || grant?.permission === "contribute";
  const birth = ordered.find((m) => m.kind === "born");

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link
          href={`/life-story-book#m-${milestone.id}`}
          className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4"
        >
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to the timeline
        </Link>

        <MilestoneDetail
          milestone={milestone}
          age={milestone === birth ? undefined : ageAt(milestone, birth)}
          position={index + 1}
          total={ordered.length}
          previous={previous}
          next={next}
          canContribute={canContribute}
        />
      </main>
    </div>
  );
}
