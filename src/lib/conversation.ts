/**
 * The "Let's Talk" conversation engine — scripted, no AI, pure and
 * dependency-free so it can be unit-tested with a fixed random source.
 *
 * A conversation is a list of lines (persona questions and the senior's
 * answers). Everything the engine needs to decide what the guide says next
 * is read back from that list, so nothing hidden is kept between turns:
 *
 *   opening  -> the guide greets and asks a first question
 *   answer   -> the guide acknowledges, then asks the next hand-written
 *               follow-up; once those run out it OFFERS another question or
 *               saving ("checkpoint") instead of carrying on by itself
 *   another  -> (the senior asked for a different question) a new question
 *
 * Steering rules from the plan: one question at a time, warm and neutral
 * acknowledgements (never "wrong", never corrects), a choice where a question
 * could feel open, and the senior sets the pace — the guide never forces
 * another question.
 */

import type { IconName } from "@/components/Icon";
import type { MemoryCategory } from "./types";

export type PersonaId = "neighbor" | "biographer" | "grandchild" | "music";
export type Mood = "chat" | "remember" | "play" | "think";
export type ThinkingMove = "recall" | "compare" | "explain" | "choose" | "advise" | "imagine" | "connect";
/** The eight Story Time categories plus four extra conversation lanes. */
export type Lane = MemoryCategory | "thenNow" | "everyday" | "wonder" | "gratitude";

export const PERSONA_IDS: PersonaId[] = ["neighbor", "biographer", "grandchild", "music"];
export const MOODS: Mood[] = ["chat", "remember", "play", "think"];

export interface Persona {
  id: PersonaId;
  name: string;
  /** one warm line for the card */
  tagline: string;
  icon: IconName;
  greetings: string[];
  /** short, warm, neutral acknowledgements — safe after a happy or a sad answer */
  reactions: string[];
  /** said before a brand-new question when the senior asks for another one */
  bridges: string[];
  /** offered when a question's follow-ups run out */
  checkpoints: string[];
  /** offered instead once the conversation has gone on a good while */
  wrapUps: string[];
}

export interface LibraryPrompt {
  id: string;
  persona: PersonaId;
  move: ThinkingMove;
  lane: Lane;
  /** may contain {song} or {person}, filled from the senior's own data */
  text: string;
  /** two or three short answers shown as big buttons; typing is always possible too */
  choices?: string[];
  /** one or two hand-written follow-ups, asked in order */
  followUps: string[];
  /** a personalised prompt: needs one of the senior's own songs, people or photos */
  uses?: "song" | "person" | "livingPerson" | "photo";
}

/** What the senior has saved that personalised prompts can draw on. */
export interface TurnContext {
  songs: { title: string }[];
  /** only photos that have a picture */
  photos: { id: string; label: string }[];
  people: { name: string; living: boolean }[];
}

/** One line of a conversation, as the engine needs to see it. */
export interface HistoryLine {
  author: "persona" | "senior";
  kind: "prompt" | "followup" | "checkpoint" | "answer";
  promptId?: string;
  subject?: string;
  photoId?: string;
  lead?: string;
}

/** What the guide says next — stored as one persona line. */
export interface PersonaTurn {
  kind: "prompt" | "followup" | "checkpoint";
  lead?: string;
  body: string;
  promptId?: string;
  subject?: string;
  photoId?: string;
}

/** Which kind of thinking each mood leans toward, in the order a
 * conversation climbs through them: easy first, harder only while the
 * senior keeps going. */
export const MOOD_MOVES: Record<Mood, ThinkingMove[]> = {
  chat: ["connect", "recall", "choose", "compare"],
  remember: ["recall", "recall", "compare", "connect"],
  play: ["choose", "imagine", "choose", "imagine"],
  think: ["explain", "compare", "advise", "imagine"],
};

export const MOOD_LABELS: Record<Mood, { label: string; blurb: string }> = {
  chat: { label: "Chat", blurb: "Easy, everyday talk" },
  remember: { label: "Remember", blurb: "Look back at the past" },
  play: { label: "Play", blurb: "Light and playful" },
  think: { label: "Think", blurb: "Explain, compare, advise" },
};

export const LANE_LABELS: Record<Lane, string> = {
  childhood: "Childhood",
  family: "Family",
  work: "Work",
  travel: "Travel",
  music: "Music",
  love: "Love",
  milestone: "Milestones",
  other: "Other",
  thenNow: "Then and now",
  everyday: "Everyday life",
  wonder: "Wonder",
  gratitude: "Gratitude and humor",
};

/** Which Story Time category a conversation lane is filed under when saved. */
export function categoryForLane(lane: Lane): MemoryCategory {
  switch (lane) {
    case "childhood":
    case "family":
    case "work":
    case "travel":
    case "music":
    case "love":
    case "milestone":
    case "other":
      return lane;
    default:
      return "other";
  }
}

/** After this many answers the guide suggests wrapping up (still the
 * senior's choice — both buttons stay available). */
export const WRAP_UP_AFTER_ANSWERS = 6;
const MAX_FOLLOW_UPS = 2;

const FALLBACK_PROMPT: LibraryPrompt = {
  id: "fallback-1",
  persona: "neighbor",
  move: "connect",
  lane: "everyday",
  text: "What's something you've been thinking about today?",
  followUps: ["Tell me a little more about that."],
};

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function pickAvoiding(items: string[], avoid: Set<string>, random: () => number): string {
  const fresh = items.filter((i) => !avoid.has(i));
  return pick(fresh.length > 0 ? fresh : items, random);
}

export function fillTokens(text: string, subject: string | undefined): string {
  if (!subject) return text;
  return text.replace(/\{song\}|\{person\}/g, subject);
}

function isAvailable(prompt: LibraryPrompt, ctx: TurnContext): boolean {
  switch (prompt.uses) {
    case "song":
      return ctx.songs.length > 0;
    case "person":
      return ctx.people.length > 0;
    case "livingPerson":
      return ctx.people.some((p) => p.living);
    case "photo":
      return ctx.photos.length > 0;
    default:
      return true;
  }
}

/** Chooses the subject a personalised prompt will be about. */
function chooseSubject(
  prompt: LibraryPrompt,
  ctx: TurnContext,
  random: () => number
): { subject?: string; photoId?: string } {
  switch (prompt.uses) {
    case "song":
      return { subject: pick(ctx.songs, random).title };
    case "person":
      return { subject: pick(ctx.people, random).name };
    case "livingPerson":
      return { subject: pick(ctx.people.filter((p) => p.living), random).name };
    case "photo": {
      const photo = pick(ctx.photos, random);
      return { subject: photo.label, photoId: photo.id };
    }
    default:
      return {};
  }
}

/** Picks the next brand-new question: the mood's current kind of thinking
 * first, a question this person hasn't been asked before, and never one
 * already used in this conversation. Falls back gradually rather than ever
 * running dry. */
export function pickPrompt(args: {
  persona: PersonaId;
  mood: Mood;
  library: LibraryPrompt[];
  ctx: TurnContext;
  /** prompt ids asked in earlier conversations */
  usedPromptIds: Set<string>;
  /** prompt ids already asked in this conversation */
  askedHere: Set<string>;
  /** how many new questions have been asked so far in this conversation */
  questionsAsked: number;
  random: () => number;
}): LibraryPrompt {
  const { persona, mood, library, ctx, usedPromptIds, askedHere, questionsAsked, random } = args;
  const order = MOOD_MOVES[mood];
  const wantMove = order[questionsAsked % order.length];

  const mine = library.filter((p) => p.persona === persona && isAvailable(p, ctx) && !askedHere.has(p.id));
  const fresh = mine.filter((p) => !usedPromptIds.has(p.id));

  for (const pool of [fresh, mine]) {
    const onMove = pool.filter((p) => p.move === wantMove);
    if (onMove.length > 0) return pick(onMove, random);
    if (pool.length > 0) return pick(pool, random);
  }
  return FALLBACK_PROMPT;
}

function questionsAskedIn(history: HistoryLine[]): number {
  return history.filter((h) => h.author === "persona" && h.kind === "prompt").length;
}

function leadsIn(history: HistoryLine[]): Set<string> {
  return new Set(history.map((h) => h.lead).filter((l): l is string => Boolean(l)));
}

function startPrompt(
  prompt: LibraryPrompt,
  lead: string | undefined,
  ctx: TurnContext,
  random: () => number
): PersonaTurn {
  const { subject, photoId } = chooseSubject(prompt, ctx, random);
  return {
    kind: "prompt",
    lead,
    body: fillTokens(prompt.text, subject),
    promptId: prompt.id,
    subject,
    photoId,
  };
}

/** The guide's first line: a greeting and a first question. */
export function openingTurn(args: {
  persona: Persona;
  mood: Mood;
  library: LibraryPrompt[];
  ctx: TurnContext;
  usedPromptIds: Set<string>;
  random?: () => number;
}): PersonaTurn {
  const random = args.random ?? Math.random;
  const prompt = pickPrompt({
    persona: args.persona.id,
    mood: args.mood,
    library: args.library,
    ctx: args.ctx,
    usedPromptIds: args.usedPromptIds,
    askedHere: new Set(),
    questionsAsked: 0,
    random,
  });
  return startPrompt(prompt, pick(args.persona.greetings, random), args.ctx, random);
}

/** What the guide says after the senior answers (`answer`) or asks for a
 * different question (`another`). */
export function nextTurn(args: {
  persona: Persona;
  mood: Mood;
  library: LibraryPrompt[];
  history: HistoryLine[];
  ctx: TurnContext;
  usedPromptIds: Set<string>;
  intent: "answer" | "another";
  random?: () => number;
}): PersonaTurn {
  const random = args.random ?? Math.random;
  const { persona, history, library, ctx } = args;
  const leadsSoFar = leadsIn(history);

  if (args.intent === "another") {
    const askedHere = new Set(history.map((h) => h.promptId).filter((id): id is string => Boolean(id)));
    const prompt = pickPrompt({
      persona: persona.id,
      mood: args.mood,
      library,
      ctx,
      usedPromptIds: args.usedPromptIds,
      askedHere,
      questionsAsked: questionsAskedIn(history),
      random,
    });
    return startPrompt(prompt, pickAvoiding(persona.bridges, leadsSoFar, random), ctx, random);
  }

  // intent === "answer": find the question being answered
  const lastPersona = [...history].reverse().find((h) => h.author === "persona");
  const promptId = lastPersona?.promptId;
  const prompt = promptId ? library.find((p) => p.id === promptId) : undefined;
  const reaction = pickAvoiding(persona.reactions, leadsSoFar, random);

  if (prompt && lastPersona && lastPersona.kind !== "checkpoint") {
    const followUpsAsked = history.filter((h) => h.author === "persona" && h.kind === "followup" && h.promptId === prompt.id).length;
    if (followUpsAsked < Math.min(prompt.followUps.length, MAX_FOLLOW_UPS)) {
      return {
        kind: "followup",
        lead: reaction,
        body: fillTokens(prompt.followUps[followUpsAsked], lastPersona.subject),
        promptId: prompt.id,
        subject: lastPersona.subject,
        photoId: lastPersona.photoId,
      };
    }
  }

  const answers = history.filter((h) => h.author === "senior").length;
  const pool = answers >= WRAP_UP_AFTER_ANSWERS ? persona.wrapUps : persona.checkpoints;
  return { kind: "checkpoint", lead: reaction, body: pickAvoiding(pool, new Set(), random) };
}

// ---- Stored shapes (see supabase/migration_15_conversations.sql) ----

export interface Conversation {
  id: string;
  seniorId: string;
  startedBy: string;
  persona: PersonaId;
  mood: Mood;
  status: "open" | "finished";
  savedMemoryId?: string;
  startedAt: string;
  finishedAt?: string;
  /** recap numbers, readable by every helper (the words are not) */
  answerCount: number;
  topic?: string;
}

export interface ConversationMessage extends HistoryLine {
  id: string;
  conversationId: string;
  body: string;
  enteredBy?: string;
  createdAt: string;
}

export interface ConversationSettings {
  talkEnabled: boolean;
  disabledPersonas: PersonaId[];
  /** helpers with access (not only the one who ran it) may read full conversations */
  helpersReadFull: boolean;
}

export const DEFAULT_CONVERSATION_SETTINGS: ConversationSettings = {
  talkEnabled: true,
  disabledPersonas: [],
  helpersReadFull: false,
};

/** A question a family helper sends to the senior (migration 17). */
export interface FamilyQuestion {
  id: string;
  seniorId: string;
  askedBy: string;
  askerName: string;
  body: string;
  photoId?: string;
  status: "waiting" | "answered" | "skipped";
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  seenByAsker: boolean;
  savedMemoryId?: string;
  createdAt: string;
}

export function isPersonaId(value: unknown): value is PersonaId {
  return typeof value === "string" && (PERSONA_IDS as string[]).includes(value);
}

export function isMood(value: unknown): value is Mood {
  return typeof value === "string" && (MOODS as string[]).includes(value);
}
