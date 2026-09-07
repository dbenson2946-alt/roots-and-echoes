"use client";

import { useRef, useState, useTransition } from "react";
import { submitNewPhoto } from "@/app/actions";
import { uploadImageDirect } from "@/lib/clientImageUpload";
import { Icon } from "@/components/Icon";

export function NewPhotoForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const file = formData.get("photoFile");
          formData.delete("photoFile");
          try {
            if (file instanceof File && file.size > 0) {
              const storagePath = await uploadImageDirect(file);
              formData.set("storagePath", storagePath);
            }
            await submitNewPhoto(formData);
            formRef.current?.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong saving the photo.");
          }
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
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
      </div>

      <div>
        <label htmlFor="photo-file" className="mb-2 block text-lg font-bold">
          Upload the photo (optional)
        </label>
        <input
          id="photo-file"
          name="photoFile"
          type="file"
          accept="image/*"
          className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
        />
        <p className="mt-1 text-base text-[var(--color-text-muted)]">
          Add the actual picture, or skip this and just save the title for now — you can add the
          picture later.
        </p>
      </div>

      {error && (
        <p role="status" className="text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-lg btn-primary sm:w-auto">
        <Icon name="camera" className="h-5 w-5" /> {pending ? "Saving…" : "Add photo"}
      </button>
    </form>
  );
}
