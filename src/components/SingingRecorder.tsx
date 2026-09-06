"use client";

import { useState, useTransition } from "react";
import { submitRecording } from "@/app/actions";
import { AudioRecorder } from "@/components/AudioRecorder";

export function SingingRecorder({ songId }: { songId: string }) {
  const [ready, setReady] = useState(false);
  const [label, setLabel] = useState("Singing the chorus");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-3">
      <AudioRecorder label="Record yourself singing" onRecordingReady={() => setReady(true)} />
      {ready && !saved && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 rounded-xl border-2 border-[var(--color-border)] p-3 text-lg"
            aria-label="Name this recording"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("songId", songId);
              fd.set("label", label);
              startTransition(async () => {
                await submitRecording(fd);
                setSaved(true);
              });
            }}
            className="btn-lg btn-primary !min-h-0 !py-3 !px-5"
          >
            {pending ? "Saving…" : "Save to this song"}
          </button>
        </div>
      )}
      {saved && <p className="text-lg font-semibold text-[var(--color-success)]">Saved to this song&rsquo;s memory list.</p>}
    </div>
  );
}
