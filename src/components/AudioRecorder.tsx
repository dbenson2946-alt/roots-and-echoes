"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Simple record / stop / play control built on MediaRecorder.
 * Needs microphone permission — the browser will prompt the first time.
 *
 * Hands the recorded clip back to the caller as a real File (not just a
 * playback URL) via `onRecordingReady`, so it can be uploaded the same way
 * an existing audio file picked from a file input would be — see
 * NewMemoryForm.tsx / SingingRecorder.tsx / AddMemoryRecordingForm.tsx.
 * (This used to only keep the clip in the browser tab as a blob URL and
 * never actually persist it anywhere — fixed as of
 * supabase/migration_6_recordings.sql.)
 */
export function AudioRecorder({
  label = "Record",
  onRecordingReady,
}: {
  label?: string;
  onRecordingReady?: (file: File) => void;
}) {
  const [status, setStatus] = useState<"idle" | "recording" | "recorded" | "unsupported" | "denied">(
    "idle"
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function startRecording() {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setStatus("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setStatus("recorded");
        onRecordingReady?.(new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch {
      setStatus("denied");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  if (status === "unsupported") {
    return (
      <p className="text-base text-[var(--color-text-muted)]">
        Audio recording isn&rsquo;t available in this browser.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status !== "recording" ? (
        <button type="button" onClick={startRecording} className="btn-lg btn-secondary">
          <Icon name="mic" className="h-5 w-5" /> {label}
        </button>
      ) : (
        <button type="button" onClick={stopRecording} className="btn-lg btn-primary">
          <Icon name="stop" className="h-5 w-5" /> Stop recording
        </button>
      )}
      {status === "denied" && (
        <p className="text-base text-[var(--color-danger)]">
          Microphone access was blocked — allow it in your browser settings to record.
        </p>
      )}
      {audioUrl && (
        <audio controls src={audioUrl} className="h-12">
          Your browser does not support audio playback.
        </audio>
      )}
    </div>
  );
}
