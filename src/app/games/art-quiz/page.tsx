import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getArtPieces } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { ArtQuiz, type ArtQuizRound } from "@/components/games/ArtQuiz";
import { Icon } from "@/components/Icon";
import { Medallion } from "@/components/Medallion";
import { swatchToHex } from "@/lib/ui";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default async function ArtQuizPage() {
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const pieces = await getArtPieces(seniorId);

  const rounds: ArtQuizRound[] = [];
  for (const piece of pieces) {
    const otherTitles = shuffle(pieces.filter((p) => p.id !== piece.id).map((p) => p.title));
    if (otherTitles.length === 0) continue;
    const distractors = otherTitles.slice(0, Math.min(3, otherTitles.length));
    rounds.push({
      artLabel: piece.label,
      hex: swatchToHex(piece.colorSwatch),
      correctTitle: piece.title,
      choices: shuffle([piece.title, ...distractors]),
      imageUrl: piece.imageUrl,
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
          <Medallion icon="art" accent="var(--color-games)" size="sm" />
          <h1 className="text-3xl font-bold">Guess the Artwork</h1>
        </div>

        {rounds.length === 0 ? (
          <p className="tile tile-accent-games p-6 text-xl text-[var(--color-text-muted)]">
            This game needs at least two pieces of art saved. Add a few pieces on the Art page,
            then come back here.
          </p>
        ) : (
          <ArtQuiz rounds={shuffle(rounds)} />
        )}
      </main>
    </div>
  );
}
