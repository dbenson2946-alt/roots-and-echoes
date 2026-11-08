import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getLifeStoryRecording, getGrant } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { AddLifeStoryRecordingClipForm } from "@/components/AddLifeStoryRecordingClipForm";
import { EditLifeStoryRecordingForm } from "@/components/EditLifeStoryRecordingForm";
import { Icon } from "@/components/Icon";
import { formatDate } from "@/lib/ui";

export default async function LifeStoryRecordingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireActiveSession();
  const { id } = await params;
  const recording = await getLifeStoryRecording(id);
  if (!recording || recording.seniorId !== session.activeSeniorId) notFound();

  // Same "contribute" permission gate every other write in the app uses
  // (§4a) — a view-only caregiver can read this page but can't edit it or
  // add another part.
  const grant = session.isSelf ? undefined : await getGrant(session.profile.id, session.activeSeniorId!);
  const canContribute = session.isSelf || grant?.permission === "contribute";

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link href="/story-time" className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4">
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to Story Time
        </Link>

        <div className="tile tile-accent-story p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-lg text-[var(--color-text-muted)]">
            <Icon name="mic" className="h-7 w-7" style={{ color: "var(--color-story)" }} />
            <span>Life Story Recording</span>
          </div>

          <h1 className="text-3xl font-bold">{recording.title}</h1>

          <div className="flex flex-wrap gap-3">
            <ReadAloudButton text={recording.summary} />
          </div>

          <p className="whitespace-pre-wrap text-xl leading-relaxed">{recording.summary}</p>

          <p className="text-base text-[var(--color-text-muted)]">
            Added by {recording.enteredBy.name} · {formatDate(recording.createdAt)}
          </p>

          {canContribute && (
            <EditLifeStoryRecordingForm
              recordingId={recording.id}
              title={recording.title}
              summary={recording.summary}
            />
          )}

          <div>
            <h2 className="mb-2 text-xl font-bold flex items-center gap-2">
              <Icon name="headphones" className="h-5 w-5" style={{ color: "var(--color-story)" }} /> Recordings
            </h2>
            {recording.clips.length === 0 ? (
              <p className="text-lg text-[var(--color-text-muted)]">No audio saved yet.</p>
            ) : (
              <ul className="space-y-3">
                {recording.clips.map((c) => (
                  <li key={c.id} className="rounded-xl bg-[var(--color-story-tint)] p-3">
                    <p className="mb-1 text-lg">
                      {c.label} <span className="text-base text-[var(--color-text-muted)]">· {formatDate(c.recordedAt)}</span>
                    </p>
                    {c.audioUrl ? (
                      <audio controls src={c.audioUrl} className="w-full">
                        Your browser does not support audio playback.
                      </audio>
                    ) : (
                      <p className="text-base text-[var(--color-text-muted)]">Audio unavailable.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canContribute && (
            <div>
              <h2 className="mb-2 text-xl font-bold flex items-center gap-2">
                <Icon name="mic" className="h-5 w-5" style={{ color: "var(--color-story)" }} /> Add another part
              </h2>
              <AddLifeStoryRecordingClipForm recordingId={recording.id} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
