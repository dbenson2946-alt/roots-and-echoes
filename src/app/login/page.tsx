import { redirect } from "next/navigation";
import { getResolvedSession, needsOnboarding } from "@/lib/session";
import { MagicLinkForm } from "@/components/MagicLinkForm";

export default async function LoginPage() {
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

      <MagicLinkForm />

      <p className="max-w-md text-base text-[var(--color-text-muted)]">
        No password to remember — we&rsquo;ll email you a secure link. Click it on this
        device to sign in.
      </p>
    </main>
  );
}
