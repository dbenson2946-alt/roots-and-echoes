import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getArtPiece } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { Icon } from "@/components/Icon";
import { Medallion } from "@/components/Medallion";
import { ArtImageUpload } from "@/components/ArtImageUpload";
import { ART_MEDIUM_META, formatDate } from "@/lib/ui";

export default async function ArtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireActiveSession();
  const { id } = await params;
  const piece = await getArtPiece(id);
  if (!piece || piece.seniorId !== session.activeSeniorId) notFound();
  const meta = ART_MEDIUM_META[piece.medium];

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link href="/art" className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4">
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to Art
        </Link>

        {piece.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset Next's optimizer can cache
          <img
            src={piece.imageUrl}
            alt={piece.title}
            className="mx-auto max-h-96 w-full rounded-2xl border-4 border-[var(--color-art)] object-cover"
          />
        ) : (
          <div className="flex justify-center">
            <Medallion icon={meta.icon} accent="var(--color-art)" />
          </div>
        )}

        <div className="tile tile-accent-art space-y-6 p-6">
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold text-[var(--color-art)]">
              <Icon name={meta.icon} className="h-5 w-5" /> {meta.label}
            </p>
            <h1 className="text-3xl font-bold">{piece.title}</h1>
            <p className="text-xl text-[var(--color-text-muted)] text-accent">{piece.artist || "Artist unknown"}</p>
          </div>

          {!piece.imageUrl && <ArtImageUpload artId={piece.id} />}

          {piece.prompt && (
            <p className="flex items-center gap-2 text-lg italic text-[var(--color-text-muted)]">
              <Icon name="thought" className="h-5 w-5" /> {piece.prompt}
            </p>
          )}

          {piece.personalNote && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Icon name="thought" className="h-5 w-5" style={{ color: "var(--color-art)" }} /> Why it stuck with you
                </h2>
                <ReadAloudButton text={piece.personalNote} />
              </div>
              <p className="text-xl leading-relaxed">{piece.personalNote}</p>
            </div>
          )}

          <p className="text-base text-[var(--color-text-muted)]">Added {formatDate(piece.recordedAt)}</p>
        </div>
      </main>
    </div>
  );
}
