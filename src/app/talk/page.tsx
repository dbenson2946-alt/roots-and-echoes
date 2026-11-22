import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { listConversations } from "@/lib/store";
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

export default async function TalkPage() {
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const { canTalk, settings } = await getTalkAccess(session);

  const enabled = PERSONA_IDS.filter((id) => !settings.disabledPersonas.includes(id));
  const conversations = canTalk ? await listConversations(seniorId, 12) : [];
  const open = conversations.filter((c) => c.status === "open");
  const finished = conversations.filter((c) => c.status === "finished").slice(0, 5);

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

        {!canTalk ? (
          <p className="tile tile-accent-talk p-6 text-xl text-[var(--color-text-muted)]">
            Let&rsquo;s Talk isn&rsquo;t available right now. It can be switched on by the account owner in Settings, and
            it is used by the account owner or by a helper with &ldquo;can add&rdquo; access sitting beside them.
          </p>
        ) : (
          <>
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
