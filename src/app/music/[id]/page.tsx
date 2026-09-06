import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getSong } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { SingingRecorder } from "@/components/SingingRecorder";
import { SongAudioUpload } from "@/components/SongAudioUpload";
import { Icon } from "@/components/Icon";
import { formatDate } from "@/lib/ui";

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireActiveSession();
  const { id } = await params;
  const song = await getSong(id);
  if (!song || song.seniorId !== session.activeSeniorId) notFound();

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link href="/music" className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4">
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to Music
        </Link>

        <div className="tile tile-accent-music space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold">{song.title}</h1>
            <p className="text-xl text-[var(--color-text-muted)] text-accent">{song.artist || "Artist unknown"}</p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-bold flex items-center gap-2">
              <Icon name="play" className="h-5 w-5" style={{ color: "var(--color-music)" }} /> Playback
            </h2>
            {song.audioUrl ? (
              <audio controls src={song.audioUrl} className="w-full">
                Your browser does not support audio playback.
              </audio>
            ) : (
              <div className="space-y-3 rounded-xl bg-[var(--color-music-tint)] p-4">
                <p className="text-base">
                  No audio uploaded for this song yet — add one so you can ask for it by name
                  later and hear it play.
                </p>
                <SongAudioUpload songId={song.id} />
              </div>
            )}
          </div>

          {song.lyrics && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Icon name="pageLines" className="h-5 w-5" style={{ color: "var(--color-music)" }} /> Lyrics
                </h2>
                <ReadAloudButton text={song.lyrics} />
              </div>
              <p className="whitespace-pre-wrap rounded-xl bg-[var(--color-bg)] p-4 text-xl leading-relaxed">{song.lyrics}</p>
            </div>
          )}

          {song.personalNote && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Icon name="thought" className="h-5 w-5" style={{ color: "var(--color-music)" }} /> What this song means
                </h2>
                <ReadAloudButton text={song.personalNote} />
              </div>
              <p className="text-xl leading-relaxed">{song.personalNote}</p>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-xl font-bold flex items-center gap-2">
              <Icon name="mic" className="h-5 w-5" style={{ color: "var(--color-music)" }} /> Sing a part of this song
            </h2>
            <SingingRecorder songId={song.id} />
          </div>

          {song.recordings.length > 0 && (
            <div>
              <h2 className="mb-2 text-xl font-bold">Saved recordings</h2>
              <ul className="space-y-2">
                {song.recordings.map((r) => (
                  <li key={r.id} className="rounded-xl bg-[var(--color-bg)] p-3 text-lg">
                    {r.label} <span className="text-base text-[var(--color-text-muted)]">· {formatDate(r.recordedAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
