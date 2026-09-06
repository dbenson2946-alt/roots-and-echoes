import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getBooks } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { NewBookForm } from "@/components/NewBookForm";
import { Medallion } from "@/components/Medallion";
import { formatDate } from "@/lib/ui";

export default async function BooksPage() {
  const session = await requireActiveSession();
  const books = await getBooks(session.activeSeniorId!);

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-10">
        <div className="flex items-center gap-4">
          <Medallion icon="books" accent="var(--color-books)" />
          <div>
            <h1 className="text-3xl font-bold">Books</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              Books that stuck with you, and the ones you&rsquo;d tell someone else to read.
            </p>
          </div>
        </div>

        <section>
          <h2 className="mb-4 text-2xl font-bold">Your books</h2>
          {books.length === 0 ? (
            <p className="tile tile-accent-books p-6 text-xl text-[var(--color-text-muted)]">
              No books yet — add the first one below.
            </p>
          ) : (
            <ul className="space-y-4">
              {books.map((book) => (
                <li key={book.id}>
                  <Link href={`/books/${book.id}`} className="tile tile-compact tile-accent-books flex items-start gap-4 hover:bg-[var(--color-books-tint)]">
                    <Medallion icon="books" size="sm" />
                    <span className="flex-1">
                      <span className="block text-xl font-bold">{book.title}</span>
                      <span className="block text-base text-[var(--color-text-muted)]">
                        {book.author || "Author unknown"} · Added {formatDate(book.recordedAt)}
                      </span>
                      {book.personalNote && (
                        <span className="mt-1 block text-lg text-accent">
                          {book.personalNote.slice(0, 120)}
                          {book.personalNote.length > 120 ? "…" : ""}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold">Add a book</h2>
          <NewBookForm />
        </section>
      </main>
    </div>
  );
}
