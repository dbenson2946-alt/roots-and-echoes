"use client";

import { useRouter } from "next/navigation";
import {
  submitDeleteArt,
  submitDeleteBook,
  submitDeleteLifeStoryRecording,
  submitDeleteMemory,
  submitDeleteSong,
} from "@/app/actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

const KINDS = {
  memory: { action: submitDeleteMemory, back: "/story-time", question: "Delete this memory for good? This can't be undone." },
  song: { action: submitDeleteSong, back: "/music", question: "Delete this song for good? This can't be undone." },
  book: { action: submitDeleteBook, back: "/books", question: "Delete this book for good? This can't be undone." },
  art: { action: submitDeleteArt, back: "/art", question: "Delete this piece for good? This can't be undone." },
  recording: {
    action: submitDeleteLifeStoryRecording,
    back: "/story-time",
    question: "Delete this recording for good? This can't be undone.",
  },
} as const;

/** The two-step delete confirm on a detail page, then back to the list: the page
 * being looked at no longer exists. Shown only to the owner and to helpers with
 * "Can add, edit and delete" access. */
export function DeleteItemButton({ kind, id }: { kind: keyof typeof KINDS; id: string }) {
  const router = useRouter();
  const k = KINDS[kind];
  return (
    <ConfirmDeleteButton
      action={k.action}
      fields={{ id }}
      idleLabel="Delete"
      confirmQuestion={k.question}
      onDone={() => router.replace(k.back)}
    />
  );
}
