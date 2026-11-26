// The hand-written content behind "Let's Talk": four scripted guides (the
// personas) and their prompt library. Nothing here is AI — every question,
// follow-up and acknowledgement is written by hand, in keeping with the
// app's no-surprises policy (plan §2.5): warm, never a quiz, never marks an
// answer wrong, never corrects, one question at a time, a choice where a
// question could feel open-ended.
//
// To add or change prompts, edit this file only. Keep to these rules:
//   - `id` is permanent (it is how the app remembers what was already asked);
//     never reuse or renumber an id.
//   - Short sentences. One question per line. No "why" pile-ups.
//   - Follow-ups (one or two) ask for a detail, a person or a feeling — not
//     for a reason the senior must justify.
//   - `choices` (two or three) become big buttons; typing is always allowed.
//   - {song} and {person} are filled from the senior's own saved songs and
//     family tree; set `uses` so the prompt is only offered when they exist.
//   - Acknowledgements must read well after a sad answer as well as a happy
//     one ("Thank you for telling me that" — not "How wonderful!").

import type { LibraryPrompt, Persona, PersonaId } from "@/lib/conversation";

export const PERSONAS: Record<PersonaId, Persona> = {
  neighbor: {
    id: "neighbor",
    name: "The Neighbor",
    tagline: "Easy, friendly everyday chat.",
    icon: "home",
    greetings: [
      "Well, hello! Pull up a chair.",
      "Good to see you. I was hoping we could chat.",
      "Hello there. Let's visit for a few minutes.",
    ],
    reactions: [
      "Thank you for telling me that.",
      "I'm glad you shared that.",
      "That's good to know.",
      "I can picture that.",
      "Take all the time you like.",
      "Thanks for letting me in on that.",
    ],
    bridges: ["Of course. Let's try another.", "No trouble at all. Here's a different one.", "Sure thing. How about this?"],
    checkpoints: [
      "Would you like another question, or shall we save what you've said?",
      "We can keep chatting, or I can help you save this. Which would you like?",
      "Another question, or shall we put this away safely?",
    ],
    wrapUps: [
      "That was a lovely long visit. Shall we save the best of it?",
      "I've enjoyed this. Would you like to save what we talked about?",
      "What a good chat. Shall we keep it safe in a memory?",
    ],
  },
  biographer: {
    id: "biographer",
    name: "The Biographer",
    tagline: "Gentle questions about your memories and photos.",
    icon: "story",
    greetings: [
      "I'm glad you're here. I'd love to hear one of your stories.",
      "Hello. Let's look back together, at whatever pace suits you.",
      "Welcome. Your stories are worth keeping, so let's begin with one.",
    ],
    reactions: [
      "Thank you for telling me that.",
      "That's a detail worth keeping.",
      "I'm glad you shared that.",
      "I can see why that stayed with you.",
      "That helps me picture it.",
      "I appreciate you telling me.",
    ],
    bridges: ["Of course. Let's turn to something else.", "Happy to. Here's another place to start.", "That's fine. How about this one?"],
    checkpoints: [
      "Would you like another question, or shall we save what you've told me?",
      "We can go on, or I can help you save this story. Which would you prefer?",
      "Another question, or shall we keep this as a memory?",
    ],
    wrapUps: [
      "You've told me a good deal. Shall we save the best of it as a memory?",
      "That's a lot of good material. Would you like to keep it as a memory?",
      "Thank you for all of this. Shall we save it now?",
    ],
  },
  grandchild: {
    id: "grandchild",
    name: "The Curious Grandchild",
    tagline: "Asks you to explain, teach and imagine.",
    icon: "sparkle",
    greetings: [
      "Hi! I've been wondering about something. Can you help me?",
      "Hello! I have a few things I'd love your help with.",
      "Hi there! You know so much. May I ask you something?",
    ],
    reactions: [
      "Thank you, that's really helpful.",
      "I didn't know that. Thank you.",
      "Thank you for answering.",
      "That's good to know.",
      "I'm glad you told me.",
      "I'm listening.",
    ],
    bridges: ["Sure! I have another one.", "Okay, let me think of a different one.", "Of course. Here's something else."],
    checkpoints: [
      "Want me to ask another, or should we save what you've taught me?",
      "I could ask more, or we could save this. What do you think?",
      "Another question, or shall we keep what you've said?",
    ],
    wrapUps: [
      "You've taught me so much today. Shall we save it?",
      "That was great. Want to keep the best parts as a memory?",
      "I could listen all day. Shall we save this one?",
    ],
  },
  music: {
    id: "music",
    name: "The Music Companion",
    tagline: "Talks about the songs you love.",
    icon: "music",
    greetings: [
      "Hello! Let's talk about a tune or two.",
      "Hi there. Shall we talk about music?",
      "Welcome. Songs hold so many memories, so let's start with one.",
    ],
    reactions: [
      "Thank you for telling me that.",
      "Songs can hold a lot, can't they?",
      "I'm glad you shared that.",
      "That's good to know.",
      "Thank you for that.",
      "Thanks for telling me.",
    ],
    bridges: ["Of course. Here's a different tune to talk about.", "Sure. Let's try another.", "No problem. How about this?"],
    checkpoints: [
      "Another question, or shall we save what you've said?",
      "We can keep talking music, or save this. Which would you like?",
      "Would you like one more, or shall we keep this as a memory?",
    ],
    wrapUps: [
      "That was a fine long talk. Shall we save it?",
      "Thank you for all of that. Would you like to keep it as a memory?",
      "What a lovely conversation. Shall we save it?",
    ],
  },
};

// ---------------------------------------------------------------------
// The prompt library. Ids: nb = Neighbor, bio = Biographer,
// gc = Curious Grandchild, mu = Music Companion.
// ---------------------------------------------------------------------

export const PROMPT_LIBRARY: LibraryPrompt[] = [
  // ===== The Neighbor: easy, everyday chat =====
  {
    id: "nb-01", persona: "neighbor", move: "connect", lane: "everyday",
    text: "What was the best part of your morning today?",
    followUps: ["What made it a good one?", "Is that how most of your mornings go?"],
  },
  {
    id: "nb-02", persona: "neighbor", move: "connect", lane: "everyday",
    text: "Is there something you're looking forward to this week?",
    followUps: ["Tell me a little more about it.", "Who will be there with you?"],
  },
  {
    id: "nb-03", persona: "neighbor", move: "connect", lane: "gratitude",
    text: "What's one small thing that made you smile lately?",
    followUps: ["Where were you when it happened?", "Would you tell someone else about it?"],
  },
  {
    id: "nb-04", persona: "neighbor", move: "connect", lane: "gratitude",
    text: "What's something you're thankful for today?",
    followUps: ["How long has that been part of your life?"],
  },
  {
    id: "nb-05", persona: "neighbor", move: "connect", lane: "family", uses: "livingPerson",
    text: "Would you like to call or write to {person} soon? (If that isn't a good question today, tap Ask me something else.)",
    followUps: ["What would you like to tell them?", "When did you last talk?"],
  },
  {
    id: "nb-06", persona: "neighbor", move: "recall", lane: "childhood",
    text: "What did your neighborhood look like when you were growing up?",
    followUps: ["Who lived nearby that you remember?", "What was the best spot on your street?"],
  },
  {
    id: "nb-07", persona: "neighbor", move: "recall", lane: "everyday",
    text: "Who was the first neighbor you remember?",
    followUps: ["What were they like?", "Did you ever visit their home?"],
  },
  {
    id: "nb-08", persona: "neighbor", move: "recall", lane: "family",
    text: "What was a typical Sunday like when you were young?",
    followUps: ["What did the house smell like?", "Who was usually there?"],
  },
  {
    id: "nb-09", persona: "neighbor", move: "recall", lane: "childhood",
    text: "What did you do after school when you were a child?",
    followUps: ["Who did you spend that time with?", "Where did you go?"],
  },
  {
    id: "nb-10", persona: "neighbor", move: "recall", lane: "everyday",
    text: "What was the corner store or the local shop like, where you grew up?",
    followUps: ["What would you buy there?", "Who ran it?"],
  },
  {
    id: "nb-11", persona: "neighbor", move: "compare", lane: "thenNow",
    text: "What's the biggest difference between how you shopped for groceries then and now?",
    followUps: ["Which way did you like better?", "What did you miss when it changed?"],
  },
  {
    id: "nb-12", persona: "neighbor", move: "compare", lane: "thenNow",
    text: "How did people keep in touch when you were younger, compared with now?",
    followUps: ["What was it like to get a letter or a call?", "Which do you prefer?"],
  },
  {
    id: "nb-13", persona: "neighbor", move: "compare", lane: "family",
    text: "How is a family meal today different from the ones you remember?",
    followUps: ["What did you eat together?", "Who sat where at the table?"],
  },
  {
    id: "nb-14", persona: "neighbor", move: "compare", lane: "thenNow",
    text: "How has your street or town changed over the years?",
    followUps: ["What's gone that you miss?", "What's new that you like?"],
  },
  {
    id: "nb-15", persona: "neighbor", move: "choose", lane: "everyday",
    text: "Which sounds better to you: a quiet morning with a hot drink, or a walk outside?",
    choices: ["A quiet morning", "A walk outside"],
    followUps: ["Tell me what that looks like for you."],
  },
  {
    id: "nb-16", persona: "neighbor", move: "choose", lane: "family",
    text: "Would you rather have a big family dinner or a small one with a couple of friends?",
    choices: ["A big family dinner", "Small and cozy"],
    followUps: ["What's the best dinner like that you remember?"],
  },
  {
    id: "nb-17", persona: "neighbor", move: "choose", lane: "gratitude",
    text: "For a rainy afternoon, which would you pick?",
    choices: ["A good book", "An old movie", "A nap"],
    followUps: ["What would you read, watch, or dream about?"],
  },
  {
    id: "nb-18", persona: "neighbor", move: "imagine", lane: "wonder",
    text: "Of all the neighbors you've known, who would you most enjoy sitting down with for an afternoon?",
    followUps: ["What would you two do?", "What would you want to ask them?"],
  },
  {
    id: "nb-19", persona: "neighbor", move: "imagine", lane: "everyday",
    text: "If you could add one room to your home, what would it be?",
    followUps: ["What would you put in it?"],
  },
  {
    id: "nb-20", persona: "neighbor", move: "imagine", lane: "gratitude",
    text: "If someone gave you a free afternoon, how would you spend it?",
    followUps: ["Who would you want along?"],
  },
  {
    id: "nb-21", persona: "neighbor", move: "explain", lane: "everyday",
    text: "How do you like to make a really good cup of tea or coffee?",
    followUps: ["Who taught you to make it that way?", "What's your favorite cup to drink it from?"],
  },
  {
    id: "nb-22", persona: "neighbor", move: "explain", lane: "everyday",
    text: "What's your favorite simple dish to cook, and how do you make it?",
    followUps: ["Where did you learn it?", "Who do you like to cook it for?"],
  },
  {
    id: "nb-23", persona: "neighbor", move: "advise", lane: "everyday",
    text: "A new neighbor just moved in next door. What would you tell them about the area?",
    followUps: ["What would you tell them to be sure to see?"],
  },
  {
    id: "nb-24", persona: "neighbor", move: "advise", lane: "gratitude",
    text: "What's a small kindness you'd recommend to anyone who wants to be a good neighbor?",
    followUps: ["Has anyone done that for you?"],
  },
  {
    id: "nb-25", persona: "neighbor", move: "connect", lane: "family", uses: "livingPerson",
    text: "Tell me something about {person}. What's the first thing that comes to mind?",
    followUps: ["What do you enjoy most about {person}?", "What do the two of you like to do together?"],
  },

  // ===== The Biographer: gentle questions about memories and photos =====
  {
    id: "bio-01", persona: "biographer", move: "recall", lane: "childhood",
    text: "What's your earliest memory?",
    followUps: ["Who was with you?", "What do you remember seeing or hearing?"],
  },
  {
    id: "bio-02", persona: "biographer", move: "recall", lane: "childhood",
    text: "What was the kitchen like at your grandmother's house?",
    followUps: ["What would she be cooking?", "What did the room smell like?"],
  },
  {
    id: "bio-03", persona: "biographer", move: "recall", lane: "childhood",
    text: "What was your favorite place to play as a child?",
    followUps: ["Who played there with you?", "What did you play?"],
  },
  {
    id: "bio-04", persona: "biographer", move: "recall", lane: "childhood",
    text: "What was a normal school day like for you?",
    followUps: ["What do you remember about your teacher?", "What did you bring for lunch?"],
  },
  {
    id: "bio-05", persona: "biographer", move: "recall", lane: "work",
    text: "What was your very first job?",
    followUps: ["How did you get it?", "What did you learn there?"],
  },
  {
    id: "bio-06", persona: "biographer", move: "recall", lane: "work",
    text: "Tell me about a coworker you remember well.",
    followUps: ["What were they like to work with?", "Did you keep in touch?"],
  },
  {
    id: "bio-07", persona: "biographer", move: "recall", lane: "love",
    text: "How did you meet someone special in your life?",
    followUps: ["What do you remember about that first day?", "What was the first thing you noticed?"],
  },
  {
    id: "bio-08", persona: "biographer", move: "recall", lane: "travel",
    text: "What's a trip you'll never forget?",
    followUps: ["Who traveled with you?", "What's the first thing you remember seeing?"],
  },
  {
    id: "bio-09", persona: "biographer", move: "recall", lane: "milestone",
    text: "Tell me about a day when your life took a new direction.",
    followUps: ["What was that day like from the start?", "Who was with you?"],
  },
  {
    id: "bio-10", persona: "biographer", move: "recall", lane: "family",
    text: "What did your family do together on holidays?",
    followUps: ["Who came to the table?", "What food do you remember?"],
  },
  {
    id: "bio-11", persona: "biographer", move: "recall", lane: "family",
    text: "What's a family tradition you remember from when you were small?",
    followUps: ["Who kept it going?", "Does anyone still do it?"],
  },
  {
    id: "bio-12", persona: "biographer", move: "compare", lane: "thenNow",
    text: "How is the town you grew up in different from the way it is today?",
    followUps: ["What building or place do you miss most?"],
  },
  {
    id: "bio-13", persona: "biographer", move: "compare", lane: "family",
    text: "How are you like your parents, and how are you different? (If that's hard to think about, tap Ask me something else.)",
    followUps: ["What did you get from your mother or father that you're glad of?"],
  },
  {
    id: "bio-14", persona: "biographer", move: "compare", lane: "milestone",
    text: "How did you feel at the start of a big change in your life, compared with how you felt at the end? (You can tap Ask me something else if you'd rather not.)",
    followUps: ["What helped you get through it?"],
  },
  {
    id: "bio-15", persona: "biographer", move: "explain", lane: "work",
    text: "What did you need to know to do your work well?",
    followUps: ["Who taught you?", "What would you tell a beginner?"],
  },
  {
    id: "bio-16", persona: "biographer", move: "explain", lane: "childhood",
    text: "What game did you play as a child? How did it work?",
    followUps: ["Who was best at it?", "What were the rules everyone argued about?"],
  },
  {
    id: "bio-17", persona: "biographer", move: "choose", lane: "travel",
    text: "Looking back, which was more you?",
    choices: ["The open road", "Home sweet home"],
    followUps: ["Tell me about a time that showed it."],
  },
  {
    id: "bio-18", persona: "biographer", move: "choose", lane: "childhood",
    text: "Which did you love more as a child?",
    choices: ["Summer days", "Winter evenings"],
    followUps: ["What would a perfect one of those days look like?"],
  },
  {
    id: "bio-19", persona: "biographer", move: "advise", lane: "work",
    text: "What advice would you give someone starting the kind of work you did?",
    followUps: ["What do you wish you'd known at the start?"],
  },
  {
    id: "bio-20", persona: "biographer", move: "advise", lane: "love",
    text: "What have you learned about getting along with the people closest to you? (Tap Ask me something else if you'd rather skip this one.)",
    followUps: ["Where did you learn that?"],
  },
  {
    id: "bio-21", persona: "biographer", move: "imagine", lane: "milestone",
    text: "If you could go back and watch one day of your life, which day would you choose?",
    followUps: ["What would you most want to see?", "Who would you look for first?"],
  },
  {
    id: "bio-22", persona: "biographer", move: "imagine", lane: "family",
    text: "If you could ask an ancestor one question, what would it be?",
    followUps: ["What do you think they'd say?"],
  },
  {
    id: "bio-23", persona: "biographer", move: "connect", lane: "milestone",
    text: "Which of your memories do you most want your family to know?",
    followUps: ["Who would you most like to tell it to?"],
  },
  {
    id: "bio-24", persona: "biographer", move: "connect", lane: "family", uses: "livingPerson",
    text: "What story do you hope {person} will remember about you?",
    followUps: ["Is there something they'd be surprised to learn?"],
  },
  {
    id: "bio-25", persona: "biographer", move: "recall", lane: "family", uses: "photo",
    text: "Here's a photo from your collection. What can you tell me about it?",
    followUps: ["Who took the picture?", "What happened just before or after?"],
  },
  {
    id: "bio-26", persona: "biographer", move: "recall", lane: "family", uses: "photo",
    text: "Take a look at this one. What does it bring back for you?",
    followUps: ["Who is in it, and where were you?", "What was the day like?"],
  },
  {
    id: "bio-27", persona: "biographer", move: "recall", lane: "family", uses: "person",
    text: "Tell me about a time you spent with {person}.",
    followUps: ["What do you remember most about that day?", "What made it stay with you?"],
  },

  // ===== The Curious Grandchild: explain, teach, imagine =====
  {
    id: "gc-01", persona: "grandchild", move: "explain", lane: "everyday",
    text: "I've never driven a stick shift. How would you teach me?",
    followUps: ["What's the hardest part for a beginner?", "Who taught you?"],
  },
  {
    id: "gc-02", persona: "grandchild", move: "explain", lane: "everyday",
    text: "How can you tell when bread is done baking? Teach me like I'm learning.",
    followUps: ["What does it smell like when it's ready?"],
  },
  {
    id: "gc-03", persona: "grandchild", move: "explain", lane: "work",
    text: "Teach me one thing you know from your work that most people don't.",
    followUps: ["How did you first learn it?", "When did it come in handy?"],
  },
  {
    id: "gc-04", persona: "grandchild", move: "explain", lane: "thenNow",
    text: "How did you do laundry when you were young? I'd love to understand.",
    followUps: ["Who did the work in your house?", "What was the hardest part?"],
  },
  {
    id: "gc-05", persona: "grandchild", move: "explain", lane: "childhood",
    text: "What's a game from your childhood that I could teach my friends?",
    followUps: ["How do you play it?", "What did you use for the pieces?"],
  },
  {
    id: "gc-06", persona: "grandchild", move: "explain", lane: "wonder",
    text: "How did you find your way somewhere new without a phone or a map?",
    followUps: ["Did you ever get lost?"],
  },
  {
    id: "gc-07", persona: "grandchild", move: "compare", lane: "thenNow",
    text: "What was the biggest invention that changed life in your time?",
    followUps: ["What was life like before it?", "Did it change your day-to-day?"],
  },
  {
    id: "gc-08", persona: "grandchild", move: "compare", lane: "thenNow",
    text: "What did you do for fun before TVs and phones were everywhere?",
    followUps: ["Who did you do it with?", "Which was the most fun?"],
  },
  {
    id: "gc-09", persona: "grandchild", move: "compare", lane: "thenNow",
    text: "What would surprise someone my age about growing up when you did?",
    followUps: ["What do you think I'd find hardest?", "What do you think I'd love?"],
  },
  {
    id: "gc-10", persona: "grandchild", move: "compare", lane: "family",
    text: "What was different about holidays when you were my age?",
    followUps: ["What did you look forward to most?"],
  },
  {
    id: "gc-11", persona: "grandchild", move: "advise", lane: "everyday",
    text: "I'm about to start something new and I feel nervous. What would you tell me?",
    followUps: ["Is there a time you felt that way?"],
  },
  {
    id: "gc-12", persona: "grandchild", move: "advise", lane: "work",
    text: "How do you decide between two good options?",
    followUps: ["Can you think of a time you had to?"],
  },
  {
    id: "gc-13", persona: "grandchild", move: "advise", lane: "love",
    text: "What makes a friendship last?",
    followUps: ["Who's a friend you've kept the longest?"],
  },
  {
    id: "gc-14", persona: "grandchild", move: "advise", lane: "gratitude",
    text: "What's a piece of advice you wish someone had told you earlier?",
    followUps: ["Who might have said it?"],
  },
  {
    id: "gc-15", persona: "grandchild", move: "imagine", lane: "wonder",
    text: "If you could invent something to make life easier, what would it be?",
    followUps: ["How would it work?", "Who would use it most?"],
  },
  {
    id: "gc-16", persona: "grandchild", move: "imagine", lane: "wonder",
    text: "If you could visit any place for a week, where would you go?",
    followUps: ["What would you do first when you got there?"],
  },
  {
    id: "gc-17", persona: "grandchild", move: "imagine", lane: "travel",
    text: "If you could travel back to any year, which would you pick?",
    followUps: ["What would you look for first?"],
  },
  {
    id: "gc-18", persona: "grandchild", move: "imagine", lane: "gratitude",
    text: "If you had a superpower for one day, what would you do with it?",
    followUps: ["What would be the very first thing?"],
  },
  {
    id: "gc-19", persona: "grandchild", move: "choose", lane: "wonder",
    text: "Cats or dogs? And I'd love to hear the story behind your pick.",
    choices: ["Cats", "Dogs", "Neither"],
    followUps: ["Tell me about one you knew."],
  },
  {
    id: "gc-20", persona: "grandchild", move: "choose", lane: "wonder",
    text: "Sweet or salty, which would you keep for the rest of your life?",
    choices: ["Sweet", "Salty"],
    followUps: ["What's your favorite of those?"],
  },
  {
    id: "gc-21", persona: "grandchild", move: "choose", lane: "everyday",
    text: "Early bird or night owl?",
    choices: ["Early bird", "Night owl"],
    followUps: ["What does a good day look like for you?"],
  },
  {
    id: "gc-22", persona: "grandchild", move: "choose", lane: "wonder",
    text: "Mountains or the ocean?",
    choices: ["Mountains", "The ocean"],
    followUps: ["Tell me about a time you were there."],
  },
  {
    id: "gc-23", persona: "grandchild", move: "connect", lane: "everyday",
    text: "What's something I should learn how to do before I'm older?",
    followUps: ["Who could teach me?"],
  },
  {
    id: "gc-24", persona: "grandchild", move: "connect", lane: "family",
    text: "What do you hope life is like for children growing up now?",
    followUps: ["What would you want them to keep from the old days?"],
  },
  {
    id: "gc-25", persona: "grandchild", move: "recall", lane: "gratitude",
    text: "What's the funniest thing you ever saw happen?",
    followUps: ["Who else was there?", "Do you still laugh about it?"],
  },
  {
    id: "gc-26", persona: "grandchild", move: "recall", lane: "gratitude",
    text: "Tell me about a time you laughed so hard you couldn't stop.",
    followUps: ["What set it off?", "Who was laughing with you?"],
  },

  // ===== The Music Companion: the songs you love =====
  {
    id: "mu-01", persona: "music", move: "recall", lane: "music", uses: "song",
    text: "You saved “{song}”. What does it bring back for you?",
    followUps: ["Where do you remember first hearing it?", "Who else liked it?"],
  },
  {
    id: "mu-02", persona: "music", move: "choose", lane: "music", uses: "song",
    text: "Would “{song}” be better for a long drive or a quiet evening at home?",
    choices: ["A long drive", "A quiet evening"],
    followUps: ["What makes it right for that?"],
  },
  {
    id: "mu-03", persona: "music", move: "imagine", lane: "music", uses: "song",
    text: "If “{song}” were the music for a scene in your life, which scene would it be?",
    followUps: ["Who would be in it?"],
  },
  {
    id: "mu-04", persona: "music", move: "explain", lane: "music", uses: "song",
    text: "How would you describe “{song}” to someone who has never heard it?",
    followUps: ["What does it make you want to do?"],
  },
  {
    id: "mu-05", persona: "music", move: "compare", lane: "music", uses: "song",
    text: "Is “{song}” a song for dancing, for singing along, or for listening quietly?",
    choices: ["Dancing", "Singing along", "Listening quietly"],
    followUps: ["Tell me about a time you did that."],
  },
  {
    id: "mu-06", persona: "music", move: "recall", lane: "music",
    text: "What's the first song you remember hearing as a child?",
    followUps: ["Who was singing or playing it?", "Where were you?"],
  },
  {
    id: "mu-07", persona: "music", move: "recall", lane: "music",
    text: "Did your family sing or play music together?",
    followUps: ["Who sang the loudest?", "What songs did you sing?"],
  },
  {
    id: "mu-08", persona: "music", move: "recall", lane: "music",
    text: "What song was playing at a party or a dance you remember?",
    followUps: ["Who did you dance with?", "What were you wearing?"],
  },
  {
    id: "mu-09", persona: "music", move: "recall", lane: "love",
    text: "Is there a song that reminds you of someone special?",
    followUps: ["What do you remember about hearing it together?"],
  },
  {
    id: "mu-10", persona: "music", move: "recall", lane: "music",
    text: "Did you ever learn to play an instrument, or wish you had?",
    followUps: ["Who taught you, or who would you have asked?"],
  },
  {
    id: "mu-11", persona: "music", move: "recall", lane: "music",
    text: "What was the first record or tape you ever owned?",
    followUps: ["How did you come to have it?"],
  },
  {
    id: "mu-12", persona: "music", move: "compare", lane: "thenNow",
    text: "How is the way people listen to music now different from when you were young?",
    followUps: ["What do you miss about the old way?"],
  },
  {
    id: "mu-13", persona: "music", move: "compare", lane: "music",
    text: "Which did you enjoy most?",
    choices: ["Records", "The radio", "Live music"],
    followUps: ["Tell me about a time you remember."],
  },
  {
    id: "mu-14", persona: "music", move: "choose", lane: "music",
    text: "A slow song or a lively one: which would you rather hear right now?",
    choices: ["A slow song", "A lively one"],
    followUps: ["What would it make you want to do?"],
  },
  {
    id: "mu-15", persona: "music", move: "choose", lane: "music",
    text: "Do you tend to hum, whistle, or sing out loud?",
    choices: ["Hum", "Whistle", "Sing out loud"],
    followUps: ["What do you usually sing?"],
  },
  {
    id: "mu-16", persona: "music", move: "choose", lane: "music",
    text: "Would you rather sing a duet or listen to a choir?",
    choices: ["Sing a duet", "Listen to a choir"],
    followUps: ["Who would you sing with?"],
  },
  {
    id: "mu-17", persona: "music", move: "explain", lane: "music",
    text: "What makes a song a good one to dance to?",
    followUps: ["What's the best dance you've had?"],
  },
  {
    id: "mu-18", persona: "music", move: "explain", lane: "music",
    text: "How would you help someone learn to enjoy old songs?",
    followUps: ["Which one would you start with?"],
  },
  {
    id: "mu-19", persona: "music", move: "imagine", lane: "music",
    text: "If you could hear any singer or band live, who would it be?",
    followUps: ["What would you hope they'd play?"],
  },
  {
    id: "mu-20", persona: "music", move: "imagine", lane: "music",
    text: "If you could pick a theme song for your life, what would it be?",
    followUps: ["What part of your life does it fit?"],
  },
  {
    id: "mu-21", persona: "music", move: "advise", lane: "music",
    text: "What song would you recommend to someone having a hard day?",
    followUps: ["What does it do for you?"],
  },
  {
    id: "mu-22", persona: "music", move: "advise", lane: "music",
    text: "What song would you suggest for a wedding or a big celebration?",
    followUps: ["Which celebration does that remind you of?"],
  },
  {
    id: "mu-23", persona: "music", move: "connect", lane: "music",
    text: "Is there a song stuck in your head lately?",
    followUps: ["Where do you think it came from?"],
  },
  {
    id: "mu-24", persona: "music", move: "connect", lane: "music", uses: "livingPerson",
    text: "Is there a song you'd like to share with {person}?",
    followUps: ["What would you tell them about it?"],
  },
];

export const PROMPTS_BY_ID: Map<string, LibraryPrompt> = new Map(PROMPT_LIBRARY.map((p) => [p.id, p]));
