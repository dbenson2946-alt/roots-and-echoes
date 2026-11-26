// A small safety net for Let's Talk. The guides are written ahead of time: they
// are not people and not AI, so they cannot tell how someone is. If a typed or
// spoken answer says the person wants to die or hurt themselves, the guide stops
// asking questions and gives the help line instead of a cheerful reply.

/** The words used wherever the help line is shown (US). */
export const HELP_LINE_SHORT =
  "If you are having a hard time, you can call or text 988 (the Suicide & Crisis Lifeline) at any time. If you are in immediate danger, call 911.";

/** What the guide says when an answer suggests the person may be in distress. */
export const CARE_LEAD =
  "I'm sorry you are carrying something so heavy. I'm only a set of written questions, not a person, so I can't help with this the way someone can.";

export const CARE_BODY =
  "Please tell someone you trust, and know that you can call or text 988 (the Suicide & Crisis Lifeline) at any time. If you are in immediate danger, call 911. When you're ready, we can try a gentler question, or stop here.";

const PATTERNS: RegExp[] = [
  /\bsuicid/i,
  /\bkill(ing)? (myself|me)\b/i,
  /\bend(ing)? (my (own )?life|it all|things)\b/i,
  /\btake my own life\b/i,
  /\b(want|wanna|wish|ready|going|like) to (die|be dead)\b/i,
  /\bwish (i|that i) (was|were) dead\b/i,
  /\bwish i (would|could) (just )?(die|not wake up|disappear)\b/i,
  /\bbetter off (dead|without me)\b/i,
  /\b(don'?t|do not|no longer) want to (live|be alive|be here|go on)\b/i,
  /\bno (reason|point) (to|in) (live|living|go on|going on|being here)\b/i,
  /\b(hurt|harm|cut|injure)(ing)? myself\b/i,
  /\bnot wake up\b/i,
  /\bwould be (easier|better) if i (was|were) (gone|dead)\b/i,
];

/** True when the words suggest wanting to die or to hurt oneself. It leans toward
 * speaking up: a false alarm costs one kind message, a miss costs more. */
export function mentionsSelfHarm(text: string): boolean {
  const t = text.replace(/[’‘]/g, "'");
  return PATTERNS.some((re) => re.test(t));
}
