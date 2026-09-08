import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getPhotos, getPeople } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { submitPhotoTag, submitPhotoCaption, submitNewPerson, submitDeletePhoto } from "@/app/actions";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { NewPhotoForm } from "@/components/NewPhotoForm";
import { PhotoImageUpload } from "@/components/PhotoImageUpload";
import { PersonRow } from "@/components/PersonRow";
import { RemoveTagButton } from "@/components/RemoveTagButton";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
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
                    {photo.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset Next's optimizer can cache
                      <img
                        src={photo.imageUrl}
                        alt={photo.caption || photo.label}
                        className="h-56 w-full object-cover"
                      />
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

                      {tagged.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tagged.map((p) => (
                            <RemoveTagButton key={p.id} photoId={photo.id} personId={p.id} personName={p.name} />
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
        </section>

        <section className="tile tile-accent-photo p-6">
          <h2 className="mb-4 text-2xl font-bold">Add a photo</h2>
          <NewPhotoForm />
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold">Family &amp; friends</h2>
          {people.length === 0 ? (
            <p className="tile tile-accent-photo p-6 text-xl text-[var(--color-text-muted)]">
              No one added yet — add the first person below.
            </p>
          ) : (
            <div className="space-y-3">
              {people.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </div>
          )}
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
