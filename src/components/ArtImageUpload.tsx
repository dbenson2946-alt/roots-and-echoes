"use client";

import { useRef, useState, useTransition } from "react";
import { submitArtImage } from "@/app/actions";
import { uploadImageDirect } from "@/lib/clientImageUpload";
import { Icon } from "@/components/Icon";

export function ArtImageUpload({ artId }: { artId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const file = formData.get("imageFile");
          formData.delete("imageFile");
          if (!(file instanceof File) || file.size === 0) {
            setError("Choose a picture to upload first.");
            return;
          }
          try {
            const storagePath = await uploadImageDirect(file);
            formData.set("storagePath", storagePath);
            await submitArtImage(formData);
            formRef.current?.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong uploading the picture.");
          }
        });
      }}
      className="space-y-2"
    >
      <input type="hidden" name="artId" value={artId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="imageFile"
          type="file"
          accept="image/*"
          required
          className="flex-1 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-base"
          aria-label="Upload a picture of this piece"
        />
        <button type="submit" disabled={pending} className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base">
          <Icon name="upload" className="h-4 w-4" />
          {pending ? "Uploading…" : "Upload picture"}
        </button>
      </div>
      {error && (
        <p role="status" className="text-base text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </form>
  );
}
