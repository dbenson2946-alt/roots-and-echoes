"use client";

import { useState, useTransition } from "react";
import { submitPhotoTags } from "@/app/actions";
import { Icon } from "@/components/Icon";
import { PersonTickList, type TickOption } from "@/components/PersonTickList";

/** "Tag people" on a photo card: a button that opens a tick-list of the people
 * not yet tagged, so several can be added with a single Save. The chips for
 * people already tagged (with their remove buttons) stay as they were. */
export function TagPeoplePanel({ photoId, options }: { photoId: string; options: TickOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base"
      >
        <Icon name="plus" className="h-4 w-4" /> Tag people
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            const result = await submitPhotoTags(formData);
            if (result.status === "error") {
              setError(result.message);
              return;
            }
            setOpen(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong saving the tags.");
          }
        });
      }}
      className="space-y-3 rounded-xl border-2 border-[var(--color-border)] p-3"
    >
      <input type="hidden" name="photoId" value={photoId} />
      <PersonTickList options={options} legend="Who else is in this photo?" />
      {error && (
        <p role="alert" className="text-base text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn-lg btn-primary !min-h-0 !py-2 !px-4 text-base">
          {pending ? "Adding…" : "Add tags"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(false)}
          className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
