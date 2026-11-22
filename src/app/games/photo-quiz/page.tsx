import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getPhotos, getPeople, getProfile } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { PhotoQuiz } from "@/components/games/PhotoQuiz";
import { Icon } from "@/components/Icon";
import { Medallion } from "@/components/Medallion";
import { swatchToHex, SENIOR_PHOTO_TAG_VALUE } from "@/lib/ui";
import { buildQuizRounds, type QuizPerson } from "@/lib/photoQuiz";

export default async function PhotoQuizPage() {
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const [photos, people, senior] = await Promise.all([getPhotos(seniorId), getPeople(seniorId), getProfile(seniorId)]);

  // The senior is not a `people` row, so they get their own id here (the same
  // sentinel the photo tagging uses) and can be tagged, a right answer, or a
  // wrong choice like anyone else.
  const seniorPerson: QuizPerson | undefined = senior ? { id: SENIOR_PHOTO_TAG_VALUE, name: senior.name } : undefined;
  const everyone: QuizPerson[] = [...(seniorPerson ? [seniorPerson] : []), ...people.map((p) => ({ id: p.id, name: p.name }))];
  const peopleById = new Map(people.map((p) => [p.id, { id: p.id, name: p.name }]));

  const rounds = buildQuizRounds(
    photos.map((photo) => ({
      label: photo.label,
      hex: swatchToHex(photo.colorSwatch),
      imageUrl: photo.imageUrl,
      caption: photo.caption,
      dateTaken: photo.dateTaken,
      inPhoto: [
        ...(photo.seniorTagged && seniorPerson ? [seniorPerson] : []),
        ...photo.taggedPersonIds.map((id) => peopleById.get(id)).filter((p): p is QuizPerson => Boolean(p)),
      ],
    })),
    everyone
  );

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
          <PhotoQuiz rounds={rounds} />
        )}
      </main>
    </div>
  );
}
