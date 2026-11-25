"use client";

import { useState } from "react";

/**
 * Saving an invitation does not send an email, so the owner has to tell the
 * person themselves. This builds a ready-to-send note (steps, the address to
 * sign in with, what they will be able to do) and copies it. If the browser
 * won't allow copying, the note is shown so it can be selected by hand.
 */
export function InviteMessageButton({
  email,
  canAdd,
  ownerFirstName,
}: {
  email: string;
  canAdd: boolean;
  ownerFirstName: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");

  function buildMessage() {
    const doing = canAdd ? "add memories, photos and songs" : "read and listen to the story";
    return [
      `Hi! I've invited you to help with my story on Roots & Echoes. You'll be able to ${doing}.`,
      "",
      `1. Open ${window.location.origin}`,
      `2. Sign in with this exact email address: ${email}. The app sends you a code or a link.`,
      `3. The first time, choose "A family member helping someone else". Then pick ${ownerFirstName}'s name when it asks whose story you're helping with.`,
    ].join("\n");
  }

  async function copy() {
    const text = buildMessage();
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("manual");
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={copy} className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base">
        Copy message to send them
      </button>
      <p role="status" className="text-base text-[var(--color-text-muted)]">
        {state === "copied" && "Copied. Paste it into a text or an email to send it yourself."}
      </p>
      {state === "manual" && (
        <textarea
          readOnly
          rows={7}
          value={buildMessage()}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={`Message to send to ${email}`}
          className="w-full rounded-xl border-2 border-[var(--color-border)] p-3 text-base"
        />
      )}
    </div>
  );
}
