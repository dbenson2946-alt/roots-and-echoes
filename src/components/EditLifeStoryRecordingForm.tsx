"use client";

import { useState, useTransition } from "react";
import { submitEditLifeStoryRecording } from "@/app/actions";
import { VoiceTextField } from "@/components/VoiceTextField";
import { Icon } from "@/components/Icon";

/** Lives on a Life Story Recording's detail page, gated the same way
 * every other write in the app is (contribute permission). Built in from
 * the start this time — see store.ts's updateLifeStoryRecordingDetails
 * doc comment — rather than bolted on after the fact the way §22/§25
 * had to for songs. */
export function EditLifeStoryRecordingForm({
  recordingId,
  title,
  summary,
}: {
  recordingId: string;
  title: string;
  summary: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  // VoiceTextField owns its own internal state (needed for speech-to-text
  // dictation), so it's reset via `key` on cancel rather than a controlled
  // value — same pattern as EditSongDetailsForm.
  const [resetKey, setResetKey] = useState(0);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base"
      >
        <Icon name="edit" className="mr-1 inline h-4 w-4" /> Edit title & summary
      </button>
    );
  }

  return (
    <form
      className="space-y-4 rounded-xl bg-[var(--color-bg)] p-4"
      action={(formData) => {
        startTransition(async () => {
          formData.set("recordingId", recordingId);
          await submitEditLifeStoryRecording(formData);
          setSaved(true);
        });
      }}
    >
      <div>
        <label htmlFor={`edit-life-story-title-${recordingId}`} className="mb-2 block text-lg font-bold">
          Title
        </label>
        <input
          id={`edit-life-story-title-${recordingId}`}
          name="title"
          required
          defaultValue={title}
          className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
        />
      </div>

      <div>
        <VoiceTextField
          key={resetKey}
          id={`edit-life-story-summary-${recordingId}`}
          name="summary"
          label="Summary — type or speak"
          defaultValue={summary}
          rows={8}
          required
        />
        <p className="mt-1 text-base text-[var(--color-text-muted)]">
          Aim for roughly 300-500 words — just a friendly guideline, not a hard limit.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-lg btn-primary !min-h-0 !py-3 !px-5">
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setResetKey((k) => k + 1);
            setSaved(false);
            setEditing(false);
          }}
          className="btn-lg btn-secondary !min-h-0 !py-3 !px-5"
        >
          Cancel
        </button>
      </div>

      {saved && <p className="text-lg font-semibold text-[var(--color-success)]">Saved.</p>}
    </form>
  );
}
