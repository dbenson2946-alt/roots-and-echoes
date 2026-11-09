import Link from "next/link";
import { requireActiveSession } from "@/lib/session";
import { getPeople, getProfile, getGrant } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Medallion } from "@/components/Medallion";
import { Icon } from "@/components/Icon";
import { DownloadFamilyTreeButton } from "@/components/DownloadFamilyTreeButton";
import { FamilyTreeDiagram } from "@/components/FamilyTreeDiagram";
import { buildFamilyTreeStructure, type FamilyTreeStructureNode } from "@/lib/familyTreeStructure";
import { computeFamilyTreeLayout } from "@/lib/familyTreeLayout";
import type { Person } from "@/lib/types";

// Collects every person id in a section, including anyone nested several
// levels deep (e.g. a niece/nephew nested under a specific aunt/uncle) --
// used below to know which ids belong to "Close Friends & Others" so the
// diagram can show their generic relationship label under their name (the
// one section with no heading that already says what the relation is).
function flattenIds(nodes: FamilyTreeStructureNode<Person>[]): string[] {
  return nodes.flatMap((n) => [n.person.id, ...flattenIds(n.children)]);
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
      grandchildren.length +
      friendsOther.length >
    0;

  const peopleById = new Map(people.map((p) => [p.id, p]));
  const friendsOtherIds = new Set(flattenIds(friendsOther));
  const layout = computeFamilyTreeLayout({
    grandparents,
    parentsAndAuntsUncles,
    siblings,
    seniorsSpouse: seniorsSpouseNodes,
    children,
    grandchildren,
    friendsOther,
  });

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
          <div className="tile tile-accent-photo p-8">
            <FamilyTreeDiagram
              layout={layout}
              peopleById={peopleById}
              friendsOtherIds={friendsOtherIds}
              seniorSpouseIds={new Set(seniorsSpouseNodes.map((n) => n.person.id))}
              senior={{ name: senior.name, avatarInitials: senior.avatarInitials, avatarColor: senior.avatarColor }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
