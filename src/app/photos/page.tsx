import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getPhotos, getPeople } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { submitNewPhoto, submitPhotoTag, submitPhotoCaption, submitNewPerson } from "@/app/actions";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { RELATIONSHIP_LABELS } from "@/lib/ui";
import type { RelationshipType } from "@/lib/types";

export default async function PhotosPage() {
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const [photos, people] = await Promise.all([getPhotos(seniorId), getPeople(seniorId)]);

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
          <Link href="/photos/family-tree" className="btn-lg btn-secondary">
            <Icon name="tree" className="h-5 w-5" /> View family tree
          </Link>
        </div>

        <section>
          <h2 className="mb-4 text-2xl font-bold">Your photos</h2>
          {photos.length === 0 ? (
            <p className="tile tile-accent-photo p-6 text-xl text-[var(--color-text-muted)]">No photos yet — add your first one below.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {photos.map((photo) => {
                const tagged = people.filter((p) => photo.taggedPersonIds.includes(p.id));
                const untagged = people.filter((p) => !photo.taggedPersonIds.includes(p.id));
                return (
                  <div key={photo.id} className="tile tile-accent-photo overflow-hidden">
                    <div
                      className="flex h-40 items-center justify-center text-xl font-bold"
                      style={{ background: photo.colorSwatch }}
                    >
                      {photo.label}
                    </div>
                    <div className="space-y-3 p-4">
                      <p className="text-lg">
                        {photo.caption || <span className="text-[var(--color-text-muted)]">No description yet</span>}
                        {photo.dateTaken && <span className="text-base text-[var(--color-text-muted)]"> · {photo.dateTaken}</span>}
                      </p>

                      {tagged.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tagged.map((p) => (
                            <span key={p.id} className="rounded-full bg-[var(--color-photo-tint)] px-3 py-1 text-base font-semibold">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <form action={submitPhotoCaption} className="flex gap-2">
                        <input type="hidden" name="photoId" value={photo.id} />
                        <input
                          name="caption"
                          placeholder="Who's in this photo, or what's happening?"
                          className="flex-1 rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
                        />
                        <button type="submit" className="btn-lg btn-secondary !min-h-0 !py-3 !px-4">
                          Save
                        </button>
                      </form>

                      {untagged.length > 0 && (
                        <form action={submitPhotoTag} className="flex gap-2">
                          <input type="hidden" name="photoId" value={photo.id} />
                          <select name="personId" className="flex-1 rounded-xl border-2 border-[var(--color-border)] p-3 text-lg">
                            <option value="">Tag someone in this photo…</option>
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="tile tile-accent-photo p-6">
          <h2 className="mb-4 text-2xl font-bold">Add a photo</h2>
          <form action={submitNewPhoto} className="grid gap-4 sm:grid-cols-3">
            <input
              name="label"
              required
              placeholder="Short title (e.g. Family picnic)"
              className="rounded-xl border-2 border-[var(--color-border)] p-3 text-lg sm:col-span-1"
            />
            <input
              name="caption"
              placeholder="Description (optional)"
              className="rounded-xl border-2 border-[var(--color-border)] p-3 text-lg sm:col-span-1"
            />
            <input
              name="dateTaken"
              placeholder="Date (optional)"
              className="rounded-xl border-2 border-[var(--color-border)] p-3 text-lg sm:col-span-1"
            />
            <button type="submit" className="btn-lg btn-primary sm:col-span-3 sm:w-auto">
              <Icon name="camera" className="h-5 w-5" /> Add photo
            </button>
          </form>
          <p className="mt-3 text-base text-[var(--color-text-muted)]">
            This demo saves a placeholder tile for each photo. Once Supabase Storage is connected
            (see the README), this becomes a real photo upload.
          </p>
        </section>

        <section className="tile tile-accent-photo p-6">
          <h2 className="mb-4 text-2xl font-bold">Add a person to the family &amp; friends circle</h2>
          <form action={submitNewPerson} className="grid gap-4 sm:grid-cols-3">
            <input
              name="name"
              required
              placeholder="Full name"
              className="rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
            />
            <select name="relationship" defaultValue="other" className="rounded-xl border-2 border-[var(--color-border)] p-3 text-lg">
              {(Object.keys(RELATIONSHIP_LABELS) as RelationshipType[]).map((key) => (
                <option key={key} value={key}>
                  {RELATIONSHIP_LABELS[key]}
                </option>
              ))}
            </select>
            <input
              name="relationshipLabel"
              placeholder="Add detail (optional)"
              className="rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
            />
            <button type="submit" className="btn-lg btn-primary sm:col-span-3 sm:w-auto">
              <Icon name="plus" className="h-5 w-5" /> Add person
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
