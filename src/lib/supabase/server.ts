import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads/writes the real Supabase Auth session via cookies, so
 * every query automatically runs as the signed-in user and is subject to
 * the row-level security policies in supabase/schema.sql.
 *
 * Server Components can't write cookies (Next.js only allows that from a
 * Server Action or Route Handler); the try/catch below is the standard
 * @supabase/ssr pattern for tolerating that — the middleware below is what
 * actually keeps the session refreshed for those reads.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore because the
            // middleware refreshes the session on every request anyway.
          }
        },
      },
    }
  );
}
