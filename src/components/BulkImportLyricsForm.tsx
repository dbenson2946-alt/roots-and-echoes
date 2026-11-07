"use client";

import { useState, useTransition } from "react";
import { submitBulkImportLyrics } from "@/app/actions";

type Candidate = { fileName: string; title: string; lyrics: string; titleLineStripped: boolean };

/** One-time personal-library import (David's own lyrics folder, §26) — not
 * a permanent, nav-linked feature. Reads each selected .txt file entirely
 * in the browser (File.text()); only plain {title, lyrics} text ever
 * crosses to the server, via submitBulkImportLyrics. Each file's own name
 * (minus extension) becomes the song's title. David's actual files also
 * repeat that same title as their own first line followed by a blank
 * line — stripped here so the saved lyrics don't start with a redundant
 * repeat of the title; a file where the first line *doesn't* match its
 * filename is left completely untouched and flagged in the preview list,
 * rather than silently guessing. */
function deriveCandidate(fileName: string, rawText: string): Candidate {
  const title = fileName.replace(/\.[^./\\]+$/, "").trim();
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const normalize = (s: string) => s.trim().toLowerCase();

  let firstContentIndex = 0;
  while (firstContentIndex < lines.length && lines[firstContentIndex].trim() === "") firstContentIndex++;

  const firstLine = lines[firstContentIndex] ?? "";
  if (firstContentIndex < lines.length && normalize(firstLine) === normalize(title)) {
    let rest = firstContentIndex + 1;
    while (rest < lines.length && lines[rest].trim() === "") rest++;
    return { fileName, title, lyrics: lines.slice(rest).join("\n").trim(), titleLineStripped: true };
  }
  return { fileName, title, lyrics: rawText.trim(), titleLineStripped: false };
}

export function BulkImportLyricsForm() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ imported: number; skipped: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    setResult(null);
    setError(null);
    if (!fileList || fileList.length === 0) {
      setCandidates([]);
      return;
    }
    const files = Array.from(fileList);
    const read = await Promise.all(
      files.map(async (file) => deriveCandidate(file.name, await file.text()))
    );
    // Stable, friendly ordering for the preview list.
    read.sort((a, b) => a.title.localeCompare(b.title));
    setCandidates(read);
  }

  function handleImport() {
    setError(null);
    startTransition(async () => {
      try {
        const outcome = await submitBulkImportLyrics(
          candidates.map((c) => ({ title: c.title, lyrics: c.lyrics }))
        );
        setResult(outcome);
        setCandidates([]);
      } catch {
        setError("Something went wrong saving these — nothing was imported. Please try again.");
      }
    });
  }

  const unmatchedCount = candidates.filter((c) => !c.titleLineStripped).length;

  return (
    <div className="tile tile-accent-music space-y-5 p-6">
      <div>
        <label htmlFor="bulk-lyrics-files" className="mb-2 block text-xl font-bold">
          Select every lyrics file in the folder
        </label>
        <input
          id="bulk-lyrics-files"
          type="file"
          multiple
          accept=".txt,text/plain"
          onChange={(e) => handleFiles(e.target.files)}
          className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-lg"
        />
        <p className="mt-1 text-base text-[var(--color-text-muted)]">
          In the file picker, select all the files in the folder at once (e.g. Ctrl+A), then open.
        </p>
      </div>

      {candidates.length > 0 && (
        <div className="space-y-3 rounded-xl bg-[var(--color-bg)] p-4">
          <p className="text-lg font-semibold">
            Ready to import {candidates.length} song{candidates.length === 1 ? "" : "s"}.
          </p>
          {unmatchedCount > 0 && (
            <p className="text-base text-[var(--color-text-muted)]">
              {unmatchedCount} file{unmatchedCount === 1 ? "" : "s"} didn&rsquo;t have the title as
              their first line, so {unmatchedCount === 1 ? "it was" : "those were"} kept exactly as
              written rather than guessed at:{" "}
              {candidates
                .filter((c) => !c.titleLineStripped)
                .map((c) => c.fileName)
                .join(", ")}
            </p>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={handleImport}
            className="btn-lg btn-primary"
          >
            {pending ? "Importing…" : `Import ${candidates.length} songs`}
          </button>
        </div>
      )}

      {error && <p className="text-lg font-semibold text-[var(--color-danger)]">{error}</p>}

      {result && (
        <div className="space-y-2 rounded-xl bg-[var(--color-bg)] p-4">
          <p className="text-lg font-semibold text-[var(--color-success)]">
            Imported {result.imported} new song{result.imported === 1 ? "" : "s"}.
          </p>
          {result.skipped.length > 0 && (
            <p className="text-base text-[var(--color-text-muted)]">
              Skipped {result.skipped.length} already in your library: {result.skipped.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
