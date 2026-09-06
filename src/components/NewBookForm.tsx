"use client";

import { useRef, useTransition } from "react";
import { submitNewBook } from "@/app/actions";
import { VoiceTextField } from "@/components/VoiceTextField";

export function NewBookForm() {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await submitNewBook(formData);
          formRef.current?.reset();
        });
      }}
      className="tile tile-accent-books space-y-5 p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="book-title" className="mb-2 block text-xl font-bold">
            Book title
          </label>
          <input
            id="book-title"
            name="title"
            required
            placeholder="e.g. To Kill a Mockingbird"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
          />
        </div>
        <div>
          <label htmlFor="book-author" className="mb-2 block text-xl font-bold">
            Author (optional)
          </label>
          <input
            id="book-author"
            name="author"
            placeholder="e.g. Harper Lee"
            className="w-full rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
          />
        </div>
      </div>

      <VoiceTextField
        id="book-note"
        name="personalNote"
        label="Why does this book matter to you? — type or speak"
        placeholder="What's it about? Who gave it to you, or who would you recommend it to?"
        rows={4}
      />

      <button type="submit" disabled={pending} className="btn-lg btn-primary w-full sm:w-auto">
        {pending ? "Saving…" : "Save this book"}
      </button>
    </form>
  );
}
