"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { drawReferenceTrees } from "@/components/fishing-tree-sprites";
import styles from "./pixel-fishing-scene.module.css";
import { drawFishingRabbit, drawFishingRabbitEye, drawFishingRabbitPaw } from "./fishing-rabbit";
import { advanceFishing, CATCH_TIMING, createFishingCycle, drawCaughtFish, fishingPose, startCatch, type Point } from "./fishing-animation";
import { drawBirdPerch, drawFishingBird } from "./fishing-bird";
import { advanceDialogue, createDialogue, currentLine, dismissDialogue, EAGLE_CHATS, startDialogue, type SpeechLine } from "./fishing-dialogue";

/**
 * Pixel-art fishing scene drawn on a 2D canvas (342 x 223 logical px)
 * and scaled up crisply with `image-rendering: pixelated`.
 *
 * - The static scene is cached offscreen and refreshed when the reference
 *   texture loads. A 2x backing buffer preserves its fine tree detailing.
 * - One animation clock drives fishing, particles, blinking and butterflies.
 *   It pauses when hidden/offscreen; the scenery and rabbit sprites are cached.
 * - Honors `prefers-reduced-motion` (idle motion stops, clicks still respond).
 */

export const SCENE_W = 342;
export const SCENE_H = 223;

// Leave breathing room above the trees while keeping a shallow foreground pond.
const VIEW_TOP = 32;
const WORLD_BOTTOM = VIEW_TOP + SCENE_H;
const RENDER_SCALE = 2;

const GROUND = 192; // top of the grass platforms
const HORIZON = 197; // dark waterline
const SKY_H = HORIZON + 1;

type Ctx = CanvasRenderingContext2D;
type ColorFn = (x: number, y: number, dx: number, dy: number) => string | null;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const rnd = (x: number, y: number, s = 0) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return n - Math.floor(n);
};

const hex2rgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const rgb2hex = (r: number, g: number, b: number) =>
  "#" +
  [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");

const mix = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hex2rgb(a);
  const [r2, g2, b2] = hex2rgb(b);
  return rgb2hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};

const px = (g: Ctx, x: number, y: number, c: string, w = 1, h = 1) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
};

const disc = (g: Ctx, cx: number, cy: number, r: number, color: string | ColorFn) => {
  const R = r + 0.4;
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) {
    for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= R * R) {
        const c = typeof color === "string" ? color : color(x, y, dx, dy);
        if (c) px(g, x, y, c);
      }
    }
  }
};

/* ------------------------------------------------------------------ */
/* palette                                                             */
/* ------------------------------------------------------------------ */

const C = {
  skyTop: "#a9d7d7",
  skyLow: "#b8e0da",
  cream: "#fbf9e6",
  creamShade: "#eceed4",
  creamDeep: "#dfe7d2",
  outline: "#4f3232",
  bushLight: "#6fae92",
  bushMid: "#5a9a86",
  bushDark: "#4c8878",
  grassOutline: "#34503f",
  grassDark: "#3f7d57",
  grassMid: "#5c9a5c",
  grassLight: "#8fbf6c",
  platTop: "#a9c57a",
  platTopLight: "#bcd68c",
  platMid: "#7fa05b",
  dirt: "#8a6a50",
  dirtDark: "#6e5240",
  dirtLight: "#9d7d60",
  platEdge: "#3e2e2b",
  horizon: "#4a4242",
  waterTop: "#90c6c2",
  waterBottom: "#78afb4",
  rippleLight: "#d8f1ee",
  rippleDark: "#5f969b",
};

/* ------------------------------------------------------------------ */
/* sky, stars, clouds                                                  */
/* ------------------------------------------------------------------ */

function drawSky(g: Ctx) {
  for (let y = 0; y < SKY_H; y++) {
    const t = Math.pow(y / SKY_H, 1.6);
    px(g, 0, y, mix(C.skyTop, C.skyLow, t), SCENE_W, 1);
  }
}

function star(g: Ctx, x: number, y: number) {
  px(g, x, y, "#fffbe6");
  const arm = "#d6ece3";
  px(g, x - 1, y, arm);
  px(g, x + 1, y, arm);
  px(g, x, y - 1, arm);
  px(g, x, y + 1, arm);
}

function cloud(g: Ctx, circles: [number, number, number][]) {
  for (const [cx, cy, r] of circles) {
    disc(g, cx, cy, r, (x, y, _dx, dy) => {
      const k = dy / r;
      const grain = rnd(x, y, cx + cy);
      if (k > 0.78 && grain > 0.38) return C.creamDeep;
      if (k > 0.55) return C.creamShade;
      if (k > 0.3 && (x + y) % 2 === 0) return C.creamShade;
      if (grain > 0.965) return C.creamShade;
      return C.cream;
    });
  }
}

/** Subtle flecks break up the large soft cloud masses into pixel clusters. */
function cloudTexture(g: Ctx, patches: [number, number, number, number][]) {
  for (const [x0, y0, x1, y1] of patches) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const n = rnd(x, y, x0 + y1);
        if (n > 0.955) px(g, x, y, n > 0.988 ? C.creamDeep : C.creamShade);
      }
    }
  }
}

function drawClouds(g: Ctx) {
  // big left cloud: solid core first so there are no sky holes inside it
  px(g, 62, 150, C.cream, 100, 48);

  cloud(g, [
    [88, 108, 10], [100, 114, 10], [78, 120, 12], [112, 122, 12],
    [125, 128, 8], [66, 134, 14], [96, 132, 14], [120, 138, 14],
    [150, 150, 10], [130, 150, 14], [80, 160, 16], [110, 155, 16],
    [60, 170, 14], [140, 165, 14], [160, 178, 12], [100, 180, 18],
    [70, 185, 14], [130, 185, 14], [150, 172, 12], [160, 188, 10],
    [172, 182, 8], [182, 188, 8],
  ]);
  cloudTexture(g, [[52, 124, 77, 152], [74, 103, 113, 128], [106, 121, 145, 151], [54, 155, 96, 182], [132, 157, 175, 190]]);

  // big right cloud
  px(g, 200, 160, C.cream, 62, 38);
  cloud(g, [
    [237, 122, 10], [247, 126, 9], [228, 128, 9], [240, 138, 12],
    [222, 140, 11], [250, 148, 10], [210, 150, 10], [226, 155, 13],
    [262, 158, 8], [240, 170, 14], [210, 170, 14], [262, 175, 10],
    [200, 180, 12], [230, 185, 14], [195, 190, 10], [186, 184, 8],
    [178, 170, 8], [190, 172, 7],
  ]);
  cloudTexture(g, [[203, 132, 229, 160], [228, 119, 250, 153], [196, 158, 228, 184], [231, 159, 260, 183]]);

  // little clouds
  cloud(g, [[272, 95, 4], [268, 97, 4], [278, 97, 3]]);
  px(g, 262, 98, C.cream, 30, 2);
  px(g, 258, 99, C.creamShade, 14, 1);

  cloud(g, [[14, 130, 4], [19, 132, 4], [8, 133, 3]]);
  px(g, 2, 133, C.cream, 24, 2);
  px(g, 4, 135, C.creamShade, 12, 1);

  cloud(g, [[145, 135, 4], [150, 136, 3], [139, 137, 3]]);
  px(g, 133, 137, C.cream, 28, 2);
  px(g, 135, 139, C.creamShade, 14, 1);

  cloud(g, [[336, 139, 3], [331, 140, 3], [341, 138, 3]]);
  px(g, 322, 140, C.cream, 20, 2);

  // low clouds peeking from the edges
  cloud(g, [[3, 184, 8], [12, 190, 8], [-2, 192, 8]]);
  cloud(g, [[340, 188, 8], [334, 192, 6]]);
}

/* ------------------------------------------------------------------ */
/* undergrowth, grass, platforms, flowers                              */
/* ------------------------------------------------------------------ */

function bushes(g: Ctx, x0: number, x1: number, seed: number) {
  px(g, x0 - 2, 187, C.bushDark, x1 - x0 + 4, GROUND - 187);
  for (let x = x0; x <= x1; x += 4) {
    const r = 5 + rnd(x, 0, seed) * 3;
    const cy = 186 + rnd(x, 1, seed) * 3 - 1;
    disc(g, x, cy, r, (_x, _y, _dx, dy) =>
      dy > r * 0.3 ? C.bushDark : dy < -r * 0.4 ? C.bushLight : C.bushMid,
    );
  }
}

/** A fan of curved blades with a dark outline and light tips. */
function clump(g: Ctx, bx: number, seed: number) {
  const n = 4 + Math.floor(rnd(bx, 1, seed) * 3); // 4..6 blades
  const H = 6 + Math.floor(rnd(bx, 2, seed) * 5); // 6..10 px tall
  const m = (n - 1) / 2;
  const blades: { pts: [number, number, number][] }[] = [];

  for (let k = 0; k < n; k++) {
    const o = (k - m) / m; // -1..1 across the fan
    const hgt = Math.max(
      3,
      Math.round(H * (1 - 0.38 * Math.abs(o)) + (rnd(bx, k, seed + 5) - 0.5) * 2),
    );
    const lean = o * (2.5 + rnd(bx, k, seed + 7) * 2);
    const x0 = bx + Math.round(o * 1.2);
    const pts: [number, number, number][] = [];
    for (let i = 0; i < hgt; i++) {
      const t = i / Math.max(1, hgt - 1);
      pts.push([x0 + Math.round(lean * Math.pow(t, 1.4)), GROUND - 1 - i, t]);
    }
    blades.push({ pts });
  }

  // pass 1: outline, pass 2: colour core
  for (const b of blades) {
    for (const [x, y] of b.pts) {
      px(g, x - 1, y, C.grassOutline);
      px(g, x + 1, y, C.grassOutline);
    }
    const [tx, ty] = b.pts[b.pts.length - 1];
    px(g, tx, ty - 1, C.grassOutline);
  }
  for (const b of blades) {
    for (const [x, y, t] of b.pts) {
      px(g, x, y, t < 0.4 ? C.grassDark : t < 0.8 ? C.grassMid : C.grassLight);
      if (t > 0.42 && rnd(x, y, seed + 14) > 0.7) {
        px(g, x + (rnd(x, y, seed + 15) > 0.5 ? 1 : -1), y, "#a9c777");
      }
    }
  }
}

function tufts(g: Ctx, x0: number, x1: number, seed: number) {
  let x = x0;
  while (x <= x1) {
    clump(g, x, seed);
    x += 4 + Math.floor(rnd(x, 7, seed) * 3);
  }
}

function platform(g: Ctx, x0: number, x1: number, seed: number) {
  for (let x = x0; x <= x1; x++) {
    px(g, x, GROUND, rnd(x, 31, seed) > 0.7 ? C.platTopLight : C.platTop);
    px(g, x, GROUND + 1, C.platMid);
    for (let y = GROUND + 2; y < HORIZON; y++) {
      const r = rnd(x, y, seed);
      px(g, x, y, r > 0.82 ? C.dirtDark : r < 0.12 ? C.dirtLight : C.dirt);
    }
    // leafy fringe hanging off the top edge
    if (rnd(x, 40, seed) > 0.6) px(g, x, GROUND + 2, C.platMid);
    if (rnd(x, 41, seed) > 0.9) px(g, x, GROUND + 3, C.platMid);
    if (rnd(x, 43, seed) > 0.55) {
      px(g, x, GROUND - 1, rnd(x, 44, seed) > 0.55 ? "#d0dc99" : "#759a58");
    }
    if (rnd(x, 45, seed) > 0.92) px(g, x, GROUND + 4, "#b39a7c");
    // pebbles
    if (rnd(x, 42, seed) > 0.97) px(g, x, GROUND + 3, "#b39a7c", 2, 1);
  }
  for (let y = GROUND; y < HORIZON; y++) {
    px(g, x0 - 1, y, C.platEdge);
    px(g, x1 + 1, y, C.platEdge);
  }
}

function flowerRound(g: Ctx, cx: number, cy: number, withStem: boolean) {
  if (withStem) {
    for (let y = cy + 3; y < GROUND; y++) px(g, cx, y, "#4a8a4f");
    px(g, cx - 2, GROUND - 3, "#4a8a4f");
    px(g, cx + 2, GROUND - 4, "#4a8a4f");
  }
  disc(g, cx, cy, 3, "#5a2f35");
  disc(g, cx, cy, 2, "#e0586a");
  px(g, cx - 1, cy - 1, "#f3a09a");
}

function drawFlowers(g: Ctx) {
  // red bloom by the left trees
  disc(g, 54, 186, 3, "#7a3a3a");
  disc(g, 54, 186, 2, "#e8665e");
  px(g, 53, 185, "#f4a898");
  // red flower with stem on the right platform
  flowerRound(g, 223, 183, true);
  // two tiny flowers beside the bucket
  for (let y = 183; y < 188; y++) px(g, 113, y, "#4a8a4f");
  px(g, 112, 180, "#f0a4a4", 3, 2);
  px(g, 113, 181, "#f6d27a");
  for (let y = 185; y < 188; y++) px(g, 109, y, "#4a8a4f");
  px(g, 109, 184, "#f0a4a4");
}

/* ------------------------------------------------------------------ */
/* rabbit, rod, bucket                                                 */
/* ------------------------------------------------------------------ */

const RX = 124; // rabbit sprite origin
const RY = 170;

const ROD_TIP: [number, number] = [160, 170];
const LINE_X = ROD_TIP[0];
const WATER_Y = 203; // where the line meets the water

function drawSprite(g: Ctx, rows: string[], colors: Record<string, string>, x0: number, y0: number) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const k = row[x];
      if (k !== "." && colors[k]) px(g, x0 + x, y0 + y, colors[k]);
    }
  });
}

function drawBucket(g: Ctx) {
  drawSprite(
    g,
    ["ooooooo", "o-----o", "o-----o", "o-----o", "ooooooo"],
    { o: "#4a4a50", "-": "#9aa6a9" },
    107,
    188,
  );
  px(g, 108, 189, "#bfc9cb", 5, 1);
  // handle
  px(g, 108, 187, "#4a4a50");
  px(g, 109, 186, "#4a4a50", 3, 1);
  px(g, 112, 187, "#4a4a50");
}

function drawRod(g: Ctx, base: Point, control: Point, tip: Point) {
  const P0 = base;
  const P1 = control;
  const P2 = tip;
  const at = (t: number): [number, number] => [
    Math.round((1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0]),
    Math.round((1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]),
  ];

  const N = 90;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const [x, y] = at(t);
    if (t < 0.16) {
      // cork handle
      px(g, x, y - 1, "#f0cc9a");
      px(g, x, y, "#c9976a");
      px(g, x, y + 1, "#8a5f3e");
    } else if (t < 0.62) {
      px(g, x, y - 1, "#a47257");
      px(g, x, y, "#6a4332");
    } else {
      px(g, x, y, "#5d3a2e");
    }
  }

  // ferrules (segment joints) and line guides
  for (const t of [0.38, 0.62]) {
    const [x, y] = at(t);
    px(g, x, y - 1, "#2f1d1a", 1, 2);
  }
  for (const t of [0.46, 0.66, 0.83]) {
    const [x, y] = at(t);
    px(g, x, y - 1, "#efe3cc");
  }

  // reel
  const [rx, ry] = at(0.24);
  disc(g, rx + 1, ry + 3, 2, (_x, _y, dx, dy) => (dx + dy < 0 ? "#c8d2d4" : "#7f8c90"));
  px(g, rx + 1, ry + 3, "#3b4448");

  // tip bead
  px(g, tip[0], tip[1] - 1, "#efe3cc");
}

function drawRabbitReflection(g: Ctx) {
  // soft reflection dashes under the rabbit
  const rip = "#3f7378";
  px(g, 127, 203, rip, 5, 1);
  px(g, 134, 205, rip, 4, 1);
  px(g, 129, 207, rip, 6, 1);
  px(g, 131, 210, rip, 4, 1);
}

/* ------------------------------------------------------------------ */
/* water                                                               */
/* ------------------------------------------------------------------ */

function drawWater(g: Ctx) {
  const y0 = HORIZON + 1;
  for (let y = y0; y < WORLD_BOTTOM; y++) {
    const t = (y - y0) / (WORLD_BOTTOM - y0);
    px(g, 0, y, mix(C.waterTop, C.waterBottom, t), SCENE_W, 1);
  }
  for (let y = y0; y < WORLD_BOTTOM; y++) {
    const count = 6 + Math.floor(rnd(y, 1, 11) * 6);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rnd(i, y, 5) * SCENE_W);
      const len = 2 + Math.floor(rnd(i, y, 6) * 8);
      const light = rnd(i, y, 7) > 0.45;
      px(g, x, y, light ? "#a3d2cf" : "#6aa3a8", len, 1);
    }
  }
  // brighter shimmer near the horizon in the middle
  for (let y = y0 + 1; y < y0 + 7; y++) {
    for (let i = 0; i < 8; i++) {
      const x = 145 + Math.floor(rnd(i, y, 21) * 60);
      px(g, x, y, "#a9d9d3", 2 + Math.floor(rnd(i, y, 22) * 7), 1);
    }
  }
}

/* ------------------------------------------------------------------ */
/* full static scene                                                   */
/* ------------------------------------------------------------------ */

function drawScene(g: Ctx, treeReference?: HTMLImageElement) {
  drawSky(g);

  [[114, 86], [240, 97], [215, 119], [197, 133], [286, 118], [335, 114]].forEach(([x, y]) =>
    star(g, x, y),
  );

  g.save();
  g.translate(0, -8);
  drawClouds(g);
  g.restore();

  bushes(g, 26, 108, 1);
  bushes(g, 212, 330, 2);

  if (treeReference) drawReferenceTrees(g, treeReference, GROUND);
  drawBirdPerch(g);
  drawFlowers(g);

  tufts(g, 9, 140, 1);
  tufts(g, 208, 333, 2);

  drawWater(g);
  platform(g, 7, 143, 1);
  platform(g, 206, 335, 2);
  px(g, 0, HORIZON, C.horizon, SCENE_W, 1);

  drawRabbitReflection(g);
}

/* ------------------------------------------------------------------ */
/* dynamic layer: ripples, droplets, butterflies                       */
/* ------------------------------------------------------------------ */

type Ripple = { x: number; y: number; age: number; life: number; maxR: number };
type Droplet = { x: number; y: number; vx: number; vy: number; landY: number };
type Butterfly = {
  cx: number;
  cy: number;
  ax: number;
  ay: number;
  speed: number;
  phase: number;
  main: string;
  tip: string;
};

const BUTTERFLIES: Butterfly[] = [
  { cx: 116, cy: 171, ax: 20, ay: 8, speed: 0.55, phase: 0, main: "#f6b8c4", tip: "#fff0f3" },
  { cx: 224, cy: 172, ax: 26, ay: 9, speed: 0.42, phase: 2.1, main: "#f8dc86", tip: "#fff8d6" },
  { cx: 44, cy: 180, ax: 14, ay: 6, speed: 0.5, phase: 4.2, main: "#bcd8ff", tip: "#f2f8ff" },
];

const GRAVITY = 230;
const MAX_RIPPLES = 40;
const MAX_DROPLETS = 64;

/** Pixelated elliptical ring (perspective: flattened vertically). */
function ring(g: Ctx, cx: number, cy: number, rx: number, ry: number, color: string) {
  const steps = Math.max(16, Math.ceil(rx * 7));
  g.fillStyle = color;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    g.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
  }
}

function drawRipple(g: Ctx, r: Ripple) {
  const p = r.age / r.life;
  if (p < 0 || p >= 1) return;
  const e = 1 - (1 - p) * (1 - p); // ease-out
  const rad = r.maxR * e;
  if (rad < 0.8) return;
  g.globalAlpha = Math.ceil((1 - p) * 4) / 4; // stepped fade keeps it pixel-y
  ring(g, r.x, r.y, rad, rad * 0.3, C.rippleLight);
  if (rad > 3) ring(g, r.x, r.y + 1, rad - 1.5, (rad - 1.5) * 0.3, C.rippleDark);
  g.globalAlpha = 1;
}

function drawButterfly(g: Ctx, b: Butterfly, t: number) {
  const a = t * b.speed + b.phase;
  const x = Math.round(b.cx + b.ax * Math.sin(a));
  const y = Math.round(b.cy + b.ay * Math.sin(a * 2) * 0.9 + Math.sin(t * 9 + b.phase) * 0.8);
  const frame = [0, 1, 2, 1][Math.floor((t * 8 + b.phase * 3) % 4)];

  if (frame === 0) {
    px(g, x - 2, y - 1, b.main, 2, 2);
    px(g, x + 1, y - 1, b.main, 2, 2);
    px(g, x - 2, y - 1, b.tip);
    px(g, x + 2, y - 1, b.tip);
    px(g, x - 1, y + 1, b.main);
    px(g, x + 1, y + 1, b.main);
  } else if (frame === 1) {
    px(g, x - 1, y - 1, b.main, 1, 2);
    px(g, x + 1, y - 1, b.main, 1, 2);
    px(g, x - 1, y - 1, b.tip);
    px(g, x + 1, y - 1, b.tip);
  } else {
    px(g, x + 1, y - 1, b.main, 1, 2);
    px(g, x + 1, y - 1, b.tip);
  }
  // body
  px(g, x, y - 1, "#4a2f33", 1, 3);
}

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export default function PixelFishingScene({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rabbitButtonRef = useRef<HTMLButtonElement>(null);
  const eagleButtonRef = useRef<HTMLButtonElement>(null);
  const eagleSpeechRef = useRef<HTMLDivElement>(null);
  const conversationStatusRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const statusId = useId();

  useEffect(() => {
    const canvas = canvasRef.current;
    const rabbitButton = rabbitButtonRef.current;
    const eagleButton = eagleButtonRef.current;
    const eagleSpeech = eagleSpeechRef.current;
    const conversationStatus = conversationStatusRef.current;
    const status = statusRef.current;
    if (!canvas || !rabbitButton || !eagleButton || !eagleSpeech || !conversationStatus || !status) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, -VIEW_TOP * RENDER_SCALE);

    // Static layer uses the same cropped world coordinates as the animation.
    const scene = document.createElement("canvas");
    scene.width = SCENE_W * RENDER_SCALE;
    scene.height = SCENE_H * RENDER_SCALE;
    const sg = scene.getContext("2d");
    if (!sg) return;
    sg.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, -VIEW_TOP * RENDER_SCALE);
    drawScene(sg);

    const treeReference = new Image();
    treeReference.onload = () => drawScene(sg, treeReference);
    treeReference.src = "/fishing-tree-reference.png";

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = motionQuery.matches;
    const fishing = createFishingCycle();
    const dialogue = createDialogue();
    let eagleChatIndex = 0;
    let lastAnnouncement = "";
    let bucketLanding = -1;

    const syncDialogue = () => {
      const line = currentLine(dialogue);
      if (line && eagleSpeech.textContent !== line.text) eagleSpeech.textContent = line.text;
      eagleSpeech.dataset.visible = String(!!line && dialogue.phase === "visible");
      if (line && dialogue.phase === "visible" && dialogue.announce) {
        const message = `Parrot: ${line.text}`;
        if (message !== lastAnnouncement) {
          conversationStatus.textContent = message;
          lastAnnouncement = message;
        }
      }
    };
    const say = (lines: SpeechLine[], mode: "ambient" | "interaction" | "catch" = "interaction") => {
      if (startDialogue(dialogue, lines, mode)) syncDialogue();
    };

    // Only phase changes touch the DOM; animation never re-renders React.
    const updateControl = (message?: string) => {
      const ready = fishing.phase === "bite";
      rabbitButton.setAttribute("aria-disabled", String(!ready));
      rabbitButton.setAttribute("aria-label", ready ? "Catch the fish" : fishing.phase === "catching" ? "Rabbit is catching a fish" : "Rabbit is waiting for a bite");
      if (message) status.textContent = message;
    };
    updateControl();

    const ripples: Ripple[] = [];
    const droplets: Droplet[] = [];

    const addRipple = (x: number, y: number, maxR: number, life: number, delay = 0) => {
      if (ripples.length >= MAX_RIPPLES) ripples.shift();
      ripples.push({ x, y, age: -delay, life, maxR });
    };
    const splash = (x: number, y: number, count = 6, force = 1) => {
      addRipple(x, y, 17 * force, 1.4);
      addRipple(x, y, 11 * force, 1.1, 0.15);
      if (reduceMotion) return;
      for (let i = 0; i < count; i++) {
        if (droplets.length >= MAX_DROPLETS) droplets.shift();
        droplets.push({
          x, y,
          vx: ((i / Math.max(1, count - 1) - 0.5) * 38 + (Math.random() - 0.5) * 6) * force,
          vy: -(40 + Math.random() * 32) * force,
          landY: y,
        });
      }
    };
    const onCatch = () => {
      if (startCatch(fishing, reduceMotion)) {
        // Clear speech before the fish emerges, leaving its existing arc visible.
        dismissDialogue(dialogue);
        syncDialogue();
        updateControl("Reeling in the fish.");
      }
    };
    rabbitButton.addEventListener("click", onCatch);
    const onEagleClick = () => say(EAGLE_CHATS[eagleChatIndex++ % EAGLE_CHATS.length]);
    const greet = () => {
      if (fishing.phase === "catching") return;
      say([{ speaker: "eagle", text: "oh, hey" }], "ambient");
    };
    const onEagleEnter = (e: PointerEvent) => { if (e.pointerType !== "touch") greet(); };
    const onEagleFocus = () => {
      if (eagleButton.matches(":focus-visible")) {
        greet();
        dialogue.announce = true;
        syncDialogue();
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") { dismissDialogue(dialogue); syncDialogue(); }
    };
    eagleButton.addEventListener("click", onEagleClick);
    eagleButton.addEventListener("pointerenter", onEagleEnter);
    eagleButton.addEventListener("focus", onEagleFocus);
    document.addEventListener("keydown", onEscape);

    /* ---- pointer interaction ---- */
    const toScene = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * SCENE_W,
        y: VIEW_TOP + ((e.clientY - rect.top) / rect.height) * SCENE_H,
      };
    };
    const inWater = (y: number) => y > HORIZON + 2 && y < WORLD_BOTTOM;

    const onPointerDown = (e: PointerEvent) => {
      const { x, y } = toScene(e);
      if (!inWater(y)) return;
      const px0 = Math.round(x);
      const py0 = Math.round(y);

      splash(px0, py0);
    };

    const onPointerMove = (e: PointerEvent) => {
      const { y } = toScene(e);
      canvas.style.cursor = inWater(y) ? "pointer" : "default";
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);

    /* ---- animation loop ---- */
    let raf = 0;
    let last = performance.now();
    let clock = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      const t = reduceMotion ? 0.8 : clock; // frozen idle phase when reduced
      const events = advanceFishing(fishing, dt);
      if (events.bite) {
        updateControl("A fish is biting! Activate the rabbit to catch it.");
        splash(LINE_X, WATER_Y, 4, 0.45);
      }
      if (events.splash) splash(LINE_X, WATER_Y, 12, 1.1);
      if (events.landed) {
        bucketLanding = clock;
        updateControl(`Fish in the bucket! ${fishing.caught} ${fishing.caught === 1 ? "fish caught" : "fish caught so far"}.`);
      }
      if (events.reset) {
        updateControl();
        say([{ speaker: "eagle", text: "nice catch!" }], "catch");
      }
      if (advanceDialogue(dialogue, dt)) syncDialogue();
      const pose = fishingPose(fishing, reduceMotion);

      ctx.clearRect(0, VIEW_TOP, SCENE_W, SCENE_H);
      ctx.drawImage(scene, 0, VIEW_TOP, SCENE_W, SCENE_H);
      const speakingEagle = dialogue.phase === "visible" && currentLine(dialogue)?.speaker === "eagle";
      drawFishingBird(ctx, t, reduceMotion, speakingEagle, fishing.phase === "bite", bucketLanding >= 0 && clock - bucketLanding < 2.5);

      // Body and eye share a pivot so the blink stays attached during the pull.
      const rabbitPose = () => {
        ctx.translate(134, 191);
        ctx.rotate(pose.lean);
        ctx.translate(-134, -191);
      };
      ctx.save();
      rabbitPose();
      drawFishingRabbit(ctx, RX, RY);
      const expression = fishing.phase === "bite" ? "alert"
        : fishing.phase !== "catching" ? "idle"
        : fishing.elapsed >= (fishing.reducedCatch ? 0.12 : CATCH_TIMING.land) ? "happy"
        : fishing.elapsed < CATCH_TIMING.release ? "effort" : "alert";
      drawFishingRabbitEye(ctx, RX, RY, !reduceMotion && t % 4.2 < 0.14, expression);
      ctx.restore();
      drawRod(ctx, pose.base, pose.control, pose.tip);
      ctx.save();
      rabbitPose();
      drawFishingRabbitPaw(ctx, RX, RY);
      ctx.restore();

      // Taut on the lift, then a slack curve that follows the returning hook.
      if (pose.catching || fishing.phase === "bite") {
        ctx.strokeStyle = "#5a5149";
        ctx.lineWidth = 0.65;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(pose.tip[0] + 0.5, pose.tip[1] + 0.5);
        ctx.bezierCurveTo(
          pose.tip[0] + pose.bend, pose.tip[1] + 9,
          pose.hook[0] + pose.bend, pose.hook[1] - 10,
          pose.hook[0], pose.hook[1],
        );
        ctx.stroke();
      } else {
        px(ctx, LINE_X, ROD_TIP[1] + 1, "#4b3a3a", 1, WATER_Y - ROD_TIP[1] - 1);
      }

      // water-only layer: line below surface + ripples
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, HORIZON + 1, SCENE_W, WORLD_BOTTOM - HORIZON - 1);
      ctx.clip();

      for (let y = WATER_Y; !pose.catching && y < WATER_Y + 8; y++) {
        const sway = reduceMotion ? 0 : Math.round(Math.sin(t * 1.3 + y * 0.45) * 0.6);
        px(ctx, LINE_X + sway, y, "#3f7378");
      }

      // endless ripples where the line meets the water (two, half a cycle apart)
      const life = 2.8;
      for (let k = 0; k < 2; k++) {
        drawRipple(ctx, {
          x: LINE_X,
          y: WATER_Y,
          age: (t + (k * life) / 2) % life,
          life,
          maxR: 11,
        });
      }

      // click ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.age += dt;
        if (r.age >= r.life) ripples.splice(i, 1);
        else drawRipple(ctx, r);
      }
      ctx.restore();

      // droplets
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt + 0.5 * GRAVITY * dt * dt;
        d.vy += GRAVITY * dt;
        if (d.vy > 0 && d.y >= d.landY) {
          addRipple(Math.round(d.x), d.landY, 4, 0.6);
          droplets.splice(i, 1);
          continue;
        }
        ctx.fillStyle = "#7daead";
        ctx.fillRect(d.x, d.y, 0.8, Math.min(2.5, 1 + Math.abs(d.vy) / 65));
        ctx.fillStyle = "#f4fffd";
        ctx.fillRect(d.x, d.y, 0.8, 0.8);
      }

      if (pose.catching) drawCaughtFish(ctx, fishing.elapsed);
      // Draw last: the front wall hides the fish instead of letting it pop away.
      ctx.save();
      const landingAge = bucketLanding < 0 ? -1 : clock - bucketLanding;
      if (!reduceMotion && landingAge >= 0 && landingAge < 0.36) {
        ctx.translate(0, Math.sin(landingAge / 0.36 * Math.PI) * 0.65);
      }
      drawBucket(ctx);
      ctx.restore();
      if (reduceMotion && landingAge >= 0 && landingAge < 0.7) {
        // A quiet confirmation in place of the airborne sequence.
        ctx.fillStyle = "#6b978a";
        ctx.fillRect(108, 185, 4, 1.5);
      }

      if (fishing.phase === "bite") {
        const cueAge = fishing.elapsed;
        const rise = reduceMotion ? 0 : Math.exp(-cueAge * 9) * 3;
        const bob = reduceMotion ? 0 : Math.sin(cueAge * 3) * 0.5;
        ctx.save();
        ctx.translate(130, 158 + rise + bob);
        // Warm cream outline keeps the coral cue readable against trees/clouds.
        ctx.fillStyle = "#fff3d6";
        ctx.fillRect(-1, -1, 4, 8);
        ctx.fillRect(-1, 8, 4, 4);
        ctx.fillStyle = "#ad6052";
        ctx.fillRect(0, 0, 2, 6);
        ctx.fillRect(0, 9, 2, 2);
        ctx.restore();
      }

      // butterflies
      for (const b of BUTTERFLIES) drawButterfly(ctx, b, t);

      if (running) raf = requestAnimationFrame(loop);
    };
    let inView = false;
    let running = false;
    const syncPlayback = () => {
      const shouldRun = inView && !document.hidden;
      if (shouldRun === running) return;
      running = shouldRun;
      if (running) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      } else cancelAnimationFrame(raf);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", syncPlayback);
    const onMotionChange = () => {
      reduceMotion = motionQuery.matches;
      if (reduceMotion) droplets.length = 0;
    };
    motionQuery.addEventListener("change", onMotionChange);

    return () => {
      treeReference.onload = null;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      rabbitButton.removeEventListener("click", onCatch);
      eagleButton.removeEventListener("click", onEagleClick);
      eagleButton.removeEventListener("pointerenter", onEagleEnter);
      eagleButton.removeEventListener("focus", onEagleFocus);
      document.removeEventListener("keydown", onEscape);
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      motionQuery.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", styles.scene, className)}>
      <canvas
        ref={canvasRef}
        width={SCENE_W * RENDER_SCALE}
        height={SCENE_H * RENDER_SCALE}
        className="block h-auto w-full touch-manipulation [image-rendering:pixelated]"
        aria-label="Pixel art of a rabbit fishing and a blue-and-yellow parrot perched in the pines across the pond. Talk to the bird, or activate the rabbit when an exclamation mark signals a bite. Click the water to make a splash."
        role="img"
      />
      <button
        ref={rabbitButtonRef}
        type="button"
        className={styles.rabbitTarget}
        aria-label="Rabbit is waiting for a bite"
        aria-disabled="true"
        aria-describedby={statusId}
      />
      <button
        ref={eagleButtonRef}
        type="button"
        className={styles.eagleTarget}
        aria-label="Talk to the bird"
      />
      <div ref={eagleSpeechRef} className={cn(styles.speechBubble, styles.eagleSpeech)} data-visible="false" aria-hidden="true" />
      <span ref={conversationStatusRef} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      <span ref={statusRef} id={statusId} className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Wait for the exclamation mark, then click the rabbit or press Enter or Space to catch a fish.
      </span>
    </div>
  );
}
