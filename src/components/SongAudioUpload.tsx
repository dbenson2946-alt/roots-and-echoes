"use client";

import { useRef, useTransition } from "react";
import { submitSongAudio } from "@/app/actions";
import { Icon } from "@/components/Icon";

export function SongAudioUpload({ songId }: { songId: string }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await submitSongAudio(formData);
          formRef.current?.reset();
        });
      }}
      className="flex flex-wrap items-center gap-3"
    >
      <input type="hidden" name="songId" value={songId} />
      <input
        name="audioFile"
        type="file"
        accept="audio/*"
        required
        className="flex-1 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
        aria-label="Upload the song to play"
      />
      <button type="submit" disabled={pending} className="btn-lg btn-primary !min-h-0 !py-3 !px-5">
        <Icon name="upload" className="h-5 w-5" />
        {pending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
