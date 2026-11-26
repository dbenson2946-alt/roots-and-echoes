import { redirect } from "next/navigation";
import { getResolvedSession, needsOnboarding } from "@/lib/session";
import { MagicLinkForm } from "@/components/MagicLinkForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string }> }) {
  const { error, deleted } = await searchParams;
  if (await needsOnboarding()) redirect("/onboarding");
  const session = await getResolvedSession();
  if (session) redirect(session.isSelf || session.activeSeniorId ? "/" : "/switch-account");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-10 px-4 py-12 text-center">
      <div>
        <span className="wordmark text-4xl">
          Roots <span className="amp">&amp;</span> Echoes
        </span>
        <div className="eyebrow-rule my-4">
          <span className="line" />
          <span className="diamond" />
          <span className="line" />
        </div>
        <p className="text-xl text-[var(--color-text-muted)] text-accent">
          A daily companion for sharing and remembering your life story.
        </p>
      </div>

      {deleted && (
        <p role="status" className="tile max-w-md p-5 text-lg font-semibold">
          Your account has been deleted. Thank you for using Roots &amp; Echoes.
        </p>
      )}

      {error && (
        <p role="alert" className="tile max-w-md p-5 text-lg font-semibold text-[var(--color-danger)]">
          That sign-in link didn&rsquo;t work. It may have expired or already been used (some email programs open
          links before you do). Enter your email below to get a new link, and use the code in that email if the link
          fails again.
        </p>
      )}

      <MagicLinkForm />

      <p className="max-w-md text-base text-[var(--color-text-muted)]">
        No password to remember — we&rsquo;ll email you a secure link. Click it on this
        device to sign in.
      </p>
    </main>
  );
}
