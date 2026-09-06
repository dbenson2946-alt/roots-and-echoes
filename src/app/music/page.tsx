import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getSongs } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { NewSongForm } from "@/components/NewSongForm";
import { SongRequestBox } from "@/components/SongRequestBox";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";

export default async function MusicPage() {
  const session = await requireActiveSession();
  const songs = await getSongs(session.activeSeniorId!);

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-10">
        <div className="flex items-center gap-4">
          <Medallion icon="music" accent="var(--color-music)" />
          <div>
            <h1 className="text-3xl font-bold">Music</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              Songs, lyrics, and the memories behind them.
            </p>
          </div>
        </div>

        <SongRequestBox />

        <section>
          <h2 className="mb-4 text-2xl font-bold">Your songs</h2>
          {songs.length === 0 ? (
            <p className="tile tile-accent-music p-6 text-xl text-[var(--color-text-muted)]">
              No songs yet — add the first one below.
            </p>
          ) : (
            <ul className="space-y-4">
              {songs.map((song) => (
                <li key={song.id}>
                  <Link href={`/music/${song.id}`} className="tile tile-compact tile-accent-music flex items-center gap-4 hover:bg-[var(--color-music-tint)]">
                    <Medallion icon="music" size="sm" />
                    <span className="flex-1">
                      <span className="block text-xl font-bold">{song.title}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-base text-[var(--color-text-muted)]">
                        <span>{song.artist || "Artist unknown"}</span>
                        {song.audioUrl && (
                          <span className="inline-flex items-center gap-1">
                            · <Icon name="headphones" className="h-4 w-4" /> ready to play
                          </span>
                        )}
                        {song.recordings.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            · <Icon name="mic" className="h-4 w-4" /> {song.recordings.length} recording{song.recordings.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold">Add a song</h2>
          <NewSongForm />
        </section>
      </main>
    </div>
  );
}
