"use client";

import { useState, useTransition } from "react";
import { submitPhotoDetails } from "@/app/actions";
import { Icon } from "@/components/Icon";
import { errorText } from "@/lib/errorText";

/** A photo card's title, description and date — shown as text, with an
 * "Edit details" button (when the viewer may edit) that opens all three
 * together with one Save. The date is free text on purpose ("1962",
 * "Summer 1962", "June 4, 1962"); the PDF sorts by the year it finds. */
export function PhotoDetails({
  photo,
  canEdit,
}: {
  photo: { id: string; label: string; caption?: string; dateTaken?: string };
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const field = "w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-lg";

  if (editing) {
    return (
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            try {
              const result = await submitPhotoDetails(formData);
              if (result.status === "error") {
                setError(result.message);
                return;
              }
              setEditing(false);
            } catch (err) {
              setError(errorText(err, "Something went wrong saving this."));
            }
          });
        }}
        className="space-y-3"
      >
        <input type="hidden" name="photoId" value={photo.id} />
        <div>
          <label htmlFor={`label-${photo.id}`} className="mb-1 block text-base font-semibold">
            Short title
          </label>
          <input id={`label-${photo.id}`} name="label" defaultValue={photo.label} required className={field} />
        </div>
        <div>
          <label htmlFor={`caption-${photo.id}`} className="mb-1 block text-base font-semibold">
            Description
          </label>
          <input
            id={`caption-${photo.id}`}
            name="caption"
            defaultValue={photo.caption ?? ""}
            placeholder="Who's in this photo, or what's happening?"
            className={field}
          />
        </div>
        <div>
          <label htmlFor={`date-${photo.id}`} className="mb-1 block text-base font-semibold">
            Date
          </label>
          <input
            id={`date-${photo.id}`}
            name="dateTaken"
            defaultValue={photo.dateTaken ?? ""}
            placeholder="e.g. 1962, Summer 1962, June 4 1962"
            className={field}
          />
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Any wording works. If you&rsquo;re not sure, a year or a guess like &ldquo;around 1960&rdquo; is fine.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-base text-[var(--color-danger)]">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="btn-lg btn-primary !min-h-0 !py-2 !px-4 text-base">
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(false)}
            className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-1">
      <h3 className="text-xl font-bold">{photo.label}</h3>
      <p className="text-lg">
        {photo.caption || <span className="text-[var(--color-text-muted)]">No description yet</span>}
      </p>
      <p className="text-base text-[var(--color-text-muted)]">{photo.dateTaken || "No date yet"}</p>
      {canEdit && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base"
          >
            <Icon name="edit" className="h-4 w-4" /> Edit details
          </button>
        </div>
      )}
    </div>
  );
}
