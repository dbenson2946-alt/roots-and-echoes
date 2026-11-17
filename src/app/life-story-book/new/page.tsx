import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getGrant, getPhotos } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { MilestoneForm, type MilestoneFormPhoto } from "@/components/lifeStoryBook/MilestoneForm";
import { MILESTONE_KIND_META, isMilestoneKind } from "@/lib/lifeStoryBook";

/** "Add a milestone". Reached from the timeline's button or from one of
 * its starter chips, which pass the kind along (?kind=born) so the form
 * opens with it already chosen. */
export default async function NewMilestonePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const { kind: kindParam } = await searchParams;
  const kind = isMilestoneKind(kindParam) ? kindParam : "other";

  const grant = session.isSelf ? undefined : await getGrant(session.profile.id, seniorId);
  const canContribute = session.isSelf || grant?.permission === "contribute";

  const photos: MilestoneFormPhoto[] = canContribute
    ? (await getPhotos(seniorId))
        .filter((p) => p.imageUrl)
        .map((p) => ({ id: p.id, label: p.label, imageUrl: p.imageUrl! }))
        .reverse()
    : [];

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link
          href="/life-story-book"
          className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4"
        >
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to the Life Story Book
        </Link>

        <div className="flex items-center gap-4">
          <Medallion icon={MILESTONE_KIND_META[kind].icon} accent="var(--color-life)" />
          <h1 className="text-3xl font-bold">Add a milestone</h1>
        </div>

        {canContribute ? (
          <div className="tile tile-accent-life p-6">
            <MilestoneForm
              mode="new"
              initial={{
                kind,
                title: MILESTONE_KIND_META[kind].starterTitle,
                description: "",
                year: "",
                month: "",
                day: "",
              }}
              photos={photos}
            />
          </div>
        ) : (
          <p className="tile tile-accent-life p-6 text-xl text-[var(--color-text-muted)]">
            This account can look through the Life Story Book but can&rsquo;t add to it.
          </p>
        )}
      </main>
    </div>
  );
}
