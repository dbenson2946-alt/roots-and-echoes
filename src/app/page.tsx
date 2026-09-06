import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getProfile, getMemories, getPeople, getSongs, getBooks, getArtPieces } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const session = await requireActiveSession();
  const senior = (await getProfile(session.activeSeniorId!))!;
  const [memories, people, songs, books, art] = await Promise.all([
    getMemories(senior.id),
    getPeople(senior.id),
    getSongs(senior.id),
    getBooks(senior.id),
    getArtPieces(senior.id),
  ]);
  const memoryCount = memories.length;
  const peopleCount = people.length;
  const songCount = songs.length;
  const bookCount = books.length;
  const artCount = art.length;

  return (
    <div className="min-h-screen">
      <AppHeader session={session} showHome={false} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="eyebrow-rule mb-5">
          <span className="line" />
          <span className="diamond" />
          <span className="line" />
        </div>
        <h1 className="text-3xl font-bold sm:text-4xl text-center">
          {greeting()}, <span className="text-accent" style={{ color: "var(--color-primary)" }}>{senior.name.split(" ")[0]}</span>.
        </h1>
        <p className="mt-2 text-xl text-[var(--color-text-muted)] text-center text-accent">
          What would you like to do today?
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/story-time" className="tile mode-tile tile-accent-story">
            <Medallion icon="story" />
            <span className="text-2xl font-bold">Story Time</span>
            <span className="text-lg text-[var(--color-text-muted)]">
              {memoryCount > 0 ? `${memoryCount} memories saved` : "Start your timeline"}
            </span>
          </Link>

          <Link href="/photos" className="tile mode-tile tile-accent-photo">
            <Medallion icon="family" />
            <span className="text-2xl font-bold">Photos &amp; Family</span>
            <span className="text-lg text-[var(--color-text-muted)]">
              {peopleCount > 0 ? `${peopleCount} people in your circle` : "Add your first photo"}
            </span>
          </Link>

          <Link href="/music" className="tile mode-tile tile-accent-music">
            <Medallion icon="music" />
            <span className="text-2xl font-bold">Music</span>
            <span className="text-lg text-[var(--color-text-muted)]">
              {songCount > 0 ? `${songCount} songs saved` : "Tell us about a song"}
            </span>
          </Link>

          <Link href="/books" className="tile mode-tile tile-accent-books">
            <Medallion icon="books" />
            <span className="text-2xl font-bold">Books</span>
            <span className="text-lg text-[var(--color-text-muted)]">
              {bookCount > 0 ? `${bookCount} books saved` : "Tell us about a book"}
            </span>
          </Link>

          <Link href="/art" className="tile mode-tile tile-accent-art">
            <Medallion icon="art" />
            <span className="text-2xl font-bold">Art</span>
            <span className="text-lg text-[var(--color-text-muted)]">
              {artCount > 0 ? `${artCount} pieces saved` : "Tell us about art you love"}
            </span>
          </Link>

          <Link href="/games" className="tile mode-tile tile-accent-games">
            <Medallion icon="games" />
            <span className="text-2xl font-bold">Games</span>
            <span className="text-lg text-[var(--color-text-muted)]">
              Fun little memory games
            </span>
          </Link>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-wrap justify-center gap-x-8 gap-y-3">
          <Link href="/activity" className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4" style={{ textDecorationColor: "var(--color-gold)" }}>
            <Icon name="chart" className="h-5 w-5" style={{ color: "var(--color-gold)" }} /> View activity
          </Link>
          {session.isSelf && (
            <Link href="/settings" className="flex items-center gap-2 text-lg font-semibold underline decoration-2 underline-offset-4" style={{ textDecorationColor: "var(--color-gold)" }}>
              <Icon name="sliders" className="h-5 w-5" style={{ color: "var(--color-gold)" }} /> Account &amp; family access settings
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
