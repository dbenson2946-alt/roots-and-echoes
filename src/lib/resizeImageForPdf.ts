"use client";

// Resizes/re-encodes a photo in the browser before it's embedded in the
// life-story PDF export (§17 of the plan) — full-resolution phone photos
// embedded directly would make for a very large, slow-to-generate PDF.
// Returns a data: URL (JPEG) capped to maxDimension on its longest side.
//
// Relies on createImageBitmap, same as this app's existing modern-browser
// assumptions elsewhere (Web Speech API, MediaRecorder) — supported in all
// current browsers.

export async function resizeImageForPdf(
  sourceUrl: string,
  maxDimension = 1000,
  quality = 0.82
): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Couldn't load photo (${response.status})`);
  const blob = await response.blob();

  if (typeof createImageBitmap !== "function") {
    throw new Error("This browser can't prepare photos for export.");
  }
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas isn't supported in this browser.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close();
  }
}
