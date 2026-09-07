import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getArtPieces, getNextArtPrompt } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { NewArtForm } from "@/components/NewArtForm";
import { Medallion } from "@/components/Medallion";
import { ART_MEDIUM_META, formatDate } from "@/lib/ui";

export default async function ArtPage() {
  const session = await requireActiveSession();
  const [pieces, prompt] = await Promise.all([
    getArtPieces(session.activeSeniorId!),
    getNextArtPrompt(session.activeSeniorId!),
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-10">
        <div className="flex items-center gap-4">
          <Medallion icon="art" accent="var(--color-art)" />
          <div>
            <h1 className="text-3xl font-bold">Art</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              Paintings, sculptures, and photographs that have stayed with you.
            </p>
          </div>
        </div>

        <NewArtForm prompt={prompt} />

        <section>
          <h2 className="mb-4 text-2xl font-bold">Your gallery</h2>
          {pieces.length === 0 ? (
            <p className="tile tile-accent-art p-6 text-xl text-[var(--color-text-muted)]">
              Nothing here yet — add the first piece above.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {pieces.map((piece) => {
                const meta = ART_MEDIUM_META[piece.medium];
                return (
                  <li key={piece.id}>
                    <Link
                      href={`/art/${piece.id}`}
                      className="tile tile-compact tile-accent-art flex items-start gap-4 hover:bg-[var(--color-art-tint)]"
                    >
                      {piece.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset Next's optimizer can cache
                        <img
                          src={piece.imageUrl}
                          alt={piece.title}
                          className="h-14 w-14 flex-none rounded-xl object-cover"
                        />
                      ) : (
                        <Medallion icon={meta.icon} size="sm" />
                      )}
                      <span className="flex-1">
                        <span className="block text-xl font-bold">{piece.title}</span>
                        <span className="block text-base text-[var(--color-text-muted)]">
                          {piece.artist || "Artist unknown"} · {meta.label}
                        </span>
                        <span className="block text-sm text-[var(--color-text-muted)]">
                          Added {formatDate(piece.recordedAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
