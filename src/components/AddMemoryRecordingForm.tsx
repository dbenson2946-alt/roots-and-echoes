"use client";

import { useRef, useState, useTransition } from "react";
import { submitRecordingToMemory } from "@/app/actions";
import { AudioRecorder } from "@/components/AudioRecorder";
import { MAX_AUDIO_UPLOAD_BYTES, formatFileSize } from "@/lib/ui";

/**
 * Lets a memory gain another voice recording any time after it was first
 * saved — record live, or upload an existing audio file. Mirrors the Music
 * page's "record yourself singing" pattern (SingingRecorder.tsx). A memory
 * can hold any number of these; see AudioClip's doc comment in
 * src/lib/types.ts for why.
 */
export function AddMemoryRecordingForm({ memoryId }: { memoryId: string }) {
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const canSave = Boolean(recordedFile || uploadedFileName) && !uploadError;

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formData.set("memoryId", memoryId);
        if (label.trim()) formData.set("label", label.trim());
        if (recordedFile) formData.set("recordedAudioFile", recordedFile);
        startTransition(async () => {
          await submitRecordingToMemory(formData);
          formRef.current?.reset();
          setRecordedFile(null);
          setUploadedFileName(null);
          setLabel("");
          setSaved(true);
        });
      }}
      className="space-y-3"
    >
      <AudioRecorder
        label="Record a voice recording"
        onRecordingReady={(file) => {
          setRecordedFile(file);
          setSaved(false);
        }}
      />
      <div>
        <p className="mb-1 text-base text-[var(--color-text-muted)]">Or upload an audio file instead</p>
        <input
          name="uploadedAudioFile"
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && file.size > MAX_AUDIO_UPLOAD_BYTES) {
              setUploadError(`That file is ${formatFileSize(file.size)} — please choose one under 4MB.`);
              setUploadedFileName(null);
              e.target.value = "";
            } else {
              setUploadError(null);
              setUploadedFileName(file?.name ?? null);
            }
            setSaved(false);
          }}
          className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
        />
        {uploadError && <p className="mt-1 text-base text-[var(--color-danger)]">{uploadError}</p>}
      </div>
      {(recordedFile || uploadedFileName) && (
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name this recording (optional)"
          aria-label="Name this recording"
          className="w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
        />
      )}
      <button type="submit" disabled={pending || !canSave} className="btn-lg btn-secondary !min-h-0 !py-3 !px-5">
        {pending ? "Saving…" : "Save this recording"}
      </button>
      {saved && <p className="text-lg font-semibold text-[var(--color-success)]">Saved.</p>}
    </form>
  );
}
