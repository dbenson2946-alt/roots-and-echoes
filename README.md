# Roots & Echoes

A daily-use life-story companion for older adults — Story Time (timeline), Photos & Family (with a family tree), Music, Books, Art, and Games — built with large text, high contrast, and voice input throughout. See the full plan for the "why" behind these choices.

## Visual design: "Warm Keepsake"

The app uses a bespoke, jewel-tone keepsake-book visual style called **Warm Keepsake**: serif display type (Playfair Display for headings, Fraunces for the wordmark's ampersand and italics) paired with the existing accessible sans-serif body text; a single universal rust accent (`--color-primary`) on every primary button and highlight; a hand-drawn line-icon system (`src/components/Icon.tsx`) replacing all emoji; a circular double-ring "medallion" icon badge (`src/components/Medallion.tsx`) marking which mode a piece of content belongs to; and a signature pure-CSS "corner-tick" ornament — four small bracket marks at the corners of every card, built entirely from layered CSS gradients (see `.tile` in `src/app/globals.css`) with no extra markup — applied consistently to every tile, list row, photo, and form throughout the app, including the family tree diagram and all four games. All of the app's original accessibility rules (20px+ base type with the A / A+ / A++ control, 56px+ touch targets, a warm high-contrast fixed-light theme, visible focus rings, read-aloud everywhere) are unchanged — this was a visual restyle only, layered on top of the same accessible foundation.

## What's in this MVP

- **Story Time** — a rotating gentle prompt (drawn from a curated ~100-prompt library across 8 life-area topics, browsable by topic or "Surprise me" — see "Story prompt library" below), type-or-speak capture (Web Speech API dictation), a visual timeline of saved memories, a detail view with read-aloud.
- **Photos & Family** — real photo uploads (falling back to a labeled color tile until an image is added — see "Photos & audio" below), tagging who's in a photo, adding people, and an auto-built family tree diagram grouped by relationship. A person's name/relationship/living-status can be edited or the person removed from the "Family & friends" list on the Photos page, and a photo tag or a whole photo can be removed too — every delete uses an inline "Are you sure?" confirm rather than a popup.
- **Music** — add songs with lyrics, a personal note (voice-capturable), and an optional upload of the actual recording; an **"Ask for a song"** box lets the user type or say an artist/song name and the closest match plays right there; a per-song page has real playback plus a "sing a part of this song" recorder.
- **Books** — add books that were influential or worth recommending, with a voice-capturable note on why it matters. Deliberately minimal (title, author, note) — no ratings or extra fields.
- **Art** — a rotating gentle prompt about influential or memorable art, plus free-form "add a piece" anytime: title, artist, a medium (painting/sculpture/photography/other, each with its own icon), and a voice-capturable note on why it made an impression. Art pieces can optionally be linked back to a Story Time memory.
- **Games** — four pressure-free memory games built entirely from the senior's own saved content, all multiple-choice/tap-based (no drag, no typing required), and never marked "wrong": a tap-to-swap jigsaw puzzle of one of their photos, a "Who's in the Photo?" guessing game, a "Name That Song" lyric-snippet guessing game, and a "Guess the Artwork" title-guessing game. Answers are always revealed warmly ("This one is Grace Whitfield") rather than scored.
- **Activity tracker** — an **Activity** page (linked from Home, next to Settings) for the senior or any caregiver helping them: stat tiles for how much is saved in each category, a simple "added in the last 2 weeks" bar chart, and a chronological feed of every addition across the app, each labeled with who added it and when.
- **Read-aloud voice** — from **Settings**, the account owner picks which voice reads every prompt/memory/lyric aloud throughout the app: Default, two "AI" presets (Warm & Calm, Clear & Bright), or a Custom voice modeled after an uploaded recording (with a required "I have permission to use this voice recording" checkbox). Every preset can be previewed with a "Hear a sample" button before choosing it. See "Read-aloud voice" below for how it's actually implemented.
- **Multi-user** — real accounts via Supabase Auth (magic-link email); each senior's data is private by default, enforced by row-level security in Postgres, not just app logic.
- **Family caregiver access** — a senior invites a family member by email from **Settings**; that person signs in (or signs up, if they're new) and — once they've picked whose story they're helping with — can, if granted "contribute" access, add memories/photos/people/songs/books, always attributed to them, never presented as if the senior wrote it. A senior manages who has access from **Settings**; anyone with access (including view-only) can see the **Activity** page.
- **Accessible by default** — 20px+ base type with an in-app A / A+ / A++ size control, 56px+ touch targets, a warm high-contrast fixed-light theme (no surprise dark mode), a visible focus ring everywhere, and read-aloud on every prompt/transcript/lyrics block.

## Try it locally

1. Create a [Supabase](https://supabase.com) project, then in its SQL editor
   run, **in this order**: `supabase/schema.sql`, then
   `supabase/migration_2_placeholder_fields.sql`, then `supabase/storage.sql`.
2. Copy `.env.example` to `.env.local` and fill in the three values from your
   Supabase project's **Settings → API** page (see comments in that file).
3. ```bash
   npm install
   npm run dev
   ```

Open http://localhost:3000 — you'll land on a real sign-in screen: enter an
email address and click the link Supabase emails you (no password). The very
first sign-in walks you through a one-time **onboarding** step (senior or
caregiver, name, and — for a caregiver — who invited them). There's no seed
data; every account starts empty and everything you add is really saved.

## Project structure

```
src/
  app/                 routes (Next.js App Router) — one folder per page
    actions.ts         all server actions (every write to data goes through here)
    auth/callback/     finishes the magic-link sign-in (exchanges the emailed code
                        for a session)
    onboarding/        first-time profile setup (senior vs. caregiver, name)
  components/          shared UI, including the voice/audio capture widgets
  components/games/    the four Games mode components (jigsaw, photo quiz, song quiz, art quiz)
  lib/
    types.ts           the whole data model, typed
    store.ts           the real Supabase data layer — every function is an
                        async `supabase.from(...)` query, subject to the
                        row-level security policies in supabase/*.sql
    storage.ts         Supabase Storage uploads + signed playback URLs (song
                        audio, the custom voice sample)
    session.ts         resolves the signed-in Supabase Auth user + which
                        senior's story a caregiver is currently helping with
    supabase/          browser & server Supabase clients
  proxy.ts             refreshes the Supabase session cookie on every request
supabase/
  schema.sql                          the base Postgres schema + row-level security
  migration_2_placeholder_fields.sql  placeholder-tile columns + email-based
                                       caregiver invites (run after schema.sql)
  storage.sql                         the `audio`/`photos` Storage buckets + policies
```

## Deployment

This app is deployed against a real Supabase project — there is no mock data
layer to swap out. What's actually needed to run it somewhere real:

1. **A Supabase project**, with all three SQL files in `supabase/` run once,
   in order (see "Try it locally" above). Auth is Supabase's built-in
   passwordless **magic-link email** — nothing else to configure.
2. **Environment variables** (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` — a publishable-type key, safe to expose to
   the browser — and `SITE_URL`, the app's own deployed URL, used
   to build the magic-link redirect) set both locally (`.env.local`) and in
   the hosting provider's project settings.
3. Deploy to **[Vercel](https://vercel.com)** by connecting the GitHub repo
   (or `vercel` from the CLI), with the same three environment variables
   added in the Vercel dashboard.

The Supabase **secret/service-role key is never used anywhere in this app** —
every query runs as the signed-in user through Row Level Security, so the
publishable key is all the running app ever needs.

## Story prompt library

Story Time's rotating prompts (`PROMPTS_BY_CATEGORY` in `src/lib/store.ts`) are a
curated, hand-written library — about a dozen original prompts per life-area
topic (Childhood, Family, Work, Travel, Music, Love, Milestones, Other),
matching the same `MemoryCategory` a saved memory is filed under — rather
than prompts fetched live from the web or generated on the fly by an AI
model at request time. That was a deliberate choice, not a shortcut:

- **Tone control.** Design principle #5 (see the full plan) is "gentle
  prompting, not quizzing" — published reminiscence-therapy question banks
  and general-purpose "interview your parents" lists vary wildly in tone,
  and some read as clinical or list-like. A hand-curated set can be held to
  one consistent, warm voice throughout; a live-fetched one can't be
  reviewed before a senior sees it.
- **Reliability and cost.** A live search or an AI-generated prompt adds an
  external network call (and, for AI generation, a paid API) to a page load
  that currently has none — another thing that can fail, be slow, or cost
  money on every visit. The app is explicit elsewhere (see "Read-aloud
  voice" below) about not faking integrations or adding paid dependencies
  it isn't ready to commit to; the same principle applies here.
- **It's genuinely enough content.** ~100 prompts across 8 topics, each
  avoided once asked before cycling back, is a lot of runway for a daily-use
  app — closer to a resource that runs out in months of daily use than
  something that needs fresh supply on every visit.

The library is easy to grow later exactly like any other file in the repo —
add strings to the relevant array in `PROMPTS_BY_CATEGORY` and redeploy — so
if it starts feeling repetitive, extending it stays a small, low-risk change
rather than standing up a live content pipeline.

## Photos & audio

**Song audio** (via "Add a song" or the upload box on a song's page), the
**custom voice sample** (Settings), and **photos / art-piece images** (via
"Add a photo", "Add a piece of art", or the "Upload picture" box shown on
any photo/art piece that doesn't have one yet) are all real uploads to
private Supabase Storage buckets (`audio` and `photos`); every read gets a
short-lived signed URL generated fresh on each request (see
`src/lib/storage.ts`), so files are durable across restarts and deploys, and
never publicly reachable.

Photo/art image uploads go straight from the browser to Supabase Storage
using a one-time signed upload token (`createImageUploadTicket` in
`src/lib/storage.ts`), instead of through a Server Action — Vercel caps
every function's request body at a hard, non-configurable 4.5MB, and a real
phone photo routinely exceeds that. Song audio and the custom voice sample
are usually smaller and still go through a Server Action (with Next's own
1MB default raised to 4MB in `next.config.ts`), which carries the same risk
for an unusually large file — a candidate for the same signed-URL treatment
later if it comes up in practice.

A photo or art piece with no image yet still falls back to a labeled color
tile (`photos.storage_path` / `art_pieces.image_path` are nullable — the
image is optional, not required) — the same tile shown throughout the app
before real uploads were wired up.

One thing is still deliberately placeholder, flagged as follow-up work
rather than attempted here:

- The "sing a part of this song" and Story Time voice recordings *do* really
  record via your microphone and play back immediately, but only as an
  in-browser blob for the current tab — they aren't uploaded anywhere yet
  (a good next candidate for the same Storage pattern as song audio).

Everything else (memories, people, the family tree, song lyrics/notes, books,
art pieces, caregiver access) is fully saved to Postgres and reflected across
the app right away.

The Photo Jigsaw, "Who's in the Photo?", and "Guess the Artwork" games use
the real uploaded image (its signed URL) when a photo or art piece has one,
and fall back to the same generated placeholder tile
(`placeholderPhotoDataUri` in `lib/ui.ts`) otherwise.

## Read-aloud voice

Real distinct "AI voices" and real voice cloning both need a paid
third-party provider (e.g. [ElevenLabs](https://elevenlabs.io)) with its own
API key — not something this app can do on its own, and not something to
fake with a fabricated integration. Until one is connected:

- **Default**, **Warm & Calm**, and **Clear & Bright** are all synthesized by
  the browser's own [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API),
  differentiated by rate/pitch and (where the browser offers more than one
  voice) which voice from its list is used — see `lib/voicePresets.ts`.
- **Custom voice** lets someone upload an audio recording (with a required
  consent checkbox — "I have permission to use this voice recording"). The
  upload is a real file in the private `audio` Storage bucket (see "Photos &
  audio" above) and selecting it is fully functional end to end, but actual
  playback still uses one of the browser's own voices as a clearly-labeled
  stand-in, not a real clone of the uploaded voice.
- The voice choice is stored on the **senior's account** (`Profile.voicePreference`
  / `Profile.customVoice` in `lib/types.ts`), not in a per-browser cookie like
  text size — so it looks and sounds the same for the senior and any
  caregiver helping them, on any device.

**To wire in real AI voices / real voice cloning:** call the provider's API
from `submitCustomVoice` (and a new preset-preview/synthesis path) instead of
`SpeechSynthesisUtterance`, store the provider's returned voice ID on
`custom_voices.sample_audio_path` or a new column (see `supabase/schema.sql`),
and stream back the generated audio for playback.

## Accessibility notes for anyone extending this

- Don't drop the base 20px font size or the `.btn-lg` minimum touch target.
- Don't reintroduce automatic dark mode — the fixed warm-light theme is a
  deliberate choice for users who can be confused by an interface that
  changes appearance on its own.
- Every new text-entry field should get a `VoiceTextField`, not a plain
  `<textarea>`, so typing is never the only option.
- Every new page reachable from the home screen should go through
  `AppHeader` so Home / text size / log out stay consistent everywhere.

## Full plan

The complete product plan (personas, all four modes, phased roadmap, open
decisions) lives in the "Roots and Echoes" Claude project as `plan.md`.
