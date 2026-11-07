"use client";

import { useState, useTransition } from "react";
import { submitBulkUpdateYoutubeLinks } from "@/app/actions";

type Candidate = { fileName: string; title: string; youtubeUrl: string; malformed: boolean };

/** Third sibling of BulkImportLyricsForm/BulkUpdateArtistsForm — third
 * one-time pass over the same library, now with a YouTube link added as
 * each file's 3rd line. Only title (line 1) and the link (line 3) are
 * read; line 2 (artist, already set) and the rest of the file (lyrics,
 * already saved) are ignored. */
function deriveCandidate(fileName: string, rawText: string): Candidate {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const title = (lines[0] ?? "").trim();
  const youtubeUrl = (lines[2] ?? "").trim();
  return { fileName, title, youtubeUrl, malformed: !title || !youtubeUrl };
}

export function BulkUpdateYoutubeLinksForm() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ updated: string[]; unmatched: string[] } | null>(null);
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
    read.sort((a, b) => a.title.localeCompare(b.title));
    setCandidates(read);
  }

  function handleUpdate() {
    setError(null);
    const valid = candidates.filter((c) => !c.malformed);
    startTransition(async () => {
      try {
        const outcome = await submitBulkUpdateYoutubeLinks(
          valid.map((c) => ({ title: c.title, youtubeUrl: c.youtubeUrl }))
        );
        setResult(outcome);
        setCandidates([]);
      } catch {
        setError("Something went wrong saving these — nothing was updated. Please try again.");
      }
    });
  }

  const malformed = candidates.filter((c) => c.malformed);
  const valid = candidates.filter((c) => !c.malformed);

  return (
    <div className="tile tile-accent-music space-y-5 p-6">
      <div>
        <label htmlFor="bulk-youtube-files" className="mb-2 block text-xl font-bold">
          Select every updated lyrics file
        </label>
        <input
          id="bulk-youtube-files"
          type="file"
          multiple
          accept=".txt,text/plain"
          onChange={(e) => handleFiles(e.target.files)}
          className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-lg"
        />
        <p className="mt-1 text-base text-[var(--color-text-muted)]">
          Each file&rsquo;s 1st line should be the song title and 3rd line the YouTube link.
        </p>
      </div>

      {candidates.length > 0 && (
        <div className="space-y-3 rounded-xl bg-[var(--color-bg)] p-4">
          <p className="text-lg font-semibold">
            Ready to update {valid.length} song{valid.length === 1 ? "" : "s"} with a YouTube link.
          </p>
          {malformed.length > 0 && (
            <p className="text-base text-[var(--color-text-muted)]">
              {malformed.length} file{malformed.length === 1 ? "" : "s"} didn&rsquo;t have both a
              title and a link on the 3rd line, so {malformed.length === 1 ? "it was" : "they were"}{" "}
              skipped: {malformed.map((c) => c.fileName).join(", ")}
            </p>
          )}
          <button
            type="button"
            disabled={pending || valid.length === 0}
            onClick={handleUpdate}
            className="btn-lg btn-primary"
          >
            {pending ? "Updating…" : `Update ${valid.length} songs`}
          </button>
        </div>
      )}

      {error && <p className="text-lg font-semibold text-[var(--color-danger)]">{error}</p>}

      {result && (
        <div className="space-y-2 rounded-xl bg-[var(--color-bg)] p-4">
          <p className="text-lg font-semibold text-[var(--color-success)]">
            Added a YouTube link to {result.updated.length} song{result.updated.length === 1 ? "" : "s"}.
          </p>
          {result.unmatched.length > 0 && (
            <p className="text-base text-[var(--color-text-muted)]">
              Couldn&rsquo;t find a saved song matching {result.unmatched.length} title
              {result.unmatched.length === 1 ? "" : "s"}, so nothing changed for:{" "}
              {result.unmatched.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
