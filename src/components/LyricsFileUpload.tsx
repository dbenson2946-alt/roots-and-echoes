"use client";

import { useRef, useState, useTransition } from "react";
import { extractLyricsFromFile } from "@/app/actions";
import { MAX_LYRICS_UPLOAD_BYTES, formatFileSize } from "@/lib/ui";
import { Icon } from "@/components/Icon";

/** The "or upload a file" half of lyrics entry — shared by NewSongForm (a
 * brand-new song) and EditSongLyricsForm (adding/replacing lyrics on one
 * already saved). Extracts plain text from a .txt/.docx/.pdf file and
 * hands it to the caller, which drops it straight into its own textarea —
 * replacing whatever's there, per David's choice, rather than appending.
 * Nothing here is ever uploaded to Storage; the file's bytes are read once
 * by the Server Action to pull out text, then discarded. */
export function LyricsFileUpload({ onExtracted }: { onExtracted: (text: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        aria-label="Upload a lyrics file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > MAX_LYRICS_UPLOAD_BYTES) {
            setError(`That file is ${formatFileSize(file.size)} — please choose one under ${formatFileSize(MAX_LYRICS_UPLOAD_BYTES)}.`);
            if (inputRef.current) inputRef.current.value = "";
            return;
          }
          setError(null);
          const fd = new FormData();
          fd.set("lyricsFile", file);
          startTransition(async () => {
            const result = await extractLyricsFromFile(fd);
            if (inputRef.current) inputRef.current.value = "";
            if ("error" in result) {
              setError(result.error);
            } else {
              onExtracted(result.text);
            }
          });
        }}
        className="w-full rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg"
      />
      <p className="mt-1 flex items-center gap-1 text-base text-[var(--color-text-muted)]">
        <Icon name="upload" className="h-4 w-4" />
        {pending
          ? "Reading your file…"
          : "Upload a .txt, .docx, or .pdf file — this replaces whatever's in the box above."}
      </p>
      {error && <p className="mt-1 text-base text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
