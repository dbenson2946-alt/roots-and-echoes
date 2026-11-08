"use client";

import { useRef, useState, useTransition } from "react";
import { submitSongAudio } from "@/app/actions";
import { uploadAudioDirect } from "@/lib/clientAudioUpload";
import { Icon } from "@/components/Icon";
import { MAX_AUDIO_UPLOAD_BYTES, formatFileSize } from "@/lib/ui";

export function SongAudioUpload({ songId }: { songId: string }) {
  const [pending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setUploadError(null);
        startTransition(async () => {
          const file = formData.get("audioFile");
          formData.delete("audioFile");
          try {
            if (!(file instanceof File) || file.size === 0) {
              setUploadError("Choose an audio file first.");
              return;
            }
            const audioPath = await uploadAudioDirect(file);
            formData.set("audioPath", audioPath);
            await submitSongAudio(formData);
            formRef.current?.reset();
          } catch (err) {
            setUploadError(err instanceof Error ? err.message : "That audio didn't upload.");
          }
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
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && file.size > MAX_AUDIO_UPLOAD_BYTES) {
            setUploadError(`That file is ${formatFileSize(file.size)} — please choose one under ${formatFileSize(MAX_AUDIO_UPLOAD_BYTES)}.`);
            e.target.value = "";
          } else {
            setUploadError(null);
          }
        }}
        className="flex-1 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
        aria-label="Upload the song to play"
      />
      <button type="submit" disabled={pending} className="btn-lg btn-primary !min-h-0 !py-3 !px-5">
        <Icon name="upload" className="h-5 w-5" />
        {pending ? "Uploading…" : "Upload"}
      </button>
      {uploadError && (
        <p role="status" className="w-full text-base text-[var(--color-danger)]">
          {uploadError}
        </p>
      )}
    </form>
  );
}
