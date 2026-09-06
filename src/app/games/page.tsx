import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";

export default async function GamesPage() {
  const session = await requireActiveSession();

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-10">
        <div className="flex items-center gap-4">
          <Medallion icon="puzzlePieces" accent="var(--color-games)" />
          <div>
            <h1 className="text-3xl font-bold">Games</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              Playful little games built from your own photos and songs. No scores, no wrong
              answers — just a fun way to spend a few minutes.
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/games/jigsaw" className="tile mode-tile tile-accent-games">
            <Medallion icon="puzzlePieces" />
            <span className="text-2xl font-bold">Photo Jigsaw</span>
            <span className="text-lg text-[var(--color-text-muted)]">
              Tap pieces to put one of your photos back together.
            </span>
          </Link>

          <Link href="/games/photo-quiz" className="tile mode-tile tile-accent-games">
            <Medallion icon="photo" />
            <span className="text-2xl font-bold">Who&rsquo;s in the Photo?</span>
            <span className="text-lg text-[var(--color-text-muted)]">
              A gentle guessing game about the people in your photos.
            </span>
          </Link>

          <Link href="/games/song-quiz" className="tile mode-tile tile-accent-games">
            <Medallion icon="music" />
            <span className="text-2xl font-bold">Name That Song</span>
            <span className="text-lg text-[var(--color-text-muted)]">
              Hear a few lyrics and guess which song they&rsquo;re from.
            </span>
          </Link>

          <Link href="/games/art-quiz" className="tile mode-tile tile-accent-games">
            <Medallion icon="art" />
            <span className="text-2xl font-bold">Guess the Artwork</span>
            <span className="text-lg text-[var(--color-text-muted)]">
              A gentle guessing game about the art you&rsquo;ve saved.
            </span>
          </Link>
        </div>

        <p className="text-lg text-[var(--color-text-muted)]">
          More games will appear here as you add more photos, people, and songs.
        </p>
      </main>
    </div>
  );
}
