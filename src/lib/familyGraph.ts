/**
 * Small pure helpers over the "who is whose parent" links in the family
 * tree. Used to keep the edit forms (and the server) from ever recording a
 * loop — a person can't be their own ancestor.
 *
 * Dependency-free so both client components and server actions can share it.
 */

export interface ParentLinked {
  id: string;
  parentIds: string[];
}

/** Everyone below `personId`: their children, those children's children,
 * and so on. Never includes `personId` itself, and is safe even if bad
 * data already contains a loop. */
export function descendantIdsOf(people: ParentLinked[], personId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const p of people) {
    for (const parentId of p.parentIds) {
      const list = childrenByParent.get(parentId);
      if (list) list.push(p.id);
      else childrenByParent.set(parentId, [p.id]);
    }
  }
  const found = new Set<string>();
  const queue = [personId];
  while (queue.length > 0) {
    const current = queue.pop() as string;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (childId !== personId && !found.has(childId)) {
        found.add(childId);
        queue.push(childId);
      }
    }
  }
  return found;
}

/** The people who may be offered as `personId`'s parent: everyone except
 * themselves and their own descendants. */
export function possibleParentsFor<T extends ParentLinked>(people: T[], personId: string): T[] {
  const blocked = descendantIdsOf(people, personId);
  blocked.add(personId);
  return people.filter((p) => !blocked.has(p.id));
}

/** True if any of `proposedParentIds` is `personId` or one of their
 * descendants — i.e. saving them as parents would create a loop. */
export function wouldCreateParentLoop(people: ParentLinked[], personId: string, proposedParentIds: string[]): boolean {
  const blocked = descendantIdsOf(people, personId);
  blocked.add(personId);
  return proposedParentIds.some((id) => blocked.has(id));
}
