"use client";

import { useState, useTransition } from "react";
import { submitBulkImportLifeStoryRecordings } from "@/app/actions";
import { uploadAudioDirect } from "@/lib/clientAudioUpload";

type SummaryEntry = { speaker: string; recorded: string; length: string; topic: string; summary: string };
type Candidate = { key: string; fileName: string; title: string; summary: string; file: File };

/** One-time personal import (David's "Family Stories - Mom & Dad"
 * interview recordings, see plan.md §33) — not a permanent, nav-linked
 * feature. The folder holds many compressed audio files (named like
 * "ZOOM0003.mp3") plus a single "Interview Summaries.txt" with one block
 * per interview clip that actually got a summary:
 *
 *   File: ZOOM0003
 *   Speaker: Dad
 *   Recorded: Dec 23, 2017
 *   Length: 12 min 21 s
 *   Topic: Dad's birth, family names and his parents' work
 *   Summary: ...
 *
 * Every selected file is read entirely in the browser; only the resulting
 * {title, summary} text and (after it's uploaded) a storage path ever
 * cross to the server — never raw file bytes through a server round trip,
 * same discipline as every other audio write in this app. An audio file
 * with no matching "File:" block is skipped (per David's own instruction:
 * only import files that have a summary) rather than imported with a
 * blank summary. */
function parseSummaries(rawText: string): Map<string, SummaryEntry> {
  const map = new Map<string, SummaryEntry>();
  const blocks = rawText.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/);
  for (const block of blocks) {
    const fileMatch = block.match(/^File:\s*(.+)$/m);
    const topicMatch = block.match(/^Topic:\s*(.+)$/m);
    const summaryMatch = block.match(/^Summary:\s*([\s\S]+)$/m);
    if (!fileMatch || !topicMatch || !summaryMatch) continue;
    const speakerMatch = block.match(/^Speaker:\s*(.+)$/m);
    const recordedMatch = block.match(/^Recorded:\s*(.+)$/m);
    const lengthMatch = block.match(/^Length:\s*(.+)$/m);
    map.set(fileMatch[1].trim(), {
      speaker: speakerMatch?.[1]?.trim() ?? "",
      recorded: recordedMatch?.[1]?.trim() ?? "",
      length: lengthMatch?.[1]?.trim() ?? "",
      topic: topicMatch[1].trim(),
      summary: summaryMatch[1].trim(),
    });
  }
  return map;
}

export function BulkImportLifeStoryRecordingsForm() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [unmatchedAudio, setUnmatchedAudio] = useState<string[]>([]);
  const [orphanSummaries, setOrphanSummaries] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ imported: number; skipped: string[]; uploadFailures: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    setResult(null);
    setError(null);
    if (!fileList || fileList.length === 0) {
      setCandidates([]);
      setUnmatchedAudio([]);
      setOrphanSummaries([]);
      return;
    }
    const files = Array.from(fileList);
    const textFile = files.find((f) => f.name.toLowerCase().endsWith(".txt"));
    if (!textFile) {
      setError("Please select the Interview Summaries.txt file along with the audio files.");
      return;
    }
    const audioFiles = files.filter((f) => f !== textFile);
    const summaries = parseSummaries(await textFile.text());

    const matched: Candidate[] = [];
    const unmatched: string[] = [];
    const usedKeys = new Set<string>();

    for (const file of audioFiles) {
      const key = file.name.replace(/\.[^./\\]+$/, "").trim();
      const entry = summaries.get(key);
      if (!entry) {
        unmatched.push(file.name);
        continue;
      }
      usedKeys.add(key);
      const metaLine = [
        entry.speaker && `Speaker: ${entry.speaker}`,
        entry.recorded && `Recorded: ${entry.recorded}`,
        entry.length && `Length: ${entry.length}`,
      ]
        .filter(Boolean)
        .join(" · ");
      const summary = metaLine ? `${metaLine}\n\n${entry.summary}` : entry.summary;
      matched.push({ key, fileName: file.name, title: entry.topic, summary, file });
    }

    const orphans = Array.from(summaries.keys()).filter((k) => !usedKeys.has(k));

    matched.sort((a, b) => a.key.localeCompare(b.key));
    setCandidates(matched);
    setUnmatchedAudio(unmatched.sort());
    setOrphanSummaries(orphans.sort());
  }

  function handleImport() {
    setError(null);
    startTransition(async () => {
      const uploadFailures: string[] = [];
      const items: { title: string; summary: string; audioPath: string }[] = [];
      try {
        for (let i = 0; i < candidates.length; i++) {
          setProgress({ done: i, total: candidates.length });
          const c = candidates[i];
          try {
            const audioPath = await uploadAudioDirect(c.file);
            items.push({ title: c.title, summary: c.summary, audioPath });
          } catch {
            uploadFailures.push(`${c.fileName} ("${c.title}")`);
          }
        }
        setProgress(null);
        const outcome = await submitBulkImportLifeStoryRecordings(items);
        setResult({ ...outcome, uploadFailures });
        setCandidates([]);
        setUnmatchedAudio([]);
        setOrphanSummaries([]);
      } catch {
        setProgress(null);
        setError("Something went wrong saving these — please try again.");
      }
    });
  }

  return (
    <div className="tile tile-accent-story space-y-5 p-6">
      <div>
        <label htmlFor="bulk-life-story-files" className="mb-2 block text-xl font-bold">
          Select every file in the folder (the audio files and Interview Summaries.txt)
        </label>
        <input
          id="bulk-life-story-files"
          type="file"
          multiple
          accept=".txt,audio/*"
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
            Ready to import {candidates.length} recording{candidates.length === 1 ? "" : "s"}.
          </p>
          {unmatchedAudio.length > 0 && (
            <p className="text-base text-[var(--color-text-muted)]">
              {unmatchedAudio.length} audio file{unmatchedAudio.length === 1 ? "" : "s"} had no summary in
              Interview Summaries.txt, so {unmatchedAudio.length === 1 ? "it's" : "they're"} being skipped,
              as asked: {unmatchedAudio.join(", ")}
            </p>
          )}
          {orphanSummaries.length > 0 && (
            <p className="text-base text-[var(--color-text-muted)]">
              {orphanSummaries.length} summary block{orphanSummaries.length === 1 ? "" : "s"} had no matching
              audio file selected, so {orphanSummaries.length === 1 ? "it's" : "they're"} being skipped too:{" "}
              {orphanSummaries.join(", ")}
            </p>
          )}
          <button type="button" disabled={pending} onClick={handleImport} className="btn-lg btn-primary">
            {pending
              ? progress
                ? `Uploading ${progress.done + 1} of ${progress.total}…`
                : "Saving…"
              : `Import ${candidates.length} recordings`}
          </button>
        </div>
      )}

      {error && <p className="text-lg font-semibold text-[var(--color-danger)]">{error}</p>}

      {result && (
        <div className="space-y-2 rounded-xl bg-[var(--color-bg)] p-4">
          <p className="text-lg font-semibold text-[var(--color-success)]">
            Imported {result.imported} new life story recording{result.imported === 1 ? "" : "s"}.
          </p>
          {result.skipped.length > 0 && (
            <p className="text-base text-[var(--color-text-muted)]">
              Skipped {result.skipped.length} already saved (same title): {result.skipped.join(", ")}
            </p>
          )}
          {result.uploadFailures.length > 0 && (
            <p className="text-base text-[var(--color-danger)]">
              {result.uploadFailures.length} didn&rsquo;t upload and were not saved — please try selecting
              just {result.uploadFailures.length === 1 ? "that file" : "those files"} again:{" "}
              {result.uploadFailures.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
