import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getResolvedSession } from "@/lib/session";
import { AppHeader } from "@/components/AppHeader";
import { ManualBlocks } from "@/components/ManualContent";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { DownloadManualButton } from "@/components/DownloadManualButton";
import { USER_MANUAL_MARKDOWN, USER_MANUAL_SUBTITLE, USER_MANUAL_TITLE } from "@/content/userManual";
import { parseManual, sectionToSpeech } from "@/lib/userManual";

export const metadata: Metadata = { title: "User manual · Roots & Echoes" };

// The user manual. Signed-in people only — the same gate as every other
// page (proxy.ts only refreshes the session cookie; each page checks for
// itself). Unlike most pages this doesn't need an active senior, so a
// caregiver who hasn't yet chosen whose story to help with can read it too.
export default async function HelpPage() {
  const session = await getResolvedSession();
  if (!session) redirect("/login");

  const sections = parseManual(USER_MANUAL_MARKDOWN);

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-black text-[var(--color-primary)]">
            {USER_MANUAL_TITLE}
          </h1>
          <p className="mt-2 text-xl italic text-[var(--color-text-muted)]">{USER_MANUAL_SUBTITLE}</p>
          <div className="mt-6 flex justify-center">
            <DownloadManualButton />
          </div>
        </div>

        <nav id="contents" aria-label="Contents" className="tile mb-8 scroll-mt-6 p-6">
          <h2 className="text-2xl font-bold">Contents</h2>
          <ol className="mt-3 space-y-1 text-xl">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="inline-block py-1 font-semibold underline decoration-2 underline-offset-4" style={{ textDecorationColor: "var(--color-gold)" }}>
                  {s.number ? `${s.number}. ` : ""}
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="tile scroll-mt-6 p-6 sm:p-8">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <h2 id={`${s.id}-title`} className="font-[family-name:var(--font-display)] text-3xl font-bold">
                  {s.number ? `${s.number}. ` : ""}
                  {s.title}
                </h2>
                <ReadAloudButton text={sectionToSpeech(s)} />
              </div>
              <ManualBlocks blocks={s.blocks} />
              <p className="mt-6 text-base">
                <a href="#contents" className="font-semibold underline decoration-2 underline-offset-4">
                  Back to contents
                </a>
              </p>
            </section>
          ))}
        </div>

        <p className="mt-10 text-center">
          <Link href="/" className="btn-lg btn-secondary">
            Back to Home
          </Link>
        </p>
      </main>
    </div>
  );
}
