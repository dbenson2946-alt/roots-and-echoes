import { redirect } from "next/navigation";
import { confirmSignIn } from "@/app/actions";

/**
 * The destination of the emailed sign-in link (see auth-email-templates in
 * the Supabase dashboard: {{ .SiteURL }}/auth/confirm?token_hash=...&type=email).
 * Deliberately does nothing on the plain page load that a link click (or an
 * automated email-security scanner) triggers — only the explicit button
 * press below calls the server action that actually consumes the one-time
 * token. This is what makes the link itself immune to prefetching.
 */
export default async function ConfirmSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; next?: string }>;
}) {
  const { token_hash: tokenHash, next } = await searchParams;

  if (!tokenHash) {
    redirect("/login?error=auth");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <div>
        <span className="wordmark text-4xl">
          Roots <span className="amp">&amp;</span> Echoes
        </span>
        <div className="eyebrow-rule my-4">
          <span className="line" />
          <span className="diamond" />
          <span className="line" />
        </div>
      </div>

      <p className="max-w-md text-xl text-[var(--color-text-muted)]">
        Almost there — select the button below to finish signing in.
      </p>

      <form action={confirmSignIn}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        {next && <input type="hidden" name="next" value={next} />}
        <button type="submit" className="btn-lg btn-primary">
          Confirm sign-in
        </button>
      </form>
    </main>
  );
}
