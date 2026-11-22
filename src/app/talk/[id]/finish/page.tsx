import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getConversation, getConversationMessages } from "@/lib/store";
import { getTalkAccess } from "@/lib/talkAccess";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { FinishForm } from "@/components/talk/FinishForm";
import { PROMPTS_BY_ID } from "@/content/conversationLibrary";
import { LANE_LABELS, categoryForLane } from "@/lib/conversation";

export default async function FinishConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireActiveSession();
  const { canTalk } = await getTalkAccess(session);
  if (!canTalk) redirect("/talk");

  const conversation = await getConversation(id);
  if (!conversation || conversation.seniorId !== session.activeSeniorId) notFound();
  if (conversation.status !== "open") redirect("/talk");
  const messages = await getConversationMessages(conversation.id);

  // Each answer, kept with the question that came just before it.
  const answers: { id: string; question: string; answer: string }[] = [];
  let question = "";
  for (const m of messages) {
    if (m.author === "persona") question = m.body;
    else answers.push({ id: m.id, question, answer: m.body });
  }

  const firstPromptId = messages.find((m) => m.author === "persona" && m.promptId)?.promptId;
  const lane = (firstPromptId && PROMPTS_BY_ID.get(firstPromptId)?.lane) || "other";

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link
          href={`/talk/${conversation.id}`}
          className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4"
        >
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to the conversation
        </Link>
        <div className="flex items-center gap-4">
          <Medallion icon="check" accent="var(--color-talk)" />
          <div>
            <h1 className="text-3xl font-bold">Finish</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              Keep the best parts as a memory, or just finish.
            </p>
          </div>
        </div>
        <FinishForm
          conversationId={conversation.id}
          answers={answers}
          defaultTitle={`A chat about ${LANE_LABELS[lane].toLowerCase()}`}
          defaultCategory={categoryForLane(lane)}
        />
      </main>
    </div>
  );
}
