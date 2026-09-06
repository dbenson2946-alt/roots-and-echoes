import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getPeople, getProfile } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { RELATIONSHIP_LABELS } from "@/lib/ui";
import type { Person, RelationshipType } from "@/lib/types";

function Node({ name, initials, color, sublabel }: { name: string; initials: string; color: string; sublabel?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span
        className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold shadow-sm border-2"
        style={{ background: color, borderColor: "var(--color-gold)", color: "var(--color-text)" }}
      >
        {initials}
      </span>
      <span className="max-w-[8rem] text-lg font-bold leading-tight font-[family-name:var(--font-display)]">{name}</span>
      {sublabel && <span className="text-sm text-[var(--color-text-muted)] text-accent">{sublabel}</span>}
    </div>
  );
}

function Row({ title, people }: { title: string; people: Person[] }) {
  if (people.length === 0) return null;
  return (
    <div>
      <p className="mb-3 text-center text-base font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {title}
      </p>
      <div className="flex flex-wrap justify-center gap-8">
        {people.map((p) => (
          <Node
            key={p.id}
            name={p.name}
            initials={p.photoInitials}
            color={p.photoColor}
            sublabel={p.relationshipLabel || (p.livingStatus === "deceased" ? "In loving memory" : undefined)}
          />
        ))}
      </div>
    </div>
  );
}

export default async function FamilyTreePage() {
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const [senior, people] = await Promise.all([getProfile(seniorId), getPeople(seniorId)]);
  if (!senior) throw new Error("Senior profile not found.");

  const byRelation = (rel: RelationshipType) => people.filter((p) => p.relationshipToSenior === rel);

  const grandparents = byRelation("grandparent");
  const parentsAndAuntsUncles = [...byRelation("parent"), ...byRelation("aunt_uncle")];
  const siblings = byRelation("sibling");
  const spouse = byRelation("spouse");
  const children = byRelation("child");
  const grandchildren = [...byRelation("grandchild"), ...byRelation("niece_nephew")];
  const friendsOther = byRelation("friend").concat(byRelation("other"));

  const hasAnyFamily =
    grandparents.length + parentsAndAuntsUncles.length + siblings.length + spouse.length + children.length + grandchildren.length > 0;

  return (
    <div className="min-h-screen">
      <AppHeader session={session} />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Medallion icon="tree" accent="var(--color-photo)" />
            <div>
              <h1 className="text-3xl font-bold">{senior.name.split(" ")[0]}&rsquo;s Family Tree</h1>
              <p className="mt-1 text-xl text-[var(--color-text-muted)] text-accent">
                Grows a little every time someone new is added on the Photos page.
              </p>
            </div>
          </div>
          <Link href="/photos" className="btn-lg btn-secondary">
            <Icon name="arrowLeft" className="h-5 w-5" /> Back to photos
          </Link>
        </div>

        {!hasAnyFamily ? (
          <p className="tile tile-accent-photo p-6 text-xl text-[var(--color-text-muted)]">
            No family connections added yet. Add people from the Photos page and they&rsquo;ll appear
            here, placed by their relationship to {senior.name.split(" ")[0]}.
          </p>
        ) : (
          <div className="tile tile-accent-photo space-y-10 p-8">
            <Row title="Grandparents" people={grandparents} />
            <Row title="Parents, Aunts &amp; Uncles" people={parentsAndAuntsUncles} />

            <div>
              <p className="mb-3 text-center text-base font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Siblings, {senior.name.split(" ")[0]}, &amp; Spouse
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {siblings.map((p) => (
                  <Node key={p.id} name={p.name} initials={p.photoInitials} color={p.photoColor} sublabel={p.relationshipLabel} />
                ))}
                <div className="flex flex-col items-center gap-2 text-center">
                  <span
                    className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white shadow border-2"
                    style={{ background: senior.avatarColor, borderColor: "var(--color-gold)" }}
                  >
                    {senior.avatarInitials}
                  </span>
                  <span className="max-w-[8rem] text-lg font-bold leading-tight font-[family-name:var(--font-display)]">{senior.name}</span>
                  <span className="text-sm text-[var(--color-text-muted)] text-accent">You</span>
                </div>
                {spouse.map((p) => (
                  <Node key={p.id} name={p.name} initials={p.photoInitials} color={p.photoColor} sublabel={p.relationshipLabel || "Spouse"} />
                ))}
              </div>
            </div>

            <Row title="Children" people={children} />
            <Row title="Grandchildren, Nieces &amp; Nephews" people={grandchildren} />
          </div>
        )}

        {friendsOther.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-bold">Close friends &amp; others</h2>
            <div className="tile tile-accent-photo flex flex-wrap justify-center gap-8 p-8">
              {friendsOther.map((p) => (
                <Node
                  key={p.id}
                  name={p.name}
                  initials={p.photoInitials}
                  color={p.photoColor}
                  sublabel={p.relationshipLabel || RELATIONSHIP_LABELS[p.relationshipToSenior]}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
