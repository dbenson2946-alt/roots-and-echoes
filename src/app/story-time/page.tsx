import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getMemories, getNextPrompt, getGrant, getLifeStoryRecordings } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { NewMemoryForm } from "@/components/NewMemoryForm";
import { NewLifeStoryRecordingForm } from "@/components/NewLifeStoryRecordingForm";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { DownloadLifeStoryButton } from "@/components/DownloadLifeStoryButton";
import { CATEGORY_META, formatDate } from "@/lib/ui";
import type { MemoryCategory } from "@/lib/types";

export default async function StoryTimePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const session = await requireActiveSession();
  const { topic } = await searchParams;
  const category = (Object.keys(CATEGORY_META) as MemoryCategory[]).includes(topic as MemoryCategory)
    ? (topic as MemoryCategory)
    : undefined;
  const [memories, prompt, grant, lifeStoryRecordings] = await Promise.all([
    getMemories(session.activeSeniorId!),
    getNextPrompt(session.activeSeniorId!, category),
    session.isSelf ? Promise.resolve(undefined) : getGrant(session.profile.id, session.activeSeniorId!),
    getLifeStoryRecordings(session.activeSeniorId!),
  ]);
  // Exporting the life-story PDF (§17) requires the same "contribute"
  // permission as every other write in the app — the button itself is
  // hidden from a view-only caregiver, and requireContributor() inside the
  // export's server action enforces this again either way.
  const canExportLifeStory = session.isSelf || grant?.permission === "contribute";
  // Same gate, reused for adding a Life Story Recording — a view-only
  // caregiver can read the list below but not add to it.
  const canContribute = session.isSelf || grant?.permission === "contribute";

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-10">
        <div className="flex items-center gap-4">
          <Medallion icon="story" accent="var(--color-story)" />
          <div>
            <h1 className="text-3xl font-bold">Story Time</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              Your life, one memory at a time.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-lg font-semibold text-[var(--color-text-muted)]">
            Ask about a topic, or let it surprise you:
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/story-time"
              className="rounded-full border-2 px-4 py-2 text-lg font-semibold"
              style={
                !category
                  ? { background: "var(--color-primary)", borderColor: "var(--color-primary)", color: "#fff" }
                  : { borderColor: "var(--color-border)" }
              }
            >
              <Icon name="sparkle" className="mr-1 inline h-4 w-4" /> Surprise me
            </Link>
            {(Object.keys(CATEGORY_META) as MemoryCategory[]).map((key) => (
              <Link
                key={key}
                href={`/story-time?topic=${key}`}
                className="rounded-full border-2 px-4 py-2 text-lg font-semibold"
                style={
                  category === key
                    ? { background: "var(--color-primary)", borderColor: "var(--color-primary)", color: "#fff" }
                    : { borderColor: "var(--color-border)" }
                }
              >
                <Icon name={CATEGORY_META[key].icon} className="mr-1 inline h-4 w-4" /> {CATEGORY_META[key].label}
              </Link>
            ))}
          </div>
        </div>

        <NewMemoryForm key={`${category ?? "surprise"}-${prompt}`} prompt={prompt} defaultCategory={category} />

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Your timeline</h2>
            {canExportLifeStory && <DownloadLifeStoryButton />}
          </div>
          {memories.length === 0 ? (
            <p className="tile tile-accent-story p-6 text-xl text-[var(--color-text-muted)]">
              Nothing here yet — your first saved memory will show up on this timeline.
            </p>
          ) : (
            <ol className="space-y-4">
              {memories.map((m) => {
                const meta = CATEGORY_META[m.category];
                return (
                  <li key={m.id}>
                    <Link
                      href={`/story-time/${m.id}`}
                      className="tile tile-compact tile-accent-story flex items-start gap-4 hover:bg-[var(--color-story-tint)]"
                    >
                      <Medallion icon={meta.icon} size="sm" />
                      <span className="flex-1">
                        <span className="block text-xl font-bold">{m.title}</span>
                        <span className="block text-base text-[var(--color-text-muted)]">
                          {m.memoryDate ? `${m.memoryDate} · ` : ""}
                          {meta.label}
                          {m.recordings.length > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              {" · "}
                              <Icon name="headphones" className="h-4 w-4" /> has audio
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-lg text-accent">
                          {m.transcript.slice(0, 120)}
                          {m.transcript.length > 120 ? "…" : ""}
                        </span>
                        <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
                          Added by {m.enteredBy.name} on {formatDate(m.recordedAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="space-y-4 border-t-2 border-[var(--color-border)] pt-10">
          <div className="flex items-center gap-4">
            <Medallion icon="mic" size="sm" />
            <div>
              <h2 className="text-2xl font-bold">Life Story Recordings</h2>
              <p className="text-lg text-[var(--color-text-muted)]">
                A second way to capture your story — a title, a short written summary, and the recording itself.
              </p>
            </div>
          </div>

          {canContribute && <NewLifeStoryRecordingForm />}

          {lifeStoryRecordings.length === 0 ? (
            <p className="tile tile-accent-story p-6 text-xl text-[var(--color-text-muted)]">
              Nothing saved here yet — your first life story recording will show up on this list.
            </p>
          ) : (
            <ul className="space-y-4">
              {lifeStoryRecordings.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/story-time/life-story/${r.id}`}
                    className="tile tile-compact tile-accent-story flex items-start gap-4 hover:bg-[var(--color-story-tint)]"
                  >
                    <Medallion icon="mic" size="sm" />
                    <span className="flex-1">
                      <span className="block text-xl font-bold">{r.title}</span>
                      <span className="block text-base text-[var(--color-text-muted)]">
                        {r.clips.length > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Icon name="headphones" className="h-4 w-4" /> {r.clips.length} recording{r.clips.length === 1 ? "" : "s"}
                          </span>
                        ) : (
                          "No audio yet"
                        )}
                      </span>
                      <span className="mt-1 block text-lg text-accent">
                        {r.summary.slice(0, 160)}
                        {r.summary.length > 160 ? "…" : ""}
                      </span>
                      <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
                        Added by {r.enteredBy.name} on {formatDate(r.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
