// "Download everything": turns a whole story into plain text files plus a list
// of the pictures and recordings to put beside them. Pure (no server or React
// code) so it can be tested on its own. The browser fetches each file in `media`
// by its (short-lived) link and zips everything up; see DownloadEverythingButton.

import type { Book, ArtPiece, LifeMilestone, LifeStoryRecording, MemoryEntry, Person, Photo, Song } from "./types";
import type { Conversation, ConversationMessage, FamilyQuestion } from "./conversation";
import { CATEGORY_META, RELATIONSHIP_LABELS } from "./ui";
import { formatMilestoneDate } from "./lifeStoryBook";

export interface EverythingInput {
  seniorName: string;
  generatedOn: string;
  memories: MemoryEntry[];
  lifeStoryRecordings: LifeStoryRecording[];
  people: Person[];
  photos: Photo[];
  songs: Song[];
  books: Book[];
  art: ArtPiece[];
  milestones: LifeMilestone[];
  conversations: { conversation: Conversation; messages: ConversationMessage[] }[];
  questions: FamilyQuestion[];
}

export interface EverythingExport {
  /** Text files to put in the zip: path inside the zip, and its contents. */
  documents: { path: string; text: string }[];
  /** Pictures and recordings to fetch: path inside the zip, and where to fetch from. */
  media: { path: string; url: string }[];
}

const DIVIDER = "\n----------------------------------------\n\n";

/** A name that is safe in a file name on any computer. */
export function safeName(text: string, fallback: string): string {
  const cleaned = text
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[. ]+|[. ]+$/g, "")
    .slice(0, 60)
    .trim();
  return cleaned || fallback;
}

/** The file ending of a signed link ("…/abc-photo.jpg?token=…" gives ".jpg"). */
function extensionOf(url: string, fallback: string): string {
  try {
    const path = new URL(url).pathname;
    const match = /\.([A-Za-z0-9]{2,5})$/.exec(path);
    if (match) return `.${match[1].toLowerCase()}`;
  } catch {
    // fall through
  }
  return fallback;
}

function day(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function list(names: string[]): string {
  return names.length ? names.join(", ") : "";
}

export function buildEverything(input: EverythingInput): EverythingExport {
  const documents: EverythingExport["documents"] = [];
  const media: EverythingExport["media"] = [];
  const used = new Set<string>();

  /** Reserve a unique path inside the zip, adding "(2)", "(3)" for repeats. */
  function reserve(folder: string, base: string, ext: string): string {
    let n = 1;
    let path = `${folder}/${base}${ext}`;
    while (used.has(path.toLowerCase())) {
      n += 1;
      path = `${folder}/${base} (${n})${ext}`;
    }
    used.add(path.toLowerCase());
    return path;
  }

  const peopleById = new Map(input.people.map((p) => [p.id, p]));
  const personName = (id: string) => peopleById.get(id)?.name ?? "";

  // Pictures first: photos and art get their file name, so the text can refer to it.
  const photoFile = new Map<string, string>();
  input.photos.forEach((p, i) => {
    if (!p.imageUrl) return;
    const path = reserve("Photos", safeName(p.caption || p.label, `Photo ${i + 1}`), extensionOf(p.imageUrl, ".jpg"));
    photoFile.set(p.id, path);
    media.push({ path, url: p.imageUrl });
  });
  const artFile = new Map<string, string>();
  input.art.forEach((a, i) => {
    if (!a.imageUrl) return;
    const path = reserve("Art", safeName(a.title, `Art ${i + 1}`), extensionOf(a.imageUrl, ".jpg"));
    artFile.set(a.id, path);
    media.push({ path, url: a.imageUrl });
  });

  // ---- Memories ----
  const memoryFolder = new Map<string, string[]>();
  const memories = [...input.memories].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const memoryText = memories.map((m) => {
    const files: string[] = [];
    m.recordings.forEach((clip, i) => {
      if (!clip.audioUrl) return;
      const path = reserve(
        "Recordings/Memories",
        `${safeName(m.title, "Memory")} - ${safeName(clip.label, `recording ${i + 1}`)}`,
        extensionOf(clip.audioUrl, ".webm")
      );
      media.push({ path, url: clip.audioUrl });
      files.push(path);
    });
    memoryFolder.set(m.id, files);
    const lines = [
      m.title,
      [
        CATEGORY_META[m.category]?.label ?? m.category,
        m.memoryDate ? `about ${m.memoryDate}` : "",
        `added by ${m.enteredBy.name} on ${day(m.recordedAt)}`,
      ]
        .filter(Boolean)
        .join(" · "),
    ];
    if (m.prompt) lines.push(`In answer to: "${m.prompt}"`);
    lines.push("", m.transcript);
    const people = list(m.linkedPersonIds.map(personName).filter(Boolean));
    const photos = list(m.linkedPhotoIds.map((id) => photoFile.get(id)).filter((p): p is string => Boolean(p)));
    const art = list(m.linkedArtIds.map((id) => artFile.get(id)).filter((p): p is string => Boolean(p)));
    if (people) lines.push("", `People: ${people}`);
    if (photos) lines.push(`Photos: ${photos}`);
    if (art) lines.push(`Art: ${art}`);
    if (files.length) lines.push(`Recordings: ${files.join(", ")}`);
    return lines.join("\n");
  });
  documents.push({ path: "Memories.txt", text: memoryText.length ? memoryText.join(DIVIDER) + "\n" : "No memories yet.\n" });

  // ---- Life story recordings ----
  const lsrText = input.lifeStoryRecordings.map((r) => {
    const files: string[] = [];
    r.clips.forEach((clip, i) => {
      if (!clip.audioUrl) return;
      const path = reserve(
        "Recordings/Life story",
        `${safeName(r.title, "Recording")} - ${safeName(clip.label, `part ${i + 1}`)}`,
        extensionOf(clip.audioUrl, ".webm")
      );
      media.push({ path, url: clip.audioUrl });
      files.push(path);
    });
    return [r.title, `added by ${r.enteredBy.name} on ${day(r.createdAt)}`, "", r.summary, files.length ? `\nAudio: ${files.join(", ")}` : ""]
      .join("\n")
      .trimEnd();
  });
  documents.push({
    path: "Life story recordings.txt",
    text: lsrText.length ? lsrText.join(DIVIDER) + "\n" : "No life story recordings yet.\n",
  });

  // ---- People ----
  const peopleText = input.people.map((p) => {
    const lines = [p.name];
    const rel = p.relationshipLabel || RELATIONSHIP_LABELS[p.relationshipToSenior] || p.relationshipToSenior;
    lines.push(`${rel}${p.livingStatus && p.livingStatus !== "unknown" ? ` · ${p.livingStatus}` : ""}`);
    const spouse = p.spouseId ? personName(p.spouseId) : "";
    if (spouse) lines.push(`Spouse or partner: ${spouse}`);
    const parents = list(p.parentIds.map(personName).filter(Boolean));
    if (parents) lines.push(`Parents: ${parents}`);
    if (p.notes) lines.push("", p.notes);
    return lines.join("\n");
  });
  documents.push({
    path: "People.txt",
    text: `Family and friends of ${input.seniorName}\n\n` + (peopleText.length ? peopleText.join(DIVIDER) + "\n" : "No people yet.\n"),
  });

  // ---- Photos ----
  const photoText = input.photos.map((p) => {
    const tagged = [
      ...(p.seniorTagged ? [input.seniorName] : []),
      ...p.taggedPersonIds.map(personName).filter(Boolean),
    ];
    return [
      p.caption || p.label,
      photoFile.get(p.id) ? `File: ${photoFile.get(p.id)}` : "(no picture was uploaded)",
      p.dateTaken ? `Date: ${p.dateTaken}` : "",
      tagged.length ? `In the photo: ${list(tagged)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });
  documents.push({ path: "Photos.txt", text: photoText.length ? photoText.join(DIVIDER) + "\n" : "No photos yet.\n" });

  // ---- Songs ----
  const songText = input.songs.map((s) => {
    const files: string[] = [];
    if (s.audioUrl) {
      const path = reserve("Recordings/Songs", safeName(s.title, "Song"), extensionOf(s.audioUrl, ".mp3"));
      media.push({ path, url: s.audioUrl });
      files.push(path);
    }
    s.recordings.forEach((clip, i) => {
      if (!clip.audioUrl) return;
      const path = reserve(
        "Recordings/Songs",
        `${safeName(s.title, "Song")} - ${safeName(clip.label, `recording ${i + 1}`)}`,
        extensionOf(clip.audioUrl, ".webm")
      );
      media.push({ path, url: clip.audioUrl });
      files.push(path);
    });
    return [
      s.artist ? `${s.title} — ${s.artist}` : s.title,
      s.personalNote ? `Why it matters: ${s.personalNote}` : "",
      s.youtubeUrl ? `Link: ${s.youtubeUrl}` : "",
      files.length ? `Audio: ${files.join(", ")}` : "",
      s.lyrics ? `\nLyrics:\n${s.lyrics}` : "",
    ]
      .filter((x) => x !== "")
      .join("\n");
  });
  documents.push({ path: "Songs.txt", text: songText.length ? songText.join(DIVIDER) + "\n" : "No songs yet.\n" });

  // ---- Books and art ----
  const bookText = input.books.map((b) =>
    [b.author ? `${b.title} — ${b.author}` : b.title, b.personalNote ? `Why it matters: ${b.personalNote}` : ""]
      .filter(Boolean)
      .join("\n")
  );
  documents.push({ path: "Books.txt", text: bookText.length ? bookText.join(DIVIDER) + "\n" : "No books yet.\n" });

  const artText = input.art.map((a) =>
    [
      a.artist ? `${a.title} — ${a.artist}` : a.title,
      a.medium,
      artFile.get(a.id) ? `File: ${artFile.get(a.id)}` : "",
      a.prompt ? `In answer to: "${a.prompt}"` : "",
      a.personalNote ? `What made an impression: ${a.personalNote}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
  documents.push({ path: "Art.txt", text: artText.length ? artText.join(DIVIDER) + "\n" : "No art yet.\n" });

  // ---- Life story book (milestones) ----
  const mileText = [...input.milestones]
    .sort((a, b) => a.year - b.year || (a.month ?? 13) - (b.month ?? 13) || (a.day ?? 32) - (b.day ?? 32))
    .map((m) =>
      [`${formatMilestoneDate(m)}: ${m.title}`, m.description ? m.description : "", m.photo && photoFile.get(m.photo.id) ? `Photo: ${photoFile.get(m.photo.id)}` : ""]
        .filter(Boolean)
        .join("\n")
    );
  documents.push({ path: "Life story book.txt", text: mileText.length ? mileText.join(DIVIDER) + "\n" : "No milestones yet.\n" });

  // ---- Let's Talk and family questions ----
  const talkText = input.conversations.map(({ conversation: c, messages }) => {
    const head = `Conversation with the guide "${c.persona}" on ${day(c.startedAt)}${c.topic ? ` · ${c.topic}` : ""}${c.savedMemoryId ? " · saved as a memory" : ""}`;
    const body = messages.map((m) => `${m.author === "senior" ? "You" : "Guide"}: ${[m.lead, m.body].filter(Boolean).join(" ")}`);
    return [head, "", ...body].join("\n");
  });
  documents.push({
    path: "Lets Talk conversations.txt",
    text: talkText.length ? talkText.join(DIVIDER) + "\n" : "No conversations yet.\n",
  });

  const questionText = input.questions.map((q) =>
    [
      `${q.askerName} asked on ${day(q.createdAt)}: ${q.body}`,
      q.status === "answered" ? `Answer: ${q.answer ?? ""}` : q.status === "skipped" ? "(set aside)" : "(not answered yet)",
    ].join("\n")
  );
  documents.push({
    path: "Family questions.txt",
    text: questionText.length ? questionText.join(DIVIDER) + "\n" : "No family questions yet.\n",
  });

  // ---- A machine-readable copy ----
  documents.push({
    path: "everything.json",
    text: JSON.stringify(
      {
        seniorName: input.seniorName,
        exportedOn: input.generatedOn,
        memories: input.memories.map((m) => ({ ...m, recordings: m.recordings.map((r) => ({ ...r, audioUrl: undefined, file: undefined })) })),
        lifeStoryRecordings: input.lifeStoryRecordings.map((r) => ({ ...r, clips: r.clips.map((c) => ({ ...c, audioUrl: undefined })) })),
        people: input.people,
        photos: input.photos.map((p) => ({ ...p, imageUrl: undefined, file: photoFile.get(p.id) })),
        songs: input.songs.map((s) => ({ ...s, audioUrl: undefined, recordings: s.recordings.map((r) => ({ ...r, audioUrl: undefined })) })),
        books: input.books,
        art: input.art.map((a) => ({ ...a, imageUrl: undefined, file: artFile.get(a.id) })),
        milestones: input.milestones.map((m) => ({ ...m, photo: m.photo ? { id: m.photo.id, caption: m.photo.caption } : undefined })),
        conversations: input.conversations.map(({ conversation, messages }) => ({ ...conversation, messages })),
        familyQuestions: input.questions,
      },
      null,
      2
    ),
  });

  documents.unshift({
    path: "READ ME FIRST.txt",
    text: [
      `Roots & Echoes: everything from ${input.seniorName}'s story`,
      `Downloaded on ${input.generatedOn}.`,
      "",
      "Plain text files (open them with any program, such as Notepad or TextEdit):",
      "  Memories.txt, Life story recordings.txt, People.txt, Photos.txt, Songs.txt, Books.txt,",
      "  Art.txt, Life story book.txt, Lets Talk conversations.txt, Family questions.txt.",
      "",
      "Folders: Photos, Art and Recordings hold the pictures and audio. The text files say which file belongs to what.",
      "everything.json holds the same information in a form other programs can read.",
      "",
      "If the download came in several parts, the first part has these text files and the others carry more pictures and recordings.",
      "Keep all the parts together and open each one.",
    ].join("\n") + "\n",
  });

  return { documents, media };
}
