"use client";

import { useRef, useState, useTransition } from "react";
import { submitCustomVoice } from "@/app/actions";
import { uploadVoiceSampleDirect } from "@/lib/clientAudioUpload";
import { Icon } from "@/components/Icon";
import { MAX_AUDIO_UPLOAD_BYTES, formatFileSize } from "@/lib/ui";

export function NewCustomVoiceForm({ hasExisting }: { hasExisting: boolean }) {
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
              setUploadError("Choose a voice recording first.");
              return;
            }
            const audioPath = await uploadVoiceSampleDirect(file);
            formData.set("audioPath", audioPath);
            await submitCustomVoice(formData);
            formRef.current?.reset();
          } catch (err) {
            setUploadError(err instanceof Error ? err.message : "That recording didn't upload.");
          }
        });
      }}
      className="tile tile-compact space-y-3"
    >
      <label className="block space-y-1">
        <span className="text-lg font-bold">
          {hasExisting ? "Replace the voice recording" : "Upload a voice recording"}
        </span>
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
          className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
          aria-label="Upload a voice recording"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-lg font-bold">Whose voice is this?</span>
        <input
          name="label"
          type="text"
          placeholder={'e.g. "Grandma\'s voice"'}
          className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
        />
      </label>
      <label className="flex items-start gap-3 text-lg">
        <input
          name="consent"
          type="checkbox"
          required
          className="mt-1 h-6 w-6 shrink-0 rounded border-2 border-[var(--color-border)]"
        />
        <span>I have permission to use this voice recording.</span>
      </label>
      <p className="text-base text-[var(--color-text-muted)]">
        Real voice cloning needs a paid service this demo isn&apos;t connected to yet — for now,
        your uploaded recording is saved, and read-aloud uses one of the browser&apos;s own voices
        as a stand-in.
      </p>
      {uploadError && (
        <p role="status" className="text-base text-[var(--color-danger)]">
          {uploadError}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-lg btn-primary !min-h-0 !py-3 !px-5">
        <Icon name="upload" className="h-5 w-5" />
        {pending ? "Uploading…" : hasExisting ? "Replace voice" : "Upload voice"}
      </button>
    </form>
  );
}
