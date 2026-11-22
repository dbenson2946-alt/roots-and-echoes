import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getPhotoPage, getProfile } from "@/lib/store";
import { getTalkAccess } from "@/lib/talkAccess";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { AskQuestionForm } from "@/components/talk/AskQuestionForm";

export default async function AskQuestionPage() {
  const session = await requireActiveSession();
  const { canAsk } = await getTalkAccess(session);
  if (!canAsk) redirect("/talk");

  const seniorId = session.activeSeniorId!;
  const [senior, photoPage] = await Promise.all([getProfile(seniorId), getPhotoPage(seniorId, 24)]);
  const firstName = (senior?.name ?? "them").split(" ")[0];
  const photos = photoPage.photos
    .filter((p) => p.imageUrl)
    .map((p) => ({ id: p.id, label: p.caption || p.label, imageUrl: p.imageUrl! }));

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link href="/talk" className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4">
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to Let&rsquo;s Talk
        </Link>
        <div className="flex items-center gap-4">
          <Medallion icon="thought" accent="var(--color-talk)" />
          <div>
            <h1 className="text-3xl font-bold">Ask {firstName} a question</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              {firstName} will find it under &ldquo;Questions from family&rdquo; and can answer whenever they like.
            </p>
          </div>
        </div>
        <AskQuestionForm seniorFirstName={firstName} photos={photos} />
        <p className="text-base text-[var(--color-text-muted)]">
          Only you and {firstName} can read the answer. You will see a note on your Home page when it arrives. Nothing is
          sent by email or text.
        </p>
      </main>
    </div>
  );
}
