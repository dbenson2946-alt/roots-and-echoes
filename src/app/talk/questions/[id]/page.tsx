import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getFamilyQuestion, getPhoto, getProfile, markQuestionSeen } from "@/lib/store";
import { getTalkAccess } from "@/lib/talkAccess";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { FamilyAnswerForm } from "@/components/talk/FamilyAnswerForm";
import { FamilySaveMemoryForm } from "@/components/talk/FamilySaveMemoryForm";
import { DeleteQuestion } from "@/components/talk/DeleteQuestion";

function when(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export default async function FamilyQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireActiveSession();
  const { canTalk } = await getTalkAccess(session);
  if (!canTalk) redirect("/talk");

  const seniorId = session.activeSeniorId!;
  const question = await getFamilyQuestion(id);
  if (!question || question.seniorId !== seniorId) notFound();

  const isAsker = question.askedBy === session.profile.id;
  const [senior, photo] = await Promise.all([getProfile(seniorId), question.photoId ? getPhoto(question.photoId) : undefined]);
  const seniorFirst = (senior?.name ?? "them").split(" ")[0];
  const askerFirst = question.askerName.split(" ")[0];

  // The person who asked opening an answer is what clears their Home note.
  if (isAsker && question.status === "answered" && !question.seenByAsker) await markQuestionSeen(question.id);

  const canAnswer = question.status === "waiting" && !isAsker;
  const canSave = question.status === "answered" && session.isSelf && !question.savedMemoryId;

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
            <h1 className="text-3xl font-bold">{isAsker ? `Your question for ${seniorFirst}` : `A question from ${askerFirst}`}</h1>
            <p className="text-base text-[var(--color-text-muted)]">Sent {when(question.createdAt)}</p>
          </div>
        </div>

        <section className="tile tile-accent-talk space-y-3 p-5">
          <p className="text-2xl font-semibold">{question.body}</p>
          {photo?.imageUrl && (
            <div className="flex h-64 w-full items-center justify-center rounded-xl bg-[var(--color-photo-tint)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL */}
              <img src={photo.imageUrl} alt={photo.caption || photo.label} className="h-full w-full object-contain" />
            </div>
          )}
          <ReadAloudButton text={question.body} />
        </section>

        {canAnswer && <FamilyAnswerForm questionId={question.id} />}

        {question.status === "waiting" && isAsker && (
          <section className="space-y-4">
            <p className="tile p-5 text-xl text-[var(--color-text-muted)]">
              {seniorFirst} hasn&rsquo;t answered yet. You&rsquo;ll see a note on your Home page when they do.
            </p>
            <DeleteQuestion questionId={question.id} label="Take this question back" />
          </section>
        )}

        {question.status === "answered" && question.answer && (
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">{isAsker ? `${seniorFirst}'s answer` : "Your answer"}</h2>
            <div className="tile space-y-3 p-5">
              <p className="whitespace-pre-wrap text-xl">{question.answer}</p>
              {question.answeredAt && (
                <p className="text-base text-[var(--color-text-muted)]">Answered {when(question.answeredAt)}</p>
              )}
              <ReadAloudButton text={question.answer} />
            </div>
          </section>
        )}

        {question.status === "skipped" && (
          <p className="tile p-5 text-xl text-[var(--color-text-muted)]">This question was set aside.</p>
        )}

        {canSave && (
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">Keep it as a memory?</h2>
            <p className="text-lg text-[var(--color-text-muted)]">
              This answer is only shared with {askerFirst}. If you like, it can also be saved in Story Time, where the
              whole family helping with your story can read it.
            </p>
            <FamilySaveMemoryForm questionId={question.id} defaultTitle={question.body.length > 60 ? `${question.body.slice(0, 57)}...` : question.body} />
          </section>
        )}
        {question.status === "answered" && question.savedMemoryId && session.isSelf && (
          <Link href={`/story-time/${question.savedMemoryId}`} className="text-lg font-semibold underline decoration-2 underline-offset-4">
            See the memory it became
          </Link>
        )}

        {(isAsker || session.isSelf) && question.status !== "waiting" && (
          <DeleteQuestion questionId={question.id} label="Delete this question" />
        )}
      </main>
    </div>
  );
}
