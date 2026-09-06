import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveSession } from "@/lib/session";
import { getBook } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { Icon } from "@/components/Icon";
import { formatDate } from "@/lib/ui";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireActiveSession();
  const { id } = await params;
  const book = await getBook(id);
  if (!book || book.seniorId !== session.activeSeniorId) notFound();

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link href="/books" className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4">
          <Icon name="arrowLeft" className="h-5 w-5" /> Back to Books
        </Link>

        <div className="tile tile-accent-books space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-bold">{book.title}</h1>
            <p className="text-xl text-[var(--color-text-muted)] text-accent">{book.author || "Author unknown"}</p>
          </div>

          {book.personalNote && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Icon name="thought" className="h-5 w-5" style={{ color: "var(--color-books)" }} /> Why it matters
                </h2>
                <ReadAloudButton text={book.personalNote} />
              </div>
              <p className="text-xl leading-relaxed">{book.personalNote}</p>
            </div>
          )}

          <p className="text-base text-[var(--color-text-muted)]">Added {formatDate(book.recordedAt)}</p>
        </div>
      </main>
    </div>
  );
}
