"use client";

import { useRef, useTransition } from "react";
import { submitArtImage } from "@/app/actions";
import { Icon } from "@/components/Icon";

export function ArtImageUpload({ artId }: { artId: string }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await submitArtImage(formData);
          formRef.current?.reset();
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="artId" value={artId} />
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
    </form>
  );
}
