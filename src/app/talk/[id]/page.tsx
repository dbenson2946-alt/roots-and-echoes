import { HELP_LINE_SHORT } from "@/lib/careLine";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getConversation, getConversationMessages, getPhoto } from "@/lib/store";
import { getTalkAccess } from "@/lib/talkAccess";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { DeleteConversation } from "@/components/talk/DeleteConversation";
import { ConversationControls } from "@/components/talk/ConversationControls";
import { ScrollToLatest } from "@/components/talk/ScrollToLatest";
import { PERSONAS, PROMPTS_BY_ID } from "@/content/conversationLibrary";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const session = await requireActiveSession();
  const { canTalk, settings } = await getTalkAccess(session);

  const conversation = await getConversation(id);
  if (!conversation || conversation.seniorId !== session.activeSeniorId) notFound();
  // The senior, or the helper who started it, can carry on and finish it. Any
  // other helper can read it only if the account owner has allowed that.
  const mayRun = canTalk && (session.isSelf || conversation.startedBy === session.profile.id);
  if (!mayRun && !settings.helpersReadFull) redirect("/activity");
  const messages = await getConversationMessages(conversation.id);
  const persona = PERSONAS[conversation.persona];

  // Photos a question refers to (each shown with the question).
  const photoIds = Array.from(new Set(messages.map((m) => m.photoId).filter((p): p is string => Boolean(p))));
  const photos = new Map((await Promise.all(photoIds.map((pid) => getPhoto(pid)))).filter(Boolean).map((p) => [p!.id, p!]));

  const last = messages[messages.length - 1];
  const open = conversation.status === "open";
  // "stuck": the last line is the person's own answer, so the guide's reply never
  // arrived. The page offers a "Continue" button instead of leaving them stranded.
  const mode: "answer" | "checkpoint" | "stuck" | null =
    mayRun && open && last?.author === "persona"
      ? last.kind === "checkpoint"
        ? "checkpoint"
        : "answer"
      : mayRun && open && last?.author === "senior"
        ? "stuck"
        : null;
  const choices = last && last.kind === "prompt" && last.promptId ? PROMPTS_BY_ID.get(last.promptId)?.choices : undefined;

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link
          href={mayRun || from === "talk" ? "/talk" : "/activity"}
          className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4"
        >
          <Icon name="arrowLeft" className="h-5 w-5" /> {mayRun || from === "talk" ? "Back to Let\u2019s Talk" : "Back to Activity"}
        </Link>

        <div className="flex items-center gap-4">
          <Medallion icon={persona.icon} accent="var(--color-talk)" />
          <div>
            <h1 className="text-3xl font-bold">{persona.name}</h1>
            <p className="text-base text-[var(--color-text-muted)]">
              A guide written ahead of time: not a real person, and not AI. Nothing here becomes a memory unless you save it.
            </p>
            <p className="text-base text-[var(--color-text-muted)]">{HELP_LINE_SHORT}</p>
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
            <ConversationControls conversationId={conversation.id} mode={mode} choices={choices} lastMessageId={last?.id} />
          </section>
        ) : !mayRun ? (
          <p className="tile p-5 text-lg text-[var(--color-text-muted)]">
            You can read this because the account owner allows helpers to read Let&rsquo;s Talk conversations.
            {open ? " It is still in progress." : ""}
          </p>
        ) : open ? (
          <p className="text-lg text-[var(--color-text-muted)]">
            One moment&hellip; <Link href={`/talk/${conversation.id}`} className="underline">reload</Link> if nothing appears.
          </p>
        ) : (
          <div className="tile tile-accent-talk space-y-4 p-5">
            <p className="text-lg">
              This conversation has finished.{" "}
              {conversation.savedMemoryId ? (
                <Link href={`/story-time/${conversation.savedMemoryId}`} className="font-semibold underline decoration-2 underline-offset-4">
                  See the memory it became
                </Link>
              ) : (
                "Nothing from it has been saved as a memory."
              )}
            </p>
            {mayRun && !conversation.savedMemoryId && messages.some((m) => m.author === "senior") && (
              <Link href={`/talk/${conversation.id}/finish`} className="btn-lg btn-primary inline-flex">
                Save as a memory
              </Link>
            )}
          </div>
        )}

        {mayRun && <DeleteConversation conversationId={conversation.id} savedAsMemory={Boolean(conversation.savedMemoryId)} />}
      </main>
    </div>
  );
}
