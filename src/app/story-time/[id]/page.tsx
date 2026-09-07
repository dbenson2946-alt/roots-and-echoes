import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getMemory, getPerson, getPhoto } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { Icon } from "@/components/Icon";
import { CATEGORY_META, formatDate } from "@/lib/ui";

export default async function MemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireActiveSession();
  const { id } = await params;
  const memory = await getMemory(id);
  if (!memory || memory.seniorId !== session.activeSeniorId) notFound();

  const meta = CATEGORY_META[memory.category];
  const people = (await Promise.all(memory.linkedPersonIds.map(getPerson))).filter(Boolean);
  const photos = (await Promise.all(memory.linkedPhotoIds.map(getPhoto))).filter(Boolean);

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link href="/story-time" className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4">
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to your timeline
        </Link>

        <div className="tile tile-accent-story p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-lg text-[var(--color-text-muted)]">
            <Icon name={meta.icon} className="h-7 w-7" style={{ color: "var(--color-story)" }} />
            <span>{meta.label}</span>
            {memory.memoryDate && <span>· {memory.memoryDate}</span>}
          </div>

          <h1 className="text-3xl font-bold">{memory.title}</h1>

          {memory.prompt && (
            <p className="text-lg italic text-[var(--color-text-muted)]">
              In answer to: &ldquo;{memory.prompt}&rdquo;
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <ReadAloudButton text={memory.transcript} />
          </div>

          <p className="whitespace-pre-wrap text-xl leading-relaxed">{memory.transcript}</p>

          {memory.hasAudio && (
            <p className="flex items-start gap-2 rounded-xl bg-[var(--color-story-tint)] p-4 text-base">
              <Icon name="headphones" className="h-5 w-5 mt-0.5 shrink-0" />
              A voice recording was made for this memory. Once cloud storage is connected
              (see the deployment README), it will be available to play back here on any device.
            </p>
          )}

          <p className="text-base text-[var(--color-text-muted)]">
            Added by {memory.enteredBy.name} · {formatDate(memory.recordedAt)}
          </p>

          {people.length > 0 && (
            <div>
              <h2 className="mb-2 text-xl font-bold">People in this memory</h2>
              <div className="flex flex-wrap gap-3">
                {people.map((p) => (
                  <span key={p!.id} className="rounded-full bg-[var(--color-photo-tint)] px-4 py-2 text-lg font-semibold">
                    {p!.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {photos.length > 0 && (
            <div>
              <h2 className="mb-2 text-xl font-bold">Photos linked to this memory</h2>
              <div className="flex flex-wrap gap-3">
                {photos.map((ph) =>
                  ph!.imageUrl ? (
                    <Link key={ph!.id} href="/photos" className="block h-24 w-24 overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset Next's optimizer can cache */}
                      <img src={ph!.imageUrl} alt={ph!.label} className="h-full w-full object-cover" />
                    </Link>
                  ) : (
                    <Link
                      key={ph!.id}
                      href="/photos"
                      className="flex h-24 w-24 items-center justify-center rounded-xl text-center text-sm font-semibold"
                      style={{ background: ph!.colorSwatch }}
                    >
                      {ph!.label}
                    </Link>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
