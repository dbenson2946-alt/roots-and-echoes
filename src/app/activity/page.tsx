import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getActivity, getActivityStats, getProfile, getConversationSettings, getTalkRecap } from "@/lib/store";
import { PERSONAS } from "@/content/conversationLibrary";
import { AppHeader } from "@/components/AppHeader";
import { Icon, type IconName } from "@/components/Icon";
import { Medallion } from "@/components/Medallion";
import { ACTIVITY_TYPE_META, formatDate, relativeDayLabel } from "@/lib/ui";

function StatTile({
  href,
  icon,
  value,
  label,
}: {
  href?: string;
  icon: IconName;
  value: string | number;
  label: string;
}) {
  const content = (
    <>
      <Icon name={icon} className="h-8 w-8" style={{ color: "var(--color-primary)" }} />
      <span className="text-3xl font-bold">{value}</span>
      <span className="text-base text-[var(--color-text-muted)]">{label}</span>
    </>
  );
  const className =
    "tile tile-compact flex flex-col items-center gap-1 p-5 text-center" + (href ? " hover:bg-[var(--color-bg)]" : "");
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function ActivityBarChart({ dailyCounts }: { dailyCounts: { date: string; count: number }[] }) {
  const maxCount = Math.max(1, ...dailyCounts.map((d) => d.count));

  return (
    <div className="tile p-6">
      <h2 className="text-2xl font-bold">Added in the last 2 weeks</h2>
      <p className="mb-6 mt-1 text-base text-[var(--color-text-muted)]">
        How many things were added each day.
      </p>
      <div className="flex items-end gap-2 sm:gap-3" style={{ height: "9rem" }}>
        {dailyCounts.map((d, i) => {
          const dateObj = new Date(`${d.date}T00:00:00`);
          const isLast = i === dailyCounts.length - 1;
          const heightPct = d.count > 0 ? Math.max(10, (d.count / maxCount) * 100) : 3;
          const dayLabel = isLast ? "Today" : dateObj.toLocaleDateString(undefined, { weekday: "narrow" });
          return (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              {d.count > 0 && (
                <span className="text-sm font-semibold text-[var(--color-text)]">{d.count}</span>
              )}
              <div
                title={`${dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${d.count} added`}
                className="w-full max-w-[28px] rounded-t-[4px]"
                style={{
                  height: `${heightPct}%`,
                  background: "var(--color-primary)",
                  opacity: d.count > 0 ? 1 : 0.25,
                }}
              />
              <span className="text-xs text-[var(--color-text-muted)]">{dayLabel}</span>
              {(i === 0 || isLast) && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  {dateObj.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function ActivityPage() {
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const [senior, stats, recent, talkSettings, talkRecap] = await Promise.all([
    getProfile(seniorId),
    getActivityStats(seniorId),
    getActivity(seniorId, 25),
    getConversationSettings(seniorId),
    getTalkRecap(seniorId),
  ]);

  // Let's Talk recap, for everyone with access: that conversations happened
  // (never what was said, unless the account owner allows it).
  const allConversations = talkRecap.conversations;
  const recentConversations = { length: talkRecap.conversationsLast14 };
  const sentLast14 = talkRecap.questionsSentLast14;
  const answeredLast14 = talkRecap.questionsAnsweredLast14;
  const recapRows = allConversations.slice(0, 8);
  const showTalkRecap = talkSettings.talkEnabled || allConversations.length > 0 || sentLast14 + answeredLast14 > 0;
  const canOpenTranscript = (startedBy: string) =>
    session.isSelf || startedBy === session.profile.id || talkSettings.helpersReadFull;
  const seniorName = senior!.name;

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-10">
        <div className="flex items-center gap-4">
          <Medallion icon="chart" accent="var(--color-gold)" />
          <div>
            <h1 className="text-3xl font-bold">Activity</h1>
            <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
              What&rsquo;s been added to {seniorName.split(" ")[0]}&rsquo;s story, and how things are going.
            </p>
          </div>
        </div>

        <section>
          <h2 className="mb-4 text-2xl font-bold">At a glance</h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile href="/story-time" icon="story" value={stats.categoryCounts.memories} label="Memories" />
            <StatTile href="/story-time" icon="mic" value={stats.categoryCounts.lifeStoryRecordings} label="Life story recordings" />
            <StatTile href="/life-story-book" icon="timeline" value={stats.categoryCounts.milestones} label="Life Story Book milestones" />
            <StatTile href="/photos" icon="photo" value={stats.categoryCounts.photos} label="Photos" />
            <StatTile href="/photos/family-tree" icon="family" value={stats.categoryCounts.people} label="Family & friends" />
            <StatTile href="/music" icon="music" value={stats.categoryCounts.songs} label="Songs" />
            <StatTile href="/books" icon="books" value={stats.categoryCounts.books} label="Books" />
            <StatTile href="/art" icon="art" value={stats.categoryCounts.art} label="Art pieces" />
            <StatTile icon="pageLines" value={stats.totalItems} label="Total items added" />
            <StatTile
              icon="clock"
              value={stats.lastActivityAt ? relativeDayLabel(stats.lastActivityAt) : "—"}
              label="Last activity"
            />
          </div>
          <p className="mt-4 text-base text-[var(--color-text-muted)]">
            Active on {stats.activeDaysLast30} of the last 30 days.
          </p>
        </section>

        <ActivityBarChart dailyCounts={stats.dailyCounts} />

        {showTalkRecap && (
          <section>
            <h2 className="mb-1 text-2xl font-bold">Let&rsquo;s Talk</h2>
            <p className="mb-4 text-base text-[var(--color-text-muted)]">
              A short recap of the last 2 weeks.{" "}
              {talkSettings.helpersReadFull
                ? "The account owner allows helpers to read conversations."
                : "It shows that conversations happened, not what was said."}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile icon="thought" value={recentConversations.length} label="Conversations" />
              <StatTile icon="note" value={sentLast14} label="Family questions sent" />
              <StatTile icon="check" value={answeredLast14} label="Family questions answered" />
            </div>
            {recapRows.length > 0 && (
              <ul className="mt-4 space-y-3">
                {recapRows.map((c) => {
                  const details = [
                    formatDate(c.startedAt),
                    c.answerCount === 1 ? "1 answer" : `${c.answerCount} answers`,
                    c.topic,
                    c.status === "open" ? "in progress" : c.savedMemoryId ? "saved as a memory" : "not saved",
                  ].filter(Boolean);
                  const body = (
                    <span className="flex-1">
                      <span className="block text-lg font-bold">{PERSONAS[c.persona].name}</span>
                      <span className="block text-base text-[var(--color-text-muted)]">{details.join(" · ")}</span>
                    </span>
                  );
                  return (
                    <li key={c.id}>
                      {canOpenTranscript(c.startedBy) ? (
                        <Link href={`/talk/${c.id}`} className="tile tile-compact flex items-center gap-4 hover:bg-[var(--color-bg)]">
                          <Medallion icon={PERSONAS[c.persona].icon} size="sm" accent="var(--color-talk)" />
                          {body}
                          <Icon name="arrowRight" className="h-5 w-5 text-[var(--color-primary)]" />
                        </Link>
                      ) : (
                        <div className="tile tile-compact flex items-center gap-4">
                          <Medallion icon={PERSONAS[c.persona].icon} size="sm" accent="var(--color-talk)" />
                          {body}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <section>
          <h2 className="mb-4 text-2xl font-bold">Recent activity</h2>
          {recent.length === 0 ? (
            <p className="tile p-6 text-xl text-[var(--color-text-muted)]">
              Nothing added yet — activity will show up here as things are added.
            </p>
          ) : (
            <ul className="space-y-3">
              {recent.map((entry) => {
                const meta = ACTIVITY_TYPE_META[entry.type];
                return (
                  <li key={entry.id} className="tile tile-compact flex items-start gap-4">
                    <Medallion icon={meta.icon} size="sm" />
                    <span className="flex-1">
                      <span className="block text-lg">{entry.summary}</span>
                      <span className="block text-base text-[var(--color-text-muted)]">
                        {meta.section} · {entry.actedBy.name} · {formatDate(entry.occurredAt)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
