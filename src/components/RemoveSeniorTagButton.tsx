"use client";

import { useState, useTransition } from "react";
import { submitRemoveSeniorPhotoTag } from "@/app/actions";
import { Icon } from "@/components/Icon";

/** Sibling of RemoveTagButton, for the one tag that isn't a `people` row —
 * the senior themselves (see SENIOR_PHOTO_TAG_VALUE's doc comment in
 * src/lib/ui.ts). Same no-confirm-step reasoning as RemoveTagButton. */
export function RemoveSeniorTagButton({ photoId, seniorName }: { photoId: string; seniorName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={pending}
        aria-label={`Remove tag: ${seniorName}`}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const formData = new FormData();
              formData.set("photoId", photoId);
              await submitRemoveSeniorPhotoTag(formData);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't remove that tag.");
            }
          });
        }}
        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-tint)] px-3 py-1 text-base font-semibold hover:opacity-80 disabled:opacity-60"
      >
        {seniorName}
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
