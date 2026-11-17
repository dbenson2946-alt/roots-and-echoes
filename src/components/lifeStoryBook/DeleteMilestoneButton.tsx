"use client";

import { useRouter } from "next/navigation";
import { submitDeleteMilestone } from "@/app/actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

/** The usual inline two-step delete confirm (ConfirmDeleteButton), then
 * back to the timeline — the page being looked at no longer exists. */
export function DeleteMilestoneButton({ milestoneId }: { milestoneId: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteButton
      action={submitDeleteMilestone}
      fields={{ milestoneId }}
      idleLabel="Remove"
      confirmQuestion="Remove it from the book?"
      onDone={() => router.replace("/life-story-book")}
    />
  );
}
