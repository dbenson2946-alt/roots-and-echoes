"use client";

import { useState, useTransition } from "react";
import { submitRemovePhotoTag } from "@/app/actions";
import { Icon } from "@/components/Icon";

/** A tagged person's badge on a photo, tappable to remove the tag. No
 * confirm step — re-tagging someone is just as easy as removing them, so
 * this isn't the kind of permanent, hard-to-undo action that warrants one
 * (unlike deleting the person or the photo itself). */
export function RemoveTagButton({ photoId, personId, personName }: { photoId: string; personId: string; personName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={pending}
        aria-label={`Remove tag: ${personName}`}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const formData = new FormData();
              formData.set("photoId", photoId);
              formData.set("personId", personId);
              await submitRemovePhotoTag(formData);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't remove that tag.");
            }
          });
        }}
        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-photo-tint)] px-3 py-1 text-base font-semibold hover:opacity-80 disabled:opacity-60"
      >
        {personName}
        <Icon name="close" className="h-3.5 w-3.5" />
      </button>
      {error && (
        <span role="status" className="mt-1 text-sm text-[var(--color-danger)]">
          {error}
        </span>
      )}
    </span>
  );
}
