import type { CSSProperties } from "react";

// A small set of hand-drawn line icons (24x24) used throughout the app in
// place of emoji, to match the "Warm Keepsake" visual design — generic
// geometric shapes (a book, a music note, a briefcase, a flag...), not any
// specific artwork, brand, or character.

export type IconName =
  | "story"
  | "family"
  | "music"
  | "books"
  | "art"
  | "games"
  | "chart"
  | "sliders"
  | "tag"
  | "note"
  | "headphones"
  | "mic"
  | "photo"
  | "childhood"
  | "work"
  | "travel"
  | "heart"
  | "milestone"
  | "sparkle"
  | "sculpture"
  | "camera"
  | "home"
  | "plus"
  | "upload"
  | "play"
  | "stop"
  | "speaker"
  | "arrowLeft"
  | "check"
  | "puzzlePieces"
  | "quiz"
  | "sun"
  | "waves"
  | "tree"
  | "pageLines"
  | "thought"
  | "clock";

function IconPath({ name }: { name: IconName }) {
  switch (name) {
    case "story":
      return (
        <path d="M12 6.5c-1.7-1.4-4-2.1-7-2.1v14.2c3 0 5.3.7 7 2.1m0-14.2c1.7-1.4 4-2.1 7-2.1v14.2c-3 0-5.3.7-7 2.1m0-14.2v14.2" />
      );
    case "family":
      return (
        <>
          <circle cx="9" cy="8" r="3" />
          <circle cx="16.2" cy="9.3" r="2.3" />
          <path d="M3.2 20.5c0-3.6 2.6-6.3 5.8-6.3s5.8 2.7 5.8 6.3" />
          <path d="M15.4 14.5c2.3.5 4 2.7 4 6" />
        </>
      );
    case "music":
      return (
        <>
          <path d="M9.5 18.2V5.6l11-2.1v12.6" />
          <circle cx="6.7" cy="18.2" r="2.8" />
          <circle cx="17.7" cy="16.1" r="2.8" />
        </>
      );
    case "books":
      return (
        <>
          <path d="M4.5 5A2.5 2.5 0 0 1 7 2.5h12.5V20H7A2.5 2.5 0 0 0 4.5 22.5" />
          <path d="M4.5 5v17.5" />
          <path d="M8.5 6.5h7" />
        </>
      );
    case "art":
      return (
        <>
          <path d="M12 3.2a8.8 8.8 0 1 0 0 17.6c1.1 0 2-.9 2-2 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h1.4A4.4 4.4 0 0 0 20.8 10a8.8 8.8 0 0 0-8.8-6.8Z" />
          <circle cx="7.6" cy="10.6" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="11" cy="7.2" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="15.4" cy="8.1" r="1.15" fill="currentColor" stroke="none" />
        </>
      );
    case "games":
      return (
        <path d="M5.3 4.3h3.6a.9.9 0 0 1 .9.9v.5a1.4 1.4 0 0 0 2.8 0v-.5a.9.9 0 0 1 .9-.9h3.6a.9.9 0 0 1 .9.9v3.6a.9.9 0 0 1-.9.9h-.5a1.4 1.4 0 0 0 0 2.8h.5a.9.9 0 0 1 .9.9v3.6a.9.9 0 0 1-.9.9h-3.6a.9.9 0 0 1-.9-.9v-.5a1.4 1.4 0 0 0-2.8 0v.5a.9.9 0 0 1-.9.9H5.3a.9.9 0 0 1-.9-.9v-3.6a.9.9 0 0 1 .9-.9h.5a1.4 1.4 0 0 0 0-2.8h-.5a.9.9 0 0 1-.9-.9V5.2a.9.9 0 0 1 .9-.9Z" />
      );
    case "chart":
      return (
        <>
          <rect x="4.2" y="12.5" width="3.2" height="7.3" rx="0.6" />
          <rect x="10.4" y="7.4" width="3.2" height="12.4" rx="0.6" />
          <rect x="16.6" y="15.2" width="3.2" height="4.6" rx="0.6" />
        </>
      );
    case "sliders":
      return (
        <>
          <line x1="4" y1="6.5" x2="20" y2="6.5" />
          <circle cx="9.5" cy="6.5" r="1.9" fill="var(--icon-bg,#fbf3e3)" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <circle cx="15" cy="12" r="1.9" fill="var(--icon-bg,#fbf3e3)" />
          <line x1="4" y1="17.5" x2="20" y2="17.5" />
          <circle cx="9.5" cy="17.5" r="1.9" fill="var(--icon-bg,#fbf3e3)" />
        </>
      );
    case "tag":
      return (
        <>
          <path d="M11 3.5H6.5A2 2 0 0 0 4.5 5.5V10c0 .5.2 1 .6 1.4l8 8a2 2 0 0 0 2.8 0l4-4a2 2 0 0 0 0-2.8l-8-8a2 2 0 0 0-1.4-.6Z" />
          <circle cx="8.2" cy="8.2" r="1.1" fill="currentColor" stroke="none" />
        </>
      );
    case "note":
      return (
        <>
          <path d="M4 20l1-4.2L15.8 5a1.6 1.6 0 0 1 2.3 0l1 1a1.6 1.6 0 0 1 0 2.3L8.2 19 4 20Z" />
          <path d="M14 6.5l3.5 3.5" />
        </>
      );
    case "headphones":
      return (
        <>
          <path d="M4 14.5V12a8 8 0 0 1 16 0v2.5" />
          <rect x="3.3" y="14.2" width="3.6" height="5.4" rx="1.3" />
          <rect x="17.1" y="14.2" width="3.6" height="5.4" rx="1.3" />
        </>
      );
    case "mic":
      return (
        <>
          <rect x="9.3" y="3.5" width="5.4" height="10" rx="2.7" />
          <path d="M6 11.5a6 6 0 0 0 12 0" />
          <path d="M12 17.5v3.2" />
          <path d="M9 20.7h6" />
        </>
      );
    case "photo":
      return (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
          <circle cx="8.5" cy="9.5" r="1.6" />
          <path d="M4.5 16.5l4.7-4.7a1.5 1.5 0 0 1 2.1 0l2.4 2.4" />
          <path d="M12.5 15.8l2.3-2.3a1.5 1.5 0 0 1 2.1 0l2.6 2.6" />
        </>
      );
    case "childhood":
      return (
        <>
          <circle cx="12" cy="13" r="5.4" />
          <circle cx="7.3" cy="7" r="2.1" />
          <circle cx="16.7" cy="7" r="2.1" />
          <circle cx="10" cy="12" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="14" cy="12" r="0.9" fill="currentColor" stroke="none" />
          <path d="M10.3 15.3c.6.6 2.8.6 3.4 0" />
        </>
      );
    case "work":
      return (
        <>
          <rect x="3.5" y="7.5" width="17" height="11.5" rx="1.6" />
          <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
          <path d="M3.5 12.5h17" />
        </>
      );
    case "travel":
      return (
        <path d="M11.2 3.5 12 2.7l.8.8v6l6.7 4v2l-6.7-2v4l2 1.6v1.6l-2.8-1-2.8 1v-1.6l2-1.6v-4l-6.7 2v-2l6.7-4Z" />
      );
    case "heart":
      return (
        <path d="M12 20.2s-7.4-4.5-9.7-9A5 5 0 0 1 12 6.6a5 5 0 0 1 9.7 4.6c-2.3 4.5-9.7 9-9.7 9Z" />
      );
    case "milestone":
      return (
        <>
          <path d="M6 3.5v17" />
          <path d="M6 4.5h10.5l-2.2 3.3 2.2 3.3H6" />
        </>
      );
    case "sparkle":
      return (
        <>
          <path d="M12 3.5c.4 3 1.6 4.6 4.5 5.5-2.9.9-4.1 2.5-4.5 5.5-.4-3-1.6-4.6-4.5-5.5 2.9-.9 4.1-2.5 4.5-5.5Z" />
          <path d="M18.5 14.5c.25 1.6.9 2.4 2.5 2.8-1.6.4-2.25 1.2-2.5 2.8-.25-1.6-.9-2.4-2.5-2.8 1.6-.4 2.25-1.2 2.5-2.8Z" />
        </>
      );
    case "sculpture":
      return (
        <>
          <path d="M12 3.8a2.6 2.6 0 0 1 2.6 2.6c0 1-.5 1.8-1.3 2.3.9.6 1.5 1.5 1.7 2.6H9c.2-1.1.8-2 1.7-2.6a2.6 2.6 0 0 1-1.3-2.3A2.6 2.6 0 0 1 12 3.8Z" />
          <path d="M7.5 20.2v-2.3c0-1.7 1.4-3.1 3.1-3.1h2.8c1.7 0 3.1 1.4 3.1 3.1v2.3" />
          <path d="M6 20.2h12" />
        </>
      );
    case "camera":
      return (
        <>
          <path d="M4 8.2A1.7 1.7 0 0 1 5.7 6.5h2l1-1.7h6.6l1 1.7h2A1.7 1.7 0 0 1 20 8.2v9.1a1.7 1.7 0 0 1-1.7 1.7H5.7A1.7 1.7 0 0 1 4 17.3Z" />
          <circle cx="12" cy="12.5" r="3.4" />
        </>
      );
    case "home":
      return (
        <>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" />
          <path d="M9.5 20.3V14h5v6.3" />
        </>
      );
    case "plus":
      return (
        <>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </>
      );
    case "upload":
      return (
        <>
          <path d="M12 15.5V4.2" />
          <path d="M7 8.7 12 4l5 4.7" />
          <path d="M5 16v2.3A1.7 1.7 0 0 0 6.7 20h10.6a1.7 1.7 0 0 0 1.7-1.7V16" />
        </>
      );
    case "play":
      return <path d="M7 4.8v14.4a1 1 0 0 0 1.5.87l12-7.2a1 1 0 0 0 0-1.74l-12-7.2A1 1 0 0 0 7 4.8Z" />;
    case "stop":
      return <rect x="6" y="6" width="12" height="12" rx="1.5" />;
    case "speaker":
      return (
        <>
          <path d="M4 9.3h3.3L11 5.7v12.6l-3.7-3.6H4z" />
          <path d="M15 8.3a4.2 4.2 0 0 1 0 7.4" />
          <path d="M17.4 5.8a7.4 7.4 0 0 1 0 12.4" />
        </>
      );
    case "arrowLeft":
      return (
        <>
          <path d="M19 12H5" />
          <path d="M11 6l-6 6 6 6" />
        </>
      );
    case "check":
      return <path d="M4.5 12.7l5 5 10-11" />;
    case "puzzlePieces":
      return (
        <path d="M5.3 4.3h3.6a.9.9 0 0 1 .9.9v.5a1.4 1.4 0 0 0 2.8 0v-.5a.9.9 0 0 1 .9-.9h3.6a.9.9 0 0 1 .9.9v3.6a.9.9 0 0 1-.9.9h-.5a1.4 1.4 0 0 0 0 2.8h.5a.9.9 0 0 1 .9.9v3.6a.9.9 0 0 1-.9.9h-3.6a.9.9 0 0 1-.9-.9v-.5a1.4 1.4 0 0 0-2.8 0v.5a.9.9 0 0 1-.9.9H5.3a.9.9 0 0 1-.9-.9v-3.6a.9.9 0 0 1 .9-.9h.5a1.4 1.4 0 0 0 0-2.8h-.5a.9.9 0 0 1-.9-.9V5.2a.9.9 0 0 1 .9-.9Z" />
      );
    case "quiz":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.3a2.5 2.5 0 0 1 4.7 1.2c0 1.6-2.2 1.9-2.2 3.5" />
          <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
        </>
      );
    case "sun":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
        </>
      );
    case "waves":
      return (
        <>
          <path d="M3 11c2-2.4 4-2.4 6 0s4 2.4 6 0 4-2.4 6 0" />
          <path d="M3 16.5c2-2.4 4-2.4 6 0s4 2.4 6 0 4-2.4 6 0" />
        </>
      );
    case "tree":
      return (
        <>
          <circle cx="12" cy="4.5" r="2" />
          <circle cx="6" cy="12" r="2" />
          <circle cx="18" cy="12" r="2" />
          <circle cx="6" cy="19.5" r="2" />
          <circle cx="18" cy="19.5" r="2" />
          <path d="M12 6.5v3M6 9.5v.8M18 9.5v.8M6 9.7h12M6 14v3.5M18 14v3.5" />
        </>
      );
    case "pageLines":
      return (
        <>
          <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
          <path d="M8 8h8M8 11.5h8M8 15h5" />
        </>
      );
    case "thought":
      return (
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5Z" />
      );
    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3.2 2" />
        </>
      );
  }
}

export function Icon({
  name,
  className,
  strokeWidth = 1.8,
  style,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <IconPath name={name} />
    </svg>
  );
}
