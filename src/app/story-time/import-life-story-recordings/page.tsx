import { requireActiveSession } from "@/lib/session";
import { getGrant } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { BulkImportLifeStoryRecordingsForm } from "@/components/BulkImportLifeStoryRecordingsForm";

/** One-time bulk import of David's "Family Stories - Mom & Dad" interview
 * recordings (see plan.md §33) — deliberately NOT linked from the Story
 * Time page or anywhere else in navigation, same direct-URL-only,
 * one-time-tool pattern as §26's song-library imports. Still gated by the
 * same contribute-permission check every other write in the app uses. */
export default async function BulkImportLifeStoryRecordingsPage() {
  const session = await requireActiveSession();
  const grant = session.isSelf ? undefined : await getGrant(session.profile.id, session.activeSeniorId!);
  const canContribute = session.isSelf || grant?.permission === "contribute";

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Medallion icon="mic" accent="var(--color-story)" />
          <div>
            <h1 className="text-3xl font-bold">Import life story recordings</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              A one-time bulk import of audio recordings and their summaries from files on your computer.
            </p>
          </div>
        </div>

        {canContribute ? (
          <BulkImportLifeStoryRecordingsForm />
        ) : (
          <p className="tile tile-accent-story p-6 text-xl text-[var(--color-text-muted)]">
            This account only has view access, so it can&rsquo;t import recordings.
          </p>
        )}
      </main>
    </div>
  );
}
