import { redirect } from "next/navigation";
import { getResolvedSession } from "@/lib/session";
import { getActiveGrantsForSenior, getProfile, getPendingInvitesForSenior } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { inviteCaregiverAction, cancelInviteAction, revokeGrantAction, submitVoicePreference } from "@/app/actions";
import { VoicePreviewButton } from "@/components/VoicePreviewButton";
import { NewCustomVoiceForm } from "@/components/NewCustomVoiceForm";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { VOICE_PRESETS } from "@/lib/voicePresets";
import type { VoicePreset } from "@/lib/types";

export default async function SettingsPage() {
  const session = await getResolvedSession();
  if (!session) redirect("/login");
  if (!session.isSelf) redirect("/");

  const [grants, pendingInvites] = await Promise.all([
    getActiveGrantsForSenior(session.profile.id),
    getPendingInvitesForSenior(session.profile.id),
  ]);
  const caregivers = await Promise.all(grants.map((grant) => getProfile(grant.caregiverId)));

  const currentPreset: VoicePreset = session.profile.voicePreference ?? "default";
  const customVoice = session.profile.customVoice;

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-10">
        <div className="flex items-center gap-4">
          <Medallion icon="sliders" />
          <div>
            <h1 className="text-3xl font-bold">Account &amp; family access</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              Choose who can help build your story.
            </p>
          </div>
        </div>

        <section className="tile p-6 space-y-4">
          <h2 className="text-2xl font-bold">People helping with your story</h2>
          {grants.length === 0 ? (
            <p className="text-lg text-[var(--color-text-muted)]">No one has access yet.</p>
          ) : (
            <ul className="space-y-3">
              {grants.map((grant, i) => {
                const caregiver = caregivers[i];
                if (!caregiver) return null;
                return (
                  <li key={grant.id} className="tile tile-compact flex flex-wrap items-center justify-between gap-3">
                    <span className="text-lg">
                      <span className="font-bold">{caregiver.name}</span>{" "}
                      <span className="text-base text-[var(--color-text-muted)]">
                        ({caregiver.relationshipLabel || "family member"}) ·{" "}
                        {grant.permission === "contribute" ? "can add memories, photos & songs" : "view only"}
                      </span>
                    </span>
                    <form action={revokeGrantAction}>
                      <input type="hidden" name="grantId" value={grant.id} />
                      <button type="submit" className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base">
                        Remove access
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="tile p-6 space-y-4">
          <h2 className="text-2xl font-bold">Invite a family member</h2>
          <form action={inviteCaregiverAction} className="grid gap-4 sm:grid-cols-3">
            <input
              name="email"
              type="email"
              required
              placeholder="their email address"
              className="rounded-xl border-2 border-[var(--color-border)] p-3 text-lg sm:col-span-1"
            />
            <select name="permission" defaultValue="contribute" className="rounded-xl border-2 border-[var(--color-border)] p-3 text-lg sm:col-span-1">
              <option value="contribute">Can add memories, photos &amp; songs</option>
              <option value="view_only">Can only view</option>
            </select>
            <button type="submit" className="btn-lg btn-primary sm:col-span-1">
              Invite
            </button>
          </form>
          {pendingInvites.length > 0 && (
            <ul className="space-y-3">
              {pendingInvites.map((invite) => (
                <li key={invite.id} className="tile tile-compact flex flex-wrap items-center justify-between gap-3">
                  <span className="text-lg">
                    <span className="font-bold">{invite.email}</span>{" "}
                    <span className="text-base text-[var(--color-text-muted)]">
                      · invited, waiting for them to sign up ·{" "}
                      {invite.permission === "contribute" ? "can add memories, photos & songs" : "view only"}
                    </span>
                  </span>
                  <form action={cancelInviteAction}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <button type="submit" className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base">
                      Cancel invite
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <p className="text-base text-[var(--color-text-muted)]">
            Access can be removed at any time. Anything a family member adds is always labeled
            with their name, never shown as if you wrote it yourself.
          </p>
        </section>

        <section className="tile p-6 space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Icon name="speaker" className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
            Voice for read-aloud
          </h2>
          <p className="text-lg text-[var(--color-text-muted)]">
            Choose the voice used whenever a prompt, memory, or lyric is read aloud to you.
          </p>
          <ul className="space-y-3">
            {(Object.keys(VOICE_PRESETS) as VoicePreset[]).map((preset) => {
              const meta = VOICE_PRESETS[preset];
              const isCurrent = currentPreset === preset;
              const isCustomLocked = preset === "custom" && !customVoice;
              return (
                <li
                  key={preset}
                  className={`tile tile-compact flex flex-wrap items-center justify-between gap-3 ${
                    isCurrent ? "bg-[var(--color-primary-tint)]" : ""
                  }`}
                >
                  <span className="flex items-center gap-3 text-lg">
                    <Medallion icon={meta.icon} size="sm" />
                    <span>
                      <span className="font-bold">{meta.label}</span>{" "}
                      <span className="text-base text-[var(--color-text-muted)]">
                        {isCustomLocked ? "Upload a recording below to unlock this." : meta.description}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {!isCustomLocked && <VoicePreviewButton preset={preset} />}
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-lg font-bold text-[var(--color-primary)]">
                        <Icon name="check" className="h-5 w-5" /> Selected
                      </span>
                    ) : isCustomLocked ? null : (
                      <form action={submitVoicePreference}>
                        <input type="hidden" name="preset" value={preset} />
                        <button type="submit" className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base">
                          Use this voice
                        </button>
                      </form>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {customVoice && (
            <p className="text-base text-[var(--color-text-muted)]">
              Current custom voice: <span className="font-bold">{customVoice.label}</span>, uploaded{" "}
              {new Date(customVoice.uploadedAt).toLocaleDateString()}.
            </p>
          )}
          <NewCustomVoiceForm hasExisting={Boolean(customVoice)} />
        </section>
      </main>
    </div>
  );
}
