export type SpeechLine = { speaker: "eagle"; text: string };
export type Dialogue = {
  lines: SpeechLine[];
  index: number;
  phase: "hidden" | "visible" | "exiting";
  age: number;
  clock: number;
  lastInteraction: number;
  pending: SpeechLine[] | null;
  announce: boolean;
};

export const EAGLE_CHATS: SpeechLine[][] = [
  [{ speaker: "eagle", text: "any luck down there?" }],
  [{ speaker: "eagle", text: "i like the view up here." }],
  [{ speaker: "eagle", text: "back already?" }],
  [{ speaker: "eagle", text: "you need something?" }],
  [{ speaker: "eagle", text: "i'll keep watch." }],
];

export function createDialogue(): Dialogue {
  return { lines: [], index: 0, phase: "hidden", age: 0, clock: 0, lastInteraction: -10, pending: null, announce: false };
}

export function currentLine(d: Dialogue) {
  return d.lines[d.index];
}

export function startDialogue(d: Dialogue, lines: SpeechLine[], mode: "ambient" | "interaction" | "catch" = "interaction") {
  if (!lines.length) return false;
  if (mode === "ambient" && d.phase !== "hidden") return false;
  if (mode === "interaction" && d.clock - d.lastInteraction < 0.35) return false;
  if (mode !== "ambient") d.lastInteraction = d.clock;
  d.announce = mode !== "ambient";
  if (d.phase === "hidden") {
    d.lines = lines;
    d.index = 0;
    d.phase = "visible";
  } else {
    // Finish the outgoing fade before changing the words.
    d.pending = lines;
    d.phase = "exiting";
  }
  d.age = 0;
  return true;
}

export function dismissDialogue(d: Dialogue) {
  d.pending = null;
  d.lines = d.lines.slice(0, d.index + 1);
  if (d.phase !== "hidden") {
    d.phase = "exiting";
    d.age = 0;
  }
}

/** Shared visible-scene clock: no independent timeouts or offscreen chatter. */
export function advanceDialogue(d: Dialogue, dt: number) {
  d.clock += dt;
  d.age += dt;
  if (d.phase === "hidden") return false;
  const line = currentLine(d);
  const hold = Math.max(2.6, 1.2 + line.text.length * 0.065);
  if (d.phase === "visible" && d.age >= hold) {
    d.phase = "exiting";
    d.age = 0;
    return true;
  }
  if (d.phase === "exiting" && d.age >= 0.22) {
    if (d.pending) {
      d.lines = d.pending;
      d.pending = null;
      d.index = 0;
    } else d.index++;
    d.phase = d.index < d.lines.length ? "visible" : "hidden";
    d.age = 0;
    return true;
  }
  return false;
}
