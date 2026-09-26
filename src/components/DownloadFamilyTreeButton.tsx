"use client";

import { useState } from "react";
import { getFamilyTreeExportData } from "@/app/actions";
import { Icon } from "@/components/Icon";

// "Download family tree" on the Family Tree page — the first of the
// per-category exports built alongside §17's life-story PDF. Visible only
// to the senior or a contribute-permission caregiver (gated server-side by
// the page that renders this, and again by requireContributor() inside
// getFamilyTreeExportData itself).
//
// No photos involved here, so unlike DownloadLifeStoryButton this needs no
// client-side image resizing step — it's just text, well within any size
// limit, but still built entirely in the browser via a dynamic import of
// @react-pdf/renderer to keep the same pattern (and the same lazy bundle
// cost) as every other PDF export in the app.
export function DownloadFamilyTreeButton() {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPreparing(true);
    setError(null);
    try {
      const data = await getFamilyTreeExportData();

      if (data.people.length === 0) {
        setError("Add someone to your family tree first — there's no one to include yet.");
        return;
      }

      const [{ pdf }, { FamilyTreePdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/FamilyTreePdfDocument"),
      ]);

      const generatedOn = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const blob = await pdf(
        <FamilyTreePdfDocument data={data} generatedOn={generatedOn} />
      ).toBlob();

      const fileDate = new Date().toISOString().slice(0, 10);
      const safeName = data.seniorName.replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-") || "My";
      const filename = `${safeName}-family-tree-${fileDate}.pdf`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't prepare your family tree. Please try again.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={preparing} className="btn-lg btn-secondary">
        <Icon name="pageLines" className="h-5 w-5" />
        {preparing ? "Preparing your family tree…" : "Download family tree"}
      </button>
      {error && (
        <p role="status" className="mt-2 text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
