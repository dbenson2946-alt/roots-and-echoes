import { redirect } from "next/navigation";
import { chooseActiveSenior, signOut } from "@/app/actions";
import { getResolvedSession, getCaregiverSeniorOptions } from "@/lib/session";
import { refreshClaimedInvites } from "@/lib/store";

export default async function SwitchAccountPage() {
  const session = await getResolvedSession();
  if (!session) redirect("/login");
  if (session.isSelf) redirect("/");

  // Pick up any caregiver invites that arrived after this account was
  // already created (onboarding only claims what's pending at signup time).
  await refreshClaimedInvites(session.profile.id);

  const options = await getCaregiverSeniorOptions(session.profile.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Hi {session.profile.name.split(" ")[0]},</h1>
        <p className="mt-2 text-xl text-[var(--color-text-muted)]">
          Whose story are you helping with today?
        </p>
      </div>

      {options.length === 0 ? (
        <p className="tile p-6 text-lg">
          You don&rsquo;t have access to anyone&rsquo;s story yet. Ask them to invite you from
          their account settings.
        </p>
      ) : (
        <div className="grid w-full gap-4">
          {options.map(({ grant, senior }) =>
            senior ? (
              <form key={grant.id} action={chooseActiveSenior.bind(null, senior.id)}>
                <button type="submit" className="tile mode-tile w-full !min-h-0 flex-row items-center gap-4 text-left">
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold"
                    style={{ background: senior.avatarColor, color: "#fff" }}
                  >
                    {senior.avatarInitials}
                  </span>
                  <span>
                    <span className="block text-xl font-bold">{senior.name}</span>
                    <span className="block text-base text-[var(--color-text-muted)]">
                      {grant.permission === "contribute" ? "You can add memories, photos & songs" : "View only"}
                    </span>
                  </span>
                </button>
              </form>
            ) : null
          )}
        </div>
      )}

      <form action={signOut}>
        <button type="submit" className="btn-lg btn-secondary">
          Log out
        </button>
      </form>
    </main>
  );
}
