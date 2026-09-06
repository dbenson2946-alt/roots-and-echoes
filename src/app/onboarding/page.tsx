import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { needsOnboarding } from "@/lib/session";
import { OnboardingForm } from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await needsOnboarding())) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <div>
        <span className="wordmark text-3xl">
          Roots <span className="amp">&amp;</span> Echoes
        </span>
        <h1 className="mt-4 text-2xl font-bold">Let&rsquo;s set up your account</h1>
        <p className="mt-2 text-lg text-[var(--color-text-muted)]">
          Signed in as {user.email}
        </p>
      </div>
      <OnboardingForm />
    </main>
  );
}
