import Link from "next/link";
import { changeTextSize, signOut } from "@/app/actions";
import { getTextSize, type ResolvedSession } from "@/lib/session";
import { getProfile } from "@/lib/store";
import { Icon } from "@/components/Icon";

export async function AppHeader({
  session,
  showHome = true,
}: {
  session: ResolvedSession;
  showHome?: boolean;
}) {
  const senior =
    !session.isSelf && session.activeSeniorId ? await getProfile(session.activeSeniorId) : null;
  const textSize = await getTextSize();

  return (
    <header className="border-b-2 border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {showHome ? (
            <Link
              href="/"
              className="btn-lg btn-secondary !min-h-[3rem] !py-2 !px-4 text-lg"
              aria-label="Go to Home"
            >
              <Icon name="home" className="h-5 w-5" /> Home
            </Link>
          ) : (
            <span className="wordmark text-2xl">
              Roots <span className="amp">&amp;</span> Echoes
            </span>
          )}
          {senior && (
            <span className="rounded-full bg-[var(--color-music-tint)] px-4 py-2 text-base font-semibold">
              Helping with {senior.name}&rsquo;s story
              <Link href="/switch-account" className="ml-2 underline decoration-2 underline-offset-2">
                Switch
              </Link>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <TextSizeControl current={textSize} />
          <form action={signOut}>
            <button type="submit" className="btn-lg btn-secondary !min-h-[3rem] !py-2 !px-4 text-lg">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function TextSizeControl({ current }: { current?: "normal" | "large" | "xl" } = {}) {
  return (
    <div className="flex items-center gap-1 rounded-full border-2 border-[var(--color-border)] p-1" role="group" aria-label="Text size">
      {(["normal", "large", "xl"] as const).map((size) => {
        const active = current === size;
        return (
          <form key={size} action={changeTextSize}>
            <input type="hidden" name="size" value={size} />
            <button
              type="submit"
              className={`rounded-full px-3 py-1.5 font-bold transition-colors ${
                active
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-primary-tint)]"
              }`}
              style={{ fontSize: size === "normal" ? "1rem" : size === "large" ? "1.2rem" : "1.4rem" }}
              aria-label={`Text size: ${size}`}
              title={`Text size: ${size}`}
            >
              A
            </button>
          </form>
        );
      })}
    </div>
  );
}
