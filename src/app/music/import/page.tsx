import { requireActiveSession } from "@/lib/session";
import { getGrant } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { BulkImportLyricsForm } from "@/components/BulkImportLyricsForm";

/** One-time bulk import of David's existing lyrics library (title + lyrics
 * only, §26) — deliberately NOT linked from the Music page or anywhere
 * else in navigation, since this was asked for as a one-time personal
 * import rather than a permanent feature. Reachable only by its direct
 * URL, and still gated by the same contribute-permission check every
 * other write in the app uses, same as every other page here. */
export default async function BulkImportLyricsPage() {
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
            <h1 className="text-3xl font-bold">Import songs</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              A one-time bulk import of title + lyrics from files on your computer.
            </p>
          </div>
        </div>

        {canContribute ? (
          <BulkImportLyricsForm />
        ) : (
          <p className="tile tile-accent-music p-6 text-xl text-[var(--color-text-muted)]">
            This account only has view access, so it can&rsquo;t import songs.
          </p>
        )}
      </main>
    </div>
  );
}
