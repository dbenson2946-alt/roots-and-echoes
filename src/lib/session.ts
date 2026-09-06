import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { CurrentSession, Profile } from "./types";
import { getProfile, getGrant, getActiveGrantsForCaregiver } from "./store";

const ACTIVE_SENIOR_COOKIE = "re_active_senior";
const TEXT_SIZE_COOKIE = "re_text_size";

// ---- Real Supabase Auth ----
// Login itself (the magic-link email) and logout are handled directly by
// Supabase Auth via the browser/server clients — see src/app/actions.ts
// (sendMagicLink, signOut) and src/app/auth/callback/route.ts. This module
// is about resolving *who* is signed in and, for a caregiver, which
// senior's story they're currently helping with.

/** The raw Supabase Auth user, or null if no one is signed in. Cheap to
 * call repeatedly — it just reads the session cookie, no network round
 * trip unless the access token needs refreshing (which the middleware
 * already keeps current). */
async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function setActiveSenior(seniorId: string) {
  const store = await cookies();
  store.set(ACTIVE_SENIOR_COOKIE, seniorId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function getActiveSeniorCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_SENIOR_COOKIE)?.value || null;
}

export async function setTextSize(size: "normal" | "large" | "xl") {
  const store = await cookies();
  store.set(TEXT_SIZE_COOKIE, size, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function getTextSize(): Promise<"normal" | "large" | "xl"> {
  const store = await cookies();
  const v = store.get(TEXT_SIZE_COOKIE)?.value;
  return v === "large" || v === "xl" ? v : "normal";
}

/**
 * Resolves the logged-in profile plus, for a caregiver, the senior account
 * they're currently acting on behalf of (if any has been chosen).
 */
export interface ResolvedSession {
  profile: Profile;
  /** the senior account whose data should be shown/edited right now */
  activeSeniorId: string | null;
  /** true if `profile` itself is the senior being viewed (not a caregiver) */
  isSelf: boolean;
}

/** True once someone has a Supabase Auth session but hasn't finished
 * creating their `profiles` row yet — used to route them to /onboarding
 * instead of treating them as logged out. */
export async function needsOnboarding(): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;
  const profile = await getProfile(user.id);
  return !profile;
}

export async function getResolvedSession(): Promise<ResolvedSession | null> {
  const user = await getAuthUser();
  if (!user) return null;
  const profile = await getProfile(user.id);
  if (!profile) return null; // signed in but no profile yet — see needsOnboarding()

  if (profile.role === "senior") {
    return { profile, activeSeniorId: profile.id, isSelf: true };
  }

  // caregiver
  const activeSeniorId = await getActiveSeniorCookie();
  if (activeSeniorId) {
    const grant = await getGrant(profile.id, activeSeniorId);
    if (grant) {
      return { profile, activeSeniorId, isSelf: false };
    }
  }
  return { profile, activeSeniorId: null, isSelf: false };
}

/** For any page that needs an active senior story loaded. Redirects to
 * /login if no one is signed in, to /onboarding if they haven't finished
 * creating their profile, or to /switch-account if a caregiver hasn't
 * chosen which senior's story they're helping with yet. */
export async function requireActiveSession(): Promise<ResolvedSession> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");

  const session = await getResolvedSession();
  if (!session || !session.activeSeniorId) redirect("/switch-account");
  return session;
}

export async function getCaregiverSeniorOptions(caregiverId: string) {
  const grants = await getActiveGrantsForCaregiver(caregiverId);
  const options = await Promise.all(
    grants.map(async (grant) => ({ grant, senior: await getProfile(grant.seniorId) }))
  );
  return options;
}

// Retained for the couple of call sites that still deal with the old
// CurrentSession shape conceptually (none currently do, since real auth
// replaces it) — kept only as a type import elsewhere; safe to ignore.
export type { CurrentSession };
