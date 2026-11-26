import Link from "next/link";
import { redirect } from "next/navigation";
import { getResolvedSession } from "@/lib/session";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { DownloadEverythingButton } from "@/components/DownloadEverythingButton";

export default async function DeleteAccountPage() {
  const session = await getResolvedSession();
  if (!session) redirect("/login");
  // This is about the signed-in person's own login, whoever's story they are looking at.
  const isOwner = session.profile.role === "senior";
  const back = isOwner ? "/settings" : "/switch-account";

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <Link href={back} className="text-lg font-semibold underline decoration-2 underline-offset-4">
        Back
      </Link>

      {isOwner ? (
        <section className="tile space-y-4 p-6">
          <h1 className="text-3xl font-bold">Delete my account and everything in it</h1>
          <p className="text-xl">
            This deletes your whole story for good: every memory, photo, person, song, book, piece of art, recording,
            milestone and conversation, and your sign-in. <strong>It can&rsquo;t be undone, and nobody can get it back
            for you.</strong>
          </p>
          <p className="text-lg">
            The people helping you keep their own sign-ins, but they lose access to your story. Nothing of yours stays
            with them.
          </p>
          <div className="space-y-3">
            <p className="text-lg">
              Want to keep a copy first? <strong>Download everything</strong> saves your whole story, with every photo
              and recording, to this device.
            </p>
            <DownloadEverythingButton />
          </div>
          <DeleteAccountForm isOwner />
        </section>
      ) : (
        <section className="tile space-y-4 p-6">
          <h1 className="text-3xl font-bold">Delete my sign-in</h1>
          <p className="text-xl">
            This deletes your sign-in and your name from Roots &amp; Echoes. <strong>It can&rsquo;t be undone.</strong>
          </p>
          <p className="text-lg">
            Memories, photos and anything else you added stay in the stories they belong to, and will show as added by
            the account owner. You will not be able to help with anyone&rsquo;s story again unless they invite you again.
          </p>
          <DeleteAccountForm isOwner={false} />
        </section>
      )}
    </main>
  );
}
