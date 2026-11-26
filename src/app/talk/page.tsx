import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { listConversations, listQuestionsAskedBy, listWaitingQuestions, getProfile } from "@/lib/store";
import { getTalkAccess } from "@/lib/talkAccess";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { TalkStarter } from "@/components/talk/TalkStarter";
import { PERSONAS } from "@/content/conversationLibrary";
import { PERSONA_IDS } from "@/lib/conversation";

function when(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export default async function TalkPage({ searchParams }: { searchParams: Promise<{ sent?: string; all?: string }> }) {
  const { sent, all } = await searchParams;
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const { canTalk, canAsk, settings } = await getTalkAccess(session);
  // A helper who can't take part (view-only, or Let's Talk switched off) can
  // still read past conversations when the account owner allows it.
  const canRead = !canTalk && !session.isSelf && settings.helpersReadFull;

  const enabled = PERSONA_IDS.filter((id) => !settings.disabledPersonas.includes(id));
  // Every helper with access can see that a conversation happened (the recap on
  // the Activity page), but here only the ones you can run: the senior's own
  // sign-in sees all of them; a helper sees the ones they started.
  const conversations = canTalk
    ? (await listConversations(seniorId, 200)).filter((c) => session.isSelf || c.startedBy === session.profile.id)
    : [];
  const open = conversations.filter((c) => c.status === "open");
  const allFinished = conversations.filter((c) => c.status === "finished");
  // Only the newest few are listed at first, so older ones can still be reached
  // (to read or delete) with "Show all conversations".
  const finished = all ? allFinished : allFinished.slice(0, 5);
  const readable = canRead ? await listConversations(seniorId, 30) : [];

  // Family Questions: waiting ones for the senior (a question you sent yourself
  // is listed under "Questions you've sent" instead), and the helper's own.
  const [waitingAll, sentByMe, senior] = canTalk
    ? await Promise.all([
        listWaitingQuestions(seniorId),
        canAsk ? listQuestionsAskedBy(session.profile.id, seniorId, 8) : Promise.resolve([]),
        getProfile(seniorId),
      ])
    : [[], [], undefined];
  const waiting = waitingAll.filter((q) => q.askedBy !== session.profile.id);
  const seniorFirst = (senior?.name ?? "them").split(" ")[0];
  const statusLabel = { waiting: "Waiting for an answer", answered: "Answered", skipped: "Set aside" } as const;

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-8">
        <div className="flex items-center gap-4">
          <Medallion icon="thought" accent="var(--color-talk)" />
          <div>
            <h1 className="text-3xl font-bold">Let&rsquo;s Talk</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              A friendly conversation, at your own pace.
            </p>
          </div>
        </div>

        {canRead ? (
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">Past conversations</h2>
            <p className="text-lg text-[var(--color-text-muted)]">
              You can read these, but not take part. The account owner has allowed helpers to read conversations in
              full.
            </p>
            {readable.length === 0 ? (
              <p className="tile tile-accent-talk p-6 text-xl text-[var(--color-text-muted)]">
                No conversations yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {readable.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/talk/${c.id}?from=talk`}
                      className="tile tile-compact flex flex-wrap items-center justify-between gap-3 p-4 text-lg"
                    >
                      <span>
                        <span className="font-bold">{PERSONAS[c.persona].name}</span>{" "}
                        <span className="text-[var(--color-text-muted)]">
                          · {when(c.startedAt)} · {c.status === "open" ? "Not finished" : "Finished"}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-[var(--color-primary)]">
                        Read <Icon name="arrowRight" className="h-5 w-5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : !canTalk ? (
          <p className="tile tile-accent-talk p-6 text-xl text-[var(--color-text-muted)]">
            Let&rsquo;s Talk isn&rsquo;t available right now. It can be switched on by the account owner in Settings, and
            it is used by the account owner or by a helper with &ldquo;can add&rdquo; access sitting beside them.
          </p>
        ) : (
          <>
            {sent && (
              <p role="status" className="tile tile-accent-talk p-5 text-xl font-semibold">
                Your question is on its way to {seniorFirst}.
              </p>
            )}

            {waiting.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-2xl font-bold">Questions from family</h2>
                {waiting.map((q) => (
                  <Link key={q.id} href={`/talk/questions/${q.id}`} className="tile tile-accent-talk flex items-center justify-between gap-4 p-5">
                    <span className="text-lg">
                      <span className="font-bold">{q.askerName.split(" ")[0]} asks:</span>{" "}
                      <span>{q.body.length > 90 ? `${q.body.slice(0, 87)}...` : q.body}</span>
                      {q.photoId && <span className="text-[var(--color-text-muted)]"> · with a photo</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-lg font-bold text-[var(--color-primary)]">
                      Answer <Icon name="arrowRight" className="h-5 w-5" />
                    </span>
                  </Link>
                ))}
              </section>
            )}

            {open.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-2xl font-bold">Pick up where you left off</h2>
                {open.map((c) => (
                  <Link key={c.id} href={`/talk/${c.id}`} className="tile tile-accent-talk flex items-center justify-between gap-4 p-5">
                    <span className="text-lg">
                      <span className="font-bold">{PERSONAS[c.persona].name}</span>{" "}
                      <span className="text-[var(--color-text-muted)]">· started {when(c.startedAt)}</span>
                    </span>
                    <span className="flex items-center gap-1 text-lg font-bold text-[var(--color-primary)]">
                      Continue <Icon name="arrowRight" className="h-5 w-5" />
                    </span>
                  </Link>
                ))}
              </section>
            )}

            {enabled.length === 0 ? (
              <p className="tile tile-accent-talk p-6 text-xl text-[var(--color-text-muted)]">
                All the guides are turned off. The account owner can turn them on in Settings.
              </p>
            ) : (
              <TalkStarter
                personas={enabled.map((id) => ({
                  id,
                  name: PERSONAS[id].name,
                  tagline: PERSONAS[id].tagline,
                  icon: PERSONAS[id].icon,
                }))}
              />
            )}

            {finished.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-2xl font-bold">Recent conversations</h2>
                <ul className="space-y-2">
                  {finished.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/talk/${c.id}`}
                        className="tile tile-compact flex flex-wrap items-center justify-between gap-3 p-4 text-lg"
                      >
                        <span>
                          <span className="font-bold">{PERSONAS[c.persona].name}</span>{" "}
                          <span className="text-[var(--color-text-muted)]">· {when(c.startedAt)}</span>
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-[var(--color-primary)]">
                          {c.savedMemoryId ? "Saved as a memory" : "Not saved"}
                          <Icon name="arrowRight" className="h-5 w-5" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {allFinished.length > finished.length && (
                  <Link href="/talk?all=1" className="btn-lg btn-secondary inline-flex">
                    Show all {allFinished.length} conversations
                  </Link>
                )}
              </section>
            )}

            {canAsk && (
              <section className="space-y-3">
                <h2 className="text-2xl font-bold">Ask {seniorFirst} a question</h2>
                <Link href="/talk/ask" className="btn-lg btn-primary inline-flex">
                  <Icon name="plus" className="h-5 w-5" /> Write a question
                </Link>
                {sentByMe.length > 0 && (
                  <ul className="space-y-2 pt-2">
                    {sentByMe.map((q) => (
                      <li key={q.id}>
                        <Link
                          href={`/talk/questions/${q.id}`}
                          className="tile tile-compact flex flex-wrap items-center justify-between gap-3 p-4 text-lg"
                        >
                          <span>{q.body.length > 70 ? `${q.body.slice(0, 67)}...` : q.body}</span>
                          <span className="flex items-center gap-1 font-semibold text-[var(--color-primary)]">
                            {statusLabel[q.status]} <Icon name="arrowRight" className="h-5 w-5" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <p className="text-base text-[var(--color-text-muted)]">
              The guides are written ahead of time. They are not real people and not AI, and nothing you say becomes a
              memory unless you choose to save it.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
