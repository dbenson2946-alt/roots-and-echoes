import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getPhotos, getPeople } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { PhotoQuiz, type PhotoQuizRound } from "@/components/games/PhotoQuiz";
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

export default async function PhotoQuizPage() {
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const [photos, people] = await Promise.all([getPhotos(seniorId), getPeople(seniorId)]);
  const peopleById = new Map(people.map((p) => [p.id, p]));

  const rounds: PhotoQuizRound[] = [];
  for (const photo of photos) {
    if (photo.taggedPersonIds.length === 0) continue;
    const correct = peopleById.get(photo.taggedPersonIds[0]);
    if (!correct) continue;
    const otherNames = shuffle(people.filter((p) => p.id !== correct.id).map((p) => p.name));
    if (otherNames.length === 0) continue;
    const distractors = otherNames.slice(0, Math.min(3, otherNames.length));
    rounds.push({
      photoLabel: photo.label,
      hex: swatchToHex(photo.colorSwatch),
      correctName: correct.name,
      choices: shuffle([correct.name, ...distractors]),
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
          <Medallion icon="photo" accent="var(--color-games)" size="sm" />
          <h1 className="text-3xl font-bold">Who&rsquo;s in the Photo?</h1>
        </div>

        {rounds.length === 0 ? (
          <p className="tile tile-accent-games p-6 text-xl text-[var(--color-text-muted)]">
            This game needs a few tagged photos to work with. Tag who&rsquo;s in a photo and add
            at least one more person on the Photos &amp; Family page, then come back here.
          </p>
        ) : (
          <PhotoQuiz rounds={shuffle(rounds)} />
        )}
      </main>
    </div>
  );
}
