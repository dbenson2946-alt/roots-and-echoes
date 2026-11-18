"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

// "Download the manual (PDF)" on the Help page. The PDF is built in the
// browser from the same content the Help page shows (src/content/
// userManual.ts), so it is never a separate file that can go stale and is
// never publicly reachable — only someone who can open /help (i.e. is
// signed in) can make one. Same dynamic-import pattern as the other PDF
// exports (DownloadFamilyTreeButton.tsx).
export function DownloadManualButton() {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPreparing(true);
    setError(null);
    try {
      const [{ pdf }, { ManualPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/ManualPdfDocument"),
      ]);
      const updatedOn = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const blob = await pdf(<ManualPdfDocument updatedOn={updatedOn} />).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Roots-and-Echoes-user-manual.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't prepare the manual. Please try again.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={preparing} className="btn-lg btn-primary">
        <Icon name="pageLines" className="h-5 w-5" />
        {preparing ? "Preparing the manual…" : "Download the manual (PDF)"}
      </button>
      {error && (
        <p role="status" className="mt-2 text-lg text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
