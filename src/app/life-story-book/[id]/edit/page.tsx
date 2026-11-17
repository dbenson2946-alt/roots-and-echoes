import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getMilestone, getGrant, getPhotos } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { MilestoneForm, type MilestoneFormPhoto } from "@/components/lifeStoryBook/MilestoneForm";
import { MILESTONE_KIND_META } from "@/lib/lifeStoryBook";

/** "Edit this milestone" — the same form as adding one, filled in. */
export default async function EditMilestonePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const { id } = await params;

  const milestone = await getMilestone(id);
  if (!milestone || milestone.seniorId !== seniorId) redirect("/life-story-book");

  const grant = session.isSelf ? undefined : await getGrant(session.profile.id, seniorId);
  const canContribute = session.isSelf || grant?.permission === "contribute";
  // A view-only caregiver has nothing to do here — show them the milestone.
  if (!canContribute) redirect(`/life-story-book/${id}`);

  const photos: MilestoneFormPhoto[] = (await getPhotos(seniorId))
    .filter((p) => p.imageUrl)
    .map((p) => ({ id: p.id, label: p.label, imageUrl: p.imageUrl! }))
    .reverse();
  const currentPhoto = milestone.photo
    ? { id: milestone.photo.id, label: milestone.photo.label, imageUrl: milestone.photo.imageUrl }
    : undefined;

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link
          href={`/life-story-book/${id}`}
          className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4"
        >
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to this milestone
        </Link>

        <div className="flex items-center gap-4">
          <Medallion icon={MILESTONE_KIND_META[milestone.kind].icon} accent="var(--color-life)" />
          <h1 className="text-3xl font-bold">Edit this milestone</h1>
        </div>

        <div className="tile tile-accent-life p-6">
          <MilestoneForm
            mode="edit"
            milestoneId={milestone.id}
            initial={{
              kind: milestone.kind,
              title: milestone.title,
              description: milestone.description,
              year: String(milestone.year),
              month: milestone.month ? String(milestone.month) : "",
              day: milestone.day ? String(milestone.day) : "",
            }}
            currentPhoto={currentPhoto}
            photos={photos}
          />
        </div>
      </main>
    </div>
  );
}
