import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getConversation, getConversationMessages, getPhoto } from "@/lib/store";
import { getTalkAccess } from "@/lib/talkAccess";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { ConversationControls } from "@/components/talk/ConversationControls";
import { ScrollToLatest } from "@/components/talk/ScrollToLatest";
import { PERSONAS, PROMPTS_BY_ID } from "@/content/conversationLibrary";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireActiveSession();
  const { canTalk } = await getTalkAccess(session);
  if (!canTalk) redirect("/talk");

  const conversation = await getConversation(id);
  if (!conversation || conversation.seniorId !== session.activeSeniorId) notFound();
  const messages = await getConversationMessages(conversation.id);
  const persona = PERSONAS[conversation.persona];

  // Photos a question refers to (each shown with the question).
  const photoIds = Array.from(new Set(messages.map((m) => m.photoId).filter((p): p is string => Boolean(p))));
  const photos = new Map((await Promise.all(photoIds.map((pid) => getPhoto(pid)))).filter(Boolean).map((p) => [p!.id, p!]));

  const last = messages[messages.length - 1];
  const open = conversation.status === "open";
  const mode: "answer" | "checkpoint" | null =
    open && last?.author === "persona" ? (last.kind === "checkpoint" ? "checkpoint" : "answer") : null;
  const choices = last && last.kind === "prompt" && last.promptId ? PROMPTS_BY_ID.get(last.promptId)?.choices : undefined;

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link href="/talk" className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4">
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to Let&rsquo;s Talk
        </Link>

        <div className="flex items-center gap-4">
          <Medallion icon={persona.icon} accent="var(--color-talk)" />
          <div>
            <h1 className="text-3xl font-bold">{persona.name}</h1>
            <p className="text-base text-[var(--color-text-muted)]">
              A guide written ahead of time: not a real person, and not AI. Nothing here becomes a memory unless you save it.
            </p>
          </div>
        </div>

        <ol className="space-y-5" aria-label="The conversation">
          {messages.map((m) =>
            m.author === "persona" ? (
              <li key={m.id} className="flex items-start gap-3">
                <Medallion icon={persona.icon} size="sm" accent="var(--color-talk)" />
                <div className="tile tile-accent-talk tile-compact max-w-[88%] space-y-3 p-4">
                  <p className="text-sm font-semibold text-[var(--color-text-muted)]">{persona.name}</p>
                  {m.lead && <p className="text-xl">{m.lead}</p>}
                  <p className="text-xl font-semibold">{m.body}</p>
                  {m.photoId && photos.get(m.photoId)?.imageUrl && (
                    <div className="flex h-56 w-full items-center justify-center rounded-xl bg-[var(--color-photo-tint)]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL */}
                      <img
                        src={photos.get(m.photoId)!.imageUrl}
                        alt={photos.get(m.photoId)!.caption || photos.get(m.photoId)!.label}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                  <ReadAloudButton text={[m.lead, m.body].filter(Boolean).join(" ")} />
                </div>
              </li>
            ) : (
              <li key={m.id} className="flex justify-end">
                <div className="max-w-[88%] rounded-2xl bg-[var(--color-primary-tint)] p-4 text-xl">{m.body}</div>
              </li>
            )
          )}
        </ol>
        <ScrollToLatest key={messages.length} />

        {mode ? (
          <section className="tile p-5">
            <ConversationControls conversationId={conversation.id} mode={mode} choices={choices} />
          </section>
        ) : open ? (
          <p className="text-lg text-[var(--color-text-muted)]">
            One moment&hellip; <Link href={`/talk/${conversation.id}`} className="underline">reload</Link> if nothing appears.
          </p>
        ) : (
          <p className="tile tile-accent-talk p-5 text-lg">
            This conversation has finished.{" "}
            {conversation.savedMemoryId ? (
              <Link href={`/story-time/${conversation.savedMemoryId}`} className="font-semibold underline decoration-2 underline-offset-4">
                See the memory it became
              </Link>
            ) : (
              "Nothing from it was saved as a memory."
            )}
          </p>
        )}
      </main>
    </div>
  );
}
