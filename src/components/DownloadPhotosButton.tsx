"use client";

import { useState } from "react";
import { getPhotosExportData } from "@/app/actions";
import { resizeImageForPdf } from "@/lib/resizeImageForPdf";
import { Icon } from "@/components/Icon";

// "Download all photos" on the Photos & Family page — second of the
// per-category exports built alongside §17's life-story PDF (§18 of the
// plan). Visible only to the senior or a contribute-permission caregiver
// (gated server-side by the page that renders this, and again by
// requireContributor() inside getPhotosExportData itself).
//
// Every photo with an uploaded image is resized/re-encoded client-side
// first (same helper §17 uses for memory photos), then the whole PDF is
// built entirely in the browser — no photo bytes ever pass through a
// Vercel function.
export function DownloadPhotosButton() {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPreparing(true);
    setError(null);
    try {
      const data = await getPhotosExportData();

      if (data.photos.length === 0) {
        setError("Add a photo first — there's nothing to include yet.");
        return;
      }

      const photosWithResizedImages = await Promise.all(
        data.photos.map(async (photo) => ({
          ...photo,
          imageUrl: photo.imageUrl ? await resizeImageForPdf(photo.imageUrl) : undefined,
        }))
      );

      const [{ pdf }, { PhotosPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/PhotosPdfDocument"),
      ]);

      const generatedOn = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const blob = await pdf(
        <PhotosPdfDocument data={{ ...data, photos: photosWithResizedImages }} generatedOn={generatedOn} />
      ).toBlob();

      const fileDate = new Date().toISOString().slice(0, 10);
      const safeName = data.seniorName.replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-") || "My";
      const filename = `${safeName}-photos-${fileDate}.pdf`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't prepare your photos. Please try again.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={preparing} className="btn-lg btn-secondary">
        <Icon name="pageLines" className="h-5 w-5" />
        {preparing ? "Preparing your photos…" : "Download all photos"}
      </button>
      {error && (
        <p role="status" className="mt-2 text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
