"use client";

// Pre-processes a (possibly non-square) photo onto a square canvas before
// it's handed to the Jigsaw game's slicing math, which assumes a square
// source image. Without this step, a non-square photo gets its width and
// height independently scaled to fill the square puzzle board — stretching
// it — rather than cropped or shrunk proportionally. This fixes that by
// scaling the photo down to fit *within* the square ("contain" semantics,
// same idea as the object-contain CSS fix used elsewhere in the app) and
// filling the leftover space with a tint color, so nothing gets distorted.
//
// Modeled on resizeImageForPdf.ts's canvas pattern (createImageBitmap, draw
// to canvas, read back as a data: URL).

export async function letterboxImageToSquare(
  sourceUrl: string,
  size = 600,
  fillColor = "#ffffff"
): Promise<string> {
  if (typeof createImageBitmap !== "function") {
    throw new Error("This browser can't prepare this photo for the puzzle.");
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Couldn't load photo (${response.status})`);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas isn't supported in this browser.");

    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, size, size);

    const scale = Math.min(size / bitmap.width, size / bitmap.height);
    const drawWidth = bitmap.width * scale;
    const drawHeight = bitmap.height * scale;
    const dx = (size - drawWidth) / 2;
    const dy = (size - drawHeight) / 2;
    ctx.drawImage(bitmap, dx, dy, drawWidth, drawHeight);

    return canvas.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
}
