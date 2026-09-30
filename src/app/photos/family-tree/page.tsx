import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getPeople, getProfile, getGrant } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { DownloadFamilyTreeButton } from "@/components/DownloadFamilyTreeButton";
import { RELATIONSHIP_LABELS } from "@/lib/ui";
import { buildFamilyTreeStructure, type FamilyTreeStructureNode } from "@/lib/familyTreeStructure";
import type { Person } from "@/lib/types";

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

// Sublabel shown under a node: a custom relationshipLabel wins, then "In
// loving memory" for someone marked deceased; a bucket that doesn't already
// say what the relation is (just "Close friends & others") also falls back
// to the generic relationship name.
function personSublabel(person: Person, useRelationshipFallback = false): string | undefined {
  if (person.relationshipLabel) return person.relationshipLabel;
  if (person.livingStatus === "deceased") return "In loving memory";
  return useRelationshipFallback ? RELATIONSHIP_LABELS[person.relationshipToSenior] : undefined;
}

// One node in the tree: a person, paired alongside their spouse/in-law if
// one is on record (Person.spouseId) instead of that spouse only ever
// showing up next to the senior — plus, underneath, any children who were
// assigned specifically to this person or their spouse (Person.parentIds),
// so a grandchild or niece/nephew can nest under the parent they actually
// belong to rather than always landing in the general row for their
// generation. Recurses for however deep the data goes.
function TreeNode({ node, useRelationshipFallback = false }: { node: FamilyTreeStructureNode<Person>; useRelationshipFallback?: boolean }) {
  const { person, spouse, children } = node;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Node name={person.name} initials={person.photoInitials} color={person.photoColor} sublabel={personSublabel(person, useRelationshipFallback)} />
        {spouse && (
          <Node
            name={spouse.name}
            initials={spouse.photoInitials}
            color={spouse.photoColor}
            sublabel={spouse.relationshipLabel || (spouse.livingStatus === "deceased" ? "In loving memory" : `Spouse of ${person.name.split(" ")[0]}`)}
          />
        )}
      </div>
      {children.length > 0 && (
        <div
          className="flex flex-wrap justify-center gap-8 border-t-2 border-dashed pt-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          {children.map((child) => (
            <TreeNode key={child.person.id} node={child} useRelationshipFallback={useRelationshipFallback} />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeRow({ title, nodes }: { title: string; nodes: FamilyTreeStructureNode<Person>[] }) {
  if (nodes.length === 0) return null;
  return (
    <div>
      <p className="mb-3 text-center text-base font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {title}
      </p>
      <div className="flex flex-wrap justify-center gap-10">
        {nodes.map((node) => (
          <TreeNode key={node.person.id} node={node} />
        ))}
      </div>
    </div>
  );
}

export default async function FamilyTreePage() {
  const session = await requireActiveSession();
  const seniorId = session.activeSeniorId!;
  const [senior, people, grant] = await Promise.all([
    getProfile(seniorId),
    getPeople(seniorId),
    session.isSelf ? Promise.resolve(undefined) : getGrant(session.profile.id, seniorId),
  ]);
  if (!senior) throw new Error("Senior profile not found.");
  // Same "contribute" permission required for every export in the app (see
  // §17) — the button is hidden from a view-only caregiver here, and
  // requireContributor() inside the export's server action enforces it
  // again either way.
  const canExportFamilyTree = session.isSelf || grant?.permission === "contribute";

  const sections = buildFamilyTreeStructure(people);
  const sectionByTitle = new Map(sections.map((s) => [s.title, s]));

  const grandparents = sectionByTitle.get("Grandparents")?.nodes ?? [];
  const parentsAndAuntsUncles = sectionByTitle.get("Parents, Aunts & Uncles")?.nodes ?? [];
  // "Siblings & Spouse" mixes two different relations to the senior — split
  // back apart so the senior's own avatar can still sit between them.
  const siblingsAndSpouseNodes = sectionByTitle.get("Siblings & Spouse")?.nodes ?? [];
  const siblings = siblingsAndSpouseNodes.filter((n) => n.person.relationshipToSenior === "sibling");
  const seniorsSpouseNodes = siblingsAndSpouseNodes.filter((n) => n.person.relationshipToSenior === "spouse");
  const children = sectionByTitle.get("Children")?.nodes ?? [];
  const grandchildren = sectionByTitle.get("Grandchildren, Nieces & Nephews")?.nodes ?? [];
  const friendsOther = sectionByTitle.get("Close Friends & Others")?.nodes ?? [];

  const hasAnyFamily =
    grandparents.length +
      parentsAndAuntsUncles.length +
      siblingsAndSpouseNodes.length +
      children.length +
      grandchildren.length >
    0;

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
          <div className="flex flex-wrap items-center gap-3">
            {canExportFamilyTree && <DownloadFamilyTreeButton />}
            <Link href="/photos" className="btn-lg btn-secondary">
              <Icon name="arrowLeft" className="h-5 w-5" /> Back to photos
            </Link>
          </div>
        </div>

        {!hasAnyFamily ? (
          <p className="tile tile-accent-photo p-6 text-xl text-[var(--color-text-muted)]">
            No family connections added yet. Add people from the Photos page and they&rsquo;ll appear
            here, placed by their relationship to {senior.name.split(" ")[0]}.
          </p>
        ) : (
          <div className="tile tile-accent-photo space-y-10 p-8">
            <TreeRow title="Grandparents" nodes={grandparents} />
            <TreeRow title="Parents, Aunts &amp; Uncles" nodes={parentsAndAuntsUncles} />

            <div>
              <p className="mb-3 text-center text-base font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Siblings, {senior.name.split(" ")[0]}, &amp; Spouse
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {siblings.map((node) => (
                  <TreeNode key={node.person.id} node={node} />
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
                {seniorsSpouseNodes.map((node) => (
                  <TreeNode key={node.person.id} node={node} />
                ))}
              </div>
            </div>

            <TreeRow title="Children" nodes={children} />
            <TreeRow title="Grandchildren, Nieces &amp; Nephews" nodes={grandchildren} />
          </div>
        )}

        {friendsOther.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-bold">Close friends &amp; others</h2>
            <div className="tile tile-accent-photo flex flex-wrap justify-center gap-8 p-8">
              {friendsOther.map((node) => (
                <TreeNode key={node.person.id} node={node} useRelationshipFallback />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
