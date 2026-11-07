import { requireActiveSession } from "@/lib/session";
import { getGrant } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { BulkUpdateArtistsForm } from "@/components/BulkUpdateArtistsForm";

/** Sibling of src/app/music/import/page.tsx — a second one-time tool for
 * the same personal lyrics-library import, now setting artist on songs
 * already imported from an updated copy of the same files (title on line
 * 1, artist on line 2). Same reasoning as the import page: not linked
 * from navigation, reachable only by direct URL, same contribute-
 * permission gate every write in the app uses. */
export default async function BulkUpdateArtistsPage() {
  const session = await requireActiveSession();
  const grant = session.isSelf ? undefined : await getGrant(session.profile.id, session.activeSeniorId!);
  const canContribute = session.isSelf || grant?.permission === "contribute";

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Medallion icon="music" accent="var(--color-music)" />
          <div>
            <h1 className="text-3xl font-bold">Update song artists</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              A one-time bulk update, matching already-imported songs by title.
            </p>
          </div>
        </div>

        {canContribute ? (
          <BulkUpdateArtistsForm />
        ) : (
          <p className="tile tile-accent-music p-6 text-xl text-[var(--color-text-muted)]">
            This account only has view access, so it can&rsquo;t update songs.
          </p>
        )}
      </main>
    </div>
  );
}
