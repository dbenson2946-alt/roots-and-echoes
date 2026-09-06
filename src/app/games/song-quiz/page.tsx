import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getSongs } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { SongQuiz, type SongQuizRound } from "@/components/games/SongQuiz";
import { Icon } from "@/components/Icon";
import { Medallion } from "@/components/Medallion";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function firstLine(lyrics: string): string {
  const line = lyrics.split("\n").map((l) => l.trim()).find(Boolean);
  return line || lyrics.trim();
}

export default async function SongQuizPage() {
  const session = await requireActiveSession();
  const songs = (await getSongs(session.activeSeniorId!)).filter((s) => s.lyrics.trim().length > 0);

  const rounds: SongQuizRound[] = [];
  for (const song of songs) {
    const otherTitles = shuffle(songs.filter((s) => s.id !== song.id).map((s) => s.title));
    if (otherTitles.length === 0) continue;
    const distractors = otherTitles.slice(0, Math.min(3, otherTitles.length));
    rounds.push({
      snippet: firstLine(song.lyrics),
      correctTitle: song.title,
      choices: shuffle([song.title, ...distractors]),
    });
  }

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link href="/games" className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4">
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to Games
        </Link>
        <div className="flex items-center gap-4">
          <Medallion icon="music" accent="var(--color-games)" size="sm" />
          <h1 className="text-3xl font-bold">Name That Song</h1>
        </div>

        {rounds.length === 0 ? (
          <p className="tile tile-accent-games p-6 text-xl text-[var(--color-text-muted)]">
            This game needs at least two songs with lyrics saved. Add another song with lyrics
            on the Music page, then come back here.
          </p>
        ) : (
          <SongQuiz rounds={shuffle(rounds)} />
        )}
      </main>
    </div>
  );
}
