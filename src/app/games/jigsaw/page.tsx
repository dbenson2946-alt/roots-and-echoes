import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getPhotos } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { JigsawGame } from "@/components/games/JigsawGame";
import { Icon } from "@/components/Icon";
import { Medallion } from "@/components/Medallion";
import { swatchToHex } from "@/lib/ui";

export default async function JigsawPage() {
  const session = await requireActiveSession();
  const photos = (await getPhotos(session.activeSeniorId!)).map((p) => ({
    id: p.id,
    label: p.label,
    hex: swatchToHex(p.colorSwatch),
    imageUrl: p.imageUrl,
  }));

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link href="/games" className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4">
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to Games
        </Link>
        <div className="flex items-center gap-4">
          <Medallion icon="puzzlePieces" accent="var(--color-games)" size="sm" />
          <h1 className="text-3xl font-bold">Photo Jigsaw</h1>
        </div>

        {photos.length === 0 ? (
          <p className="tile tile-accent-games p-6 text-xl text-[var(--color-text-muted)]">
            Add a photo on the Photos &amp; Family page first, and it&rsquo;ll turn up here as a
            puzzle.
          </p>
        ) : (
          <JigsawGame photos={photos} />
        )}
      </main>
    </div>
  );
}
