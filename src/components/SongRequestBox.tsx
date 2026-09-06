"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { requestSong, type SongRequestResult } from "@/app/actions";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { Icon } from "@/components/Icon";

// Same minimal ambient typing for the Web Speech API used by VoiceTextField,
// but this box only needs a single short phrase, not ongoing dictation.
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function SongRequestBox() {
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [result, setResult] = useState<SongRequestResult | null>(null);
  const [pending, startTransition] = useTransition();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    // Browser capability can only be known after mount (SSR has no `window`).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!getSpeechRecognition());
  }, []);

  function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const r = await requestSong(trimmed);
      setResult(r);
    });
  }

  function toggleListening() {
    const SR = getSpeechRecognition();
    if (!SR) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) {
        setQuery(finalText.trim());
        runSearch(finalText.trim());
      } else {
        setQuery(interimText);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <div className="tile tile-accent-music space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xl font-bold flex items-center gap-2">
          <Icon name="headphones" className="h-6 w-6" style={{ color: "var(--color-music)" }} /> Ask for a song
        </p>
        <ReadAloudButton text="Type or say a song name or artist, and I'll play it if I have it saved." />
      </div>
      <p className="text-lg text-[var(--color-text-muted)]">
        Type or say a song name or artist you&rsquo;d like to hear.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="flex flex-wrap items-center gap-3"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Unforgettable, or Nat King Cole"
          className="min-w-[16rem] flex-1 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xl"
          aria-label="Song name or artist"
        />
        {supported && (
          <button
            type="button"
            onClick={toggleListening}
            className={`btn-lg !min-h-[3rem] !py-2 !px-4 text-lg ${listening ? "btn-primary" : "btn-secondary"}`}
            aria-pressed={listening}
          >
            <Icon name="mic" className="h-5 w-5" />
            {listening ? "Listening…" : "Speak instead"}
          </button>
        )}
        <button type="submit" disabled={pending} className="btn-lg btn-primary">
          <Icon name="play" className="h-5 w-5" />
          {pending ? "Looking…" : "Play"}
        </button>
      </form>

      {result?.status === "playing" && (
        <div className="space-y-3 rounded-xl bg-[var(--color-music-tint)] p-4">
          <p className="text-lg font-semibold">
            Playing &ldquo;{result.song.title}&rdquo;
            {result.song.artist ? ` by ${result.song.artist}` : ""}
          </p>
          <audio controls autoPlay src={result.song.audioUrl} className="w-full">
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      {result?.status === "no-audio" && (
        <div className="space-y-2 rounded-xl bg-[var(--color-music-tint)] p-4">
          <p className="text-lg font-semibold">
            I found &ldquo;{result.song.title}&rdquo;
            {result.song.artist ? ` by ${result.song.artist}` : ""}, but there&rsquo;s no audio
            saved for it yet.
          </p>
          <Link
            href={`/music/${result.song.id}`}
            className="text-lg font-semibold underline decoration-2 underline-offset-4"
          >
            Add the audio on its page →
          </Link>
        </div>
      )}

      {result?.status === "not-found" && (
        <p className="rounded-xl bg-[var(--color-bg)] p-4 text-lg">
          I couldn&rsquo;t find that one in your music.
        </p>
      )}
    </div>
  );
}
