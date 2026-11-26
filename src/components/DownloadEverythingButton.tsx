"use client";

import { useState } from "react";
import { getEverythingExportData } from "@/app/actions";
import { ZipBuilder } from "@/lib/zip";
import { Icon } from "@/components/Icon";
import { errorText } from "@/lib/errorText";

// "Download everything" (account owner only, in Settings). The words come from the
// server action; each picture and recording is then fetched straight from Storage
// by the browser, and the zip is built here, so no file passes through a Vercel
// function. A big collection is split into several zip files so one download never
// has to hold more than about PART_LIMIT of pictures and sound in memory.

const PART_LIMIT = 250 * 1024 * 1024;
const BATCH = 4;

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function DownloadEverythingButton() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setDone(null);
    setProgress("Gathering your story…");
    try {
      const data = await getEverythingExportData();
      const stamp = new Date().toISOString().slice(0, 10);
      const person = data.seniorName.replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-") || "My";
      const encoder = new TextEncoder();

      let part = 1;
      let zip = new ZipBuilder();
      let savedParts = 0;
      const failed: string[] = [];
      for (const doc of data.documents) zip.add(doc.path, encoder.encode(doc.text));

      async function finishPart(last: boolean) {
        if (zip.fileCount === 0) return;
        saveBlob(zip.build(), `${person}-everything-${stamp}-part-${part}.zip`);
        savedParts += 1;
        part += 1;
        zip = new ZipBuilder();
        if (!last) await pause(700);
      }

      const total = data.media.length;
      for (let i = 0; i < total; i += BATCH) {
        const batch = data.media.slice(i, i + BATCH);
        setProgress(`Collecting pictures and recordings: ${Math.min(i + BATCH, total)} of ${total}…`);
        const results = await Promise.all(
          batch.map(async (item) => {
            try {
              const response = await fetch(item.url);
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return { item, bytes: new Uint8Array(await response.arrayBuffer()) };
            } catch {
              return { item, bytes: null };
            }
          })
        );
        for (const { item, bytes } of results) {
          if (!bytes) {
            failed.push(item.path);
            continue;
          }
          if (zip.fileCount > 0 && zip.contentBytes + bytes.length > PART_LIMIT) await finishPart(false);
          zip.add(item.path, bytes);
        }
      }

      if (failed.length > 0) {
        zip.add(
          "Files that could not be downloaded.txt",
          encoder.encode(
            "These pictures or recordings could not be fetched this time. Try the download again later:\n\n" +
              failed.join("\n") +
              "\n"
          )
        );
      }
      setProgress("Finishing…");
      await finishPart(true);

      setDone(
        `Done. ${savedParts} zip file${savedParts === 1 ? "" : "s"} saved to your Downloads folder` +
          (savedParts > 1 ? " (if your browser asks, allow multiple downloads), so keep them together" : "") +
          (failed.length > 0
            ? `. ${failed.length} file${failed.length === 1 ? "" : "s"} could not be fetched and ${failed.length === 1 ? "is" : "are"} listed in the last zip; you can run the download again.`
            : ".")
      );
    } catch (err) {
      setError(errorText(err, "Couldn't prepare your download. Please try again."));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={run} disabled={busy} className="btn-lg btn-secondary">
        <Icon name="pageLines" className="h-5 w-5" />
        {busy ? "Preparing your download…" : "Download everything"}
      </button>
      {progress && (
        <p role="status" className="text-lg text-[var(--color-text-muted)]">
          {progress} Please keep this page open.
        </p>
      )}
      {done && (
        <p role="status" className="text-lg font-semibold">
          {done}
        </p>
      )}
      {error && (
        <p role="status" className="text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
