import Link from "next/link";
import { redirect } from "next/navigation";
import { getResolvedSession } from "@/lib/session";
import { getActiveGrantsForSenior, getProfile, getPendingInvitesForSenior, getConversationSettings } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { inviteCaregiverAction, cancelInviteAction, revokeGrantAction, submitVoicePreference } from "@/app/actions";
import { VoicePreviewButton } from "@/components/VoicePreviewButton";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { VOICE_PRESETS } from "@/lib/voicePresets";
import { ConversationSettingsForm } from "@/components/ConversationSettingsForm";
import { InviteMessageButton } from "@/components/InviteMessageButton";
import { DownloadEverythingButton } from "@/components/DownloadEverythingButton";
import { PERSONAS } from "@/content/conversationLibrary";
import { PERSONA_IDS } from "@/lib/conversation";
import type { VoicePreset } from "@/lib/types";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ invited?: string }> }) {
  const { invited } = await searchParams;
  const session = await getResolvedSession();
  if (!session) redirect("/login");
  if (!session.isSelf) redirect("/");

  const [grants, pendingInvites, talkSettings] = await Promise.all([
    getActiveGrantsForSenior(session.profile.id),
    getPendingInvitesForSenior(session.profile.id),
    getConversationSettings(session.profile.id),
  ]);
  const caregivers = await Promise.all(grants.map((grant) => getProfile(grant.caregiverId)));

  // The "Custom voice" choice is hidden until real voice cloning exists (it
  // used to collect a recording that read-aloud never used). Anyone who had
  // picked it is shown, and read to in, the Default voice.
  const savedPreset: VoicePreset = session.profile.voicePreference ?? "default";
  const currentPreset: VoicePreset = savedPreset === "custom" ? "default" : savedPreset;
  const voiceChoices = (Object.keys(VOICE_PRESETS) as VoicePreset[]).filter((preset) => preset !== "custom");

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
                        {grant.permission === "contribute" ? "can add, edit and delete" : "view only"}
                      </span>
                      {caregiver.email && (
                        <span className="block break-all text-base text-[var(--color-text-muted)]">{caregiver.email}</span>
                      )}
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
              <option value="contribute">Can add, edit and delete</option>
              <option value="view_only">View only</option>
            </select>
            <button type="submit" className="btn-lg btn-primary sm:col-span-1">
              Invite
            </button>
          </form>
          <p className="text-lg text-[var(--color-text-muted)]">
            Saving an invitation <strong className="text-[var(--color-text)]">does not send an email</strong>. Tell them
            yourself: ask them to open the app and sign in with exactly this email address. Their access starts the
            moment they do.
          </p>
          {invited && (
            <p role="status" className="tile tile-accent-talk p-5 text-xl font-semibold">
              Invitation saved. No email has been sent. Use &ldquo;Copy message to send them&rdquo; below, then send it
              to them yourself.
            </p>
          )}
          {pendingInvites.length > 0 && (
            <ul className="space-y-3">
              {pendingInvites.map((invite) => (
                <li key={invite.id} className="tile tile-compact flex flex-wrap items-center justify-between gap-3">
                  <span className="text-lg">
                    <span className="font-bold">{invite.email}</span>{" "}
                    <span className="block text-base text-[var(--color-text-muted)]">
                      Invited. No email was sent: waiting for them to open the app and sign in with this address.
                      {" "}
                      {invite.permission === "contribute" ? "Can add, edit and delete." : "View only."}
                    </span>
                  </span>
                  <div className="flex flex-wrap items-start gap-3">
                    <InviteMessageButton
                      email={invite.email}
                      canAdd={invite.permission === "contribute"}
                      ownerFirstName={session.profile.name.split(" ")[0]}
                    />
                    <form action={cancelInviteAction}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button type="submit" className="btn-lg btn-secondary !min-h-0 !py-2 !px-4 text-base">
                        Cancel invite
                      </button>
                    </form>
                  </div>
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
            {voiceChoices.map((preset) => {
              const meta = VOICE_PRESETS[preset];
              const isCurrent = currentPreset === preset;
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
                        {meta.description}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <VoicePreviewButton preset={preset} />
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-lg font-bold text-[var(--color-primary)]">
                        <Icon name="check" className="h-5 w-5" /> Selected
                      </span>
                    ) : (
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

          <p className="text-base text-[var(--color-text-muted)]">
            These are the reading voices built into your device&rsquo;s browser, so they may sound a little different on
            different devices.
          </p>
        </section>

        <section className="tile p-6 space-y-4">
          <h2 className="text-2xl font-bold">Let&rsquo;s Talk</h2>
          <p className="text-lg text-[var(--color-text-muted)]">
            Friendly, scripted conversations with a guide. The guides are not real people and not AI. Nothing said in a
            conversation becomes a memory unless you choose to save it.
          </p>
          <ConversationSettingsForm
            talkEnabled={talkSettings.talkEnabled}
            helpersReadFull={talkSettings.helpersReadFull}
            personas={PERSONA_IDS.map((id) => ({
              id,
              name: PERSONAS[id].name,
              tagline: PERSONAS[id].tagline,
              enabled: !talkSettings.disabledPersonas.includes(id),
            }))}
          />
        </section>

        <section className="tile space-y-3 p-6">
          <h2 className="text-2xl font-bold">Download everything</h2>
          <p className="text-lg text-[var(--color-text-muted)]">
            A copy of your whole story to keep: your memories, people, songs, books, art, milestones and Let&rsquo;s Talk
            conversations as plain text files, plus every photo and recording. It comes as one or more zip files and can
            take a few minutes if you have many photos and recordings.
          </p>
          <DownloadEverythingButton />
        </section>

        <section className="tile space-y-3 p-6">
          <h2 className="text-2xl font-bold">Delete my account</h2>
          <p className="text-lg text-[var(--color-text-muted)]">
            Deletes your whole story and your sign-in for good. You will be asked to confirm by email first.
          </p>
          <Link href="/delete-account" className="btn-lg btn-secondary inline-flex">
            Delete my account&hellip;
          </Link>
        </section>
      </main>
    </div>
  );
}
