import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Finishes the magic-link sign-in: Supabase redirects the clicked email
 * link here with a one-time `code`, which is exchanged for a real session
 * (written to cookies by the server client). From there, the middleware
 * and src/lib/session.ts take over — a brand new user lands on
 * /onboarding (no profiles row yet), everyone else lands on `next`/home.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
