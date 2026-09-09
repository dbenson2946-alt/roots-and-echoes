"use client";

import { useState } from "react";
import { getLifeStoryExportData } from "@/app/actions";
import { resizeImageForPdf } from "@/lib/resizeImageForPdf";
import { Icon } from "@/components/Icon";

// The "Download my life story" button on the Story Time page (§17 of the
// plan) — visible only to the senior or a contribute-permission caregiver
// (gated server-side by the page that renders this, and again by
// requireContributor() inside getLifeStoryExportData itself).
//
// The PDF is built entirely in the browser: this only calls a Server Action
// for the lightweight text + signed-photo-URL payload, then fetches and
// resizes each photo and assembles the PDF here — no PDF bytes ever pass
// through a Vercel function, deliberately staying clear of its hard 4.5MB
// response limit (see §15/§17 in the plan).
export function DownloadLifeStoryButton() {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPreparing(true);
    setError(null);
    try {
      const data = await getLifeStoryExportData();

      if (data.memories.length === 0) {
        setError("Add a memory in Story Time first — there's nothing to include in your life story yet.");
        return;
      }

      const memoriesWithResizedPhotos = await Promise.all(
        data.memories.map(async (memory) => ({
          ...memory,
          photos: await Promise.all(
            memory.photos.map(async (photo) => ({
              ...photo,
              imageUrl: await resizeImageForPdf(photo.imageUrl),
            }))
          ),
        }))
      );

      const [{ pdf }, { LifeStoryPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/LifeStoryPdfDocument"),
      ]);

      const generatedOn = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const blob = await pdf(
        <LifeStoryPdfDocument data={{ ...data, memories: memoriesWithResizedPhotos }} generatedOn={generatedOn} />
      ).toBlob();

      const fileDate = new Date().toISOString().slice(0, 10);
      const safeName = data.seniorName.replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-") || "My";
      const filename = `${safeName}-life-story-${fileDate}.pdf`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't prepare your life story. Please try again.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={preparing} className="btn-lg btn-secondary">
        <Icon name="pageLines" className="h-5 w-5" />
        {preparing ? "Preparing your life story…" : "Download my life story"}
      </button>
      {error && (
        <p role="status" className="mt-2 text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
