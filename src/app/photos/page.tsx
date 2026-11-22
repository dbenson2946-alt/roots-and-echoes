import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getPhotoPage, countPhotos, getPeople, getGrant, getProfile } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { submitPhotoTag, submitPhotoCaption, submitDeletePhoto } from "@/app/actions";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { AddPhotoPanel, AddPersonPanel } from "@/components/AddPanels";
import { PhotoImageUpload } from "@/components/PhotoImageUpload";
import { PersonRow } from "@/components/PersonRow";
import { RemoveTagButton } from "@/components/RemoveTagButton";
import { RemoveSeniorTagButton } from "@/components/RemoveSeniorTagButton";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { DownloadPhotosButton } from "@/components/DownloadPhotosButton";
import { SENIOR_PHOTO_TAG_VALUE } from "@/lib/ui";

const PAGE_SIZE = 12;
const MAX_SHOWN = 600;

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; shown?: string }>;
}) {
  const { tab, shown } = await searchParams;
  const activeTab: "photos" | "family" = tab === "family" ? "family" : "photos";
  const shownCount = Math.min(Math.max(Number.parseInt(shown ?? "", 10) || PAGE_SIZE, PAGE_SIZE), MAX_SHOWN);

  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  // Only the photos on screen are loaded (newest first) — the other tab just
  // needs a count — so a big collection doesn't slow the page down.
  const [photoPage, photoTotal, people, grant, senior] = await Promise.all([
    activeTab === "photos" ? getPhotoPage(seniorId, shownCount) : Promise.resolve(null),
    activeTab === "photos" ? Promise.resolve(null) : countPhotos(seniorId),
    getPeople(seniorId),
    session.isSelf ? Promise.resolve(undefined) : getGrant(session.profile.id, seniorId),
    getProfile(seniorId),
  ]);
  const photos = photoPage?.photos ?? [];
  const totalPhotos = photoPage?.total ?? photoTotal ?? 0;
  // Same "contribute" permission required for every export in the app (see
  // §17/§18) — the button is hidden from a view-only caregiver here, and
  // requireContributor() inside the export's server action enforces it
  // again either way. It also decides who sees the "add" buttons.
  const canExportPhotos = session.isSelf || grant?.permission === "contribute";

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Medallion icon="family" accent="var(--color-photo)" />
            <div>
              <h1 className="text-3xl font-bold">Photos &amp; Family</h1>
              <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
                Remember who&rsquo;s who, and see how everyone connects.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canExportPhotos && <DownloadPhotosButton />}
          </div>
        </div>

        <nav aria-label="Photos and family" className="grid grid-cols-2 gap-3">
          {(
            [
              { key: "photos", label: "Photos", count: totalPhotos, href: "/photos?tab=photos" },
              { key: "family", label: "Family & friends", count: people.length, href: "/photos?tab=family" },
            ] as const
          ).map((t) => {
            const active = t.key === activeTab;
            return (
              <Link
                key={t.key}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`btn-lg ${active ? "btn-primary" : "btn-secondary"} !flex-wrap !justify-center !gap-x-2 !gap-y-0 !py-3 !px-3 text-center`}
              >
                {t.label}
                <span className="text-base font-semibold opacity-90">({t.count})</span>
              </Link>
            );
          })}
        </nav>

        {activeTab === "photos" && (
          <>
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">Your photos</h2>
            </div>
            {canExportPhotos && <AddPhotoPanel />}
            {photos.length === 0 ? (
              <p className="tile tile-accent-photo p-6 text-xl text-[var(--color-text-muted)]">
                No photos yet{canExportPhotos ? " — tap “Add a photo” to add your first one." : "."}
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {photos.map((photo) => {
                  const tagged = people.filter((p) => photo.taggedPersonIds.includes(p.id));
                  const untagged = people.filter((p) => !photo.taggedPersonIds.includes(p.id));
                  return (
                    <div key={photo.id} className="tile tile-accent-photo overflow-hidden">
                      {photo.imageUrl ? (
                        // object-contain (not object-cover), on a tinted background —
                        // the whole photo stays visible instead of cropping whoever's
                        // standing at the edges of a photo whose shape doesn't match
                        // this fixed-height box.
                        <div className="flex h-56 w-full items-center justify-center bg-[var(--color-photo-tint)]">
                          {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset Next's optimizer can cache */}
                          <img
                            src={photo.imageUrl}
                            alt={photo.caption || photo.label}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div
                          className="flex h-40 items-center justify-center text-xl font-bold"
                          style={{ background: photo.colorSwatch }}
                        >
                          {photo.label}
                        </div>
                      )}
                      <div className="space-y-3 p-4">
                        <p className="text-lg">
                          {photo.caption || <span className="text-[var(--color-text-muted)]">No description yet</span>}
                          {photo.dateTaken && <span className="text-base text-[var(--color-text-muted)]"> · {photo.dateTaken}</span>}
                        </p>

                        {!photo.imageUrl && <PhotoImageUpload photoId={photo.id} />}

                        {(photo.seniorTagged || tagged.length > 0) && (
                          <div className="flex flex-wrap gap-2">
                            {photo.seniorTagged && senior && (
                              <RemoveSeniorTagButton photoId={photo.id} seniorName={senior.name} />
                            )}
                            {tagged.map((p) => (
                              <RemoveTagButton key={p.id} photoId={photo.id} personId={p.id} personName={p.name} />
                            ))}
                          </div>
                        )}

                        <form action={submitPhotoCaption} className="flex gap-2">
                          <input type="hidden" name="photoId" value={photo.id} />
                          <input
                            name="caption"
                            defaultValue={photo.caption ?? ""}
                            placeholder="Who's in this photo, or what's happening?"
                            className="flex-1 rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
                          />
                          <button type="submit" className="btn-lg btn-secondary !min-h-0 !py-3 !px-4">
                            Save
                          </button>
                        </form>

                        {(!photo.seniorTagged || untagged.length > 0) && (
                          <form action={submitPhotoTag} className="flex gap-2">
                            <input type="hidden" name="photoId" value={photo.id} />
                            <select name="personId" className="flex-1 rounded-xl border-2 border-[var(--color-border)] p-3 text-lg">
                              <option value="">Tag someone in this photo…</option>
                              {!photo.seniorTagged && senior && (
                                <option value={SENIOR_PHOTO_TAG_VALUE}>{senior.name} (you)</option>
                              )}
                              {untagged.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <button type="submit" className="btn-lg btn-secondary !min-h-0 !py-3 !px-4">
                              Tag
                            </button>
                          </form>
                        )}

                        <div className="pt-1">
                          <ConfirmDeleteButton
                            action={submitDeletePhoto}
                            fields={{ photoId: photo.id }}
                            idleLabel="Delete this photo"
                            confirmQuestion="Delete this photo for good?"
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {totalPhotos > photos.length && (
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href={`/photos?tab=photos&shown=${Math.min(shownCount + PAGE_SIZE, MAX_SHOWN)}`}
                  scroll={false}
                  className="btn-lg btn-secondary"
                >
                  Show {Math.min(PAGE_SIZE, totalPhotos - photos.length)} more
                </Link>
                <p className="text-base text-[var(--color-text-muted)]">
                  Showing {photos.length} of {totalPhotos}, newest first.
                </p>
              </div>
            )}
          </section>
          </>
        )}

        {activeTab === "family" && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">Family &amp; friends</h2>
              <Link href="/photos/family-tree" className="btn-lg btn-secondary">
                <Icon name="tree" className="h-5 w-5" /> View family tree
              </Link>
            </div>
            {canExportPhotos && <AddPersonPanel people={people} seniorName={senior?.name} />}
            {people.length === 0 ? (
              <p className="tile tile-accent-photo p-6 text-xl text-[var(--color-text-muted)]">
                No one added yet{canExportPhotos ? " — tap “Add a person” to add the first one." : "."}
              </p>
            ) : (
              <div className="space-y-3">
                {people.map((p) => (
                  <PersonRow key={p.id} person={p} allPeople={people} seniorName={senior?.name} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
