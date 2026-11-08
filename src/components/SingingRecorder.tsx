"use client";

import { useRef, useState, useTransition } from "react";
import { submitRecording } from "@/app/actions";
import { uploadAudioDirect } from "@/lib/clientAudioUpload";
import { AudioRecorder } from "@/components/AudioRecorder";
import { MAX_AUDIO_UPLOAD_BYTES, formatFileSize } from "@/lib/ui";

export function SingingRecorder({ songId }: { songId: string }) {
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [label, setLabel] = useState("Singing the chorus");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const canSave = Boolean(recordedFile || uploadedFileName) && !uploadError;

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formData.set("songId", songId);
        formData.set("label", label);
        const uploadedFile = formData.get("uploadedAudioFile");
        formData.delete("uploadedAudioFile");
        startTransition(async () => {
          try {
            if (recordedFile) {
              const recordedPath = await uploadAudioDirect(recordedFile);
              formData.set("recordedAudioPath", recordedPath);
            }
            if (uploadedFile instanceof File && uploadedFile.size > 0) {
              const uploadedPath = await uploadAudioDirect(uploadedFile);
              formData.set("uploadedAudioPath", uploadedPath);
              formData.set("uploadedAudioFileName", uploadedFile.name);
            }
            await submitRecording(formData);
            formRef.current?.reset();
            setRecordedFile(null);
            setUploadedFileName(null);
            setSaved(true);
          } catch (err) {
            setUploadError(err instanceof Error ? err.message : "That audio didn't upload.");
          }
        });
      }}
      className="space-y-3"
    >
      <AudioRecorder
        label="Record yourself singing"
        onRecordingReady={(file) => {
          setRecordedFile(file);
          setSaved(false);
        }}
      />
      <div>
        <p className="mb-1 text-base text-[var(--color-text-muted)]">Or upload an existing recording</p>
        <input
          name="uploadedAudioFile"
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && file.size > MAX_AUDIO_UPLOAD_BYTES) {
              setUploadError(`That file is ${formatFileSize(file.size)} — please choose one under ${formatFileSize(MAX_AUDIO_UPLOAD_BYTES)}.`);
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
      {(recordedFile || uploadedFileName) && !saved && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
            aria-label="Name this recording"
          />
          <button
            type="submit"
            disabled={pending || !canSave}
            className="btn-lg btn-primary !min-h-0 !py-3 !px-5"
          >
            {pending ? "Saving…" : "Save to this song"}
          </button>
        </div>
      )}
      {saved && <p className="text-lg font-semibold text-[var(--color-success)]">Saved to this song&rsquo;s memory list.</p>}
    </form>
  );
}
