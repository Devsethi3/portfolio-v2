"use client"

import { useEffect, useRef } from "react"

type SceneObject = { id: string; x: number; y: number; w: number; h: number; onClick?: (p: { x: number; y: number }) => void }
type Ripple = { x: number; y: number; age: number }
type SmokeParticle = { x: number; y: number; age: number; ph: number }
type PixelSpan = ["O" | "D" | "W" | "K", number, number, number]
type Star = { x: number; y: number; ph: number; sp: number; big: boolean }
type Firefly = { bx: number; by: number; ax: number; ay: number; sp: number; ph: number }
type Leaf = { x: number; y: number; vy: number; ph: number; col: string }
type Shimmer = { x: number; y: number; len: number; ph: number; sp: number }
type Reed = { x: number; len: number; ph: number }
type SceneState = { W: number; H: number; HORIZON: number; ctx: CanvasRenderingContext2D; objects: SceneObject[]; ripples: Ripple[]; stars: Star[]; flies: Firefly[]; leaves: Leaf[]; getHover: () => SceneObject | null }

declare global {
  interface Window { scene?: SceneState }
}

export function MoonlitDock() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
/* =====================================================================
   MOONLIT DOCK — pixel scene on a 320x200 buffer, scaled up by CSS.

   STRUCTURE
   1. Setup + helpers
   2. Static layers (pre-rendered once): sky, land, bank, water, dock
   3. Dynamic stuff (redrawn every frame): stars, moon, reflections,
      glows, smoke, fox, reeds, leaves, fireflies, ripples
   4. Interaction hooks: `objects` (hit boxes) + pointer handlers
   Everything is exposed on window.scene for experimenting.
   ===================================================================== */

/* ---------- 1. SETUP ---------- */
const W = 320, H = 200, HORIZON = 120;
const canvasElement = canvasRef.current;
if (!canvasElement) return;
const canvas: HTMLCanvasElement = canvasElement;
const context = canvas.getContext('2d');
if (!context) return;
const ctx: CanvasRenderingContext2D = context;
const listenerController = new AbortController();
const { signal } = listenerController;
canvas.width = W; canvas.height = H;
ctx.imageSmoothingEnabled = false;

function makeLayer() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (!g) throw new Error('Canvas 2D is not available');
  g.imageSmoothingEnabled = false;
  return { c, g };
}
function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) { g.fillStyle = col; g.fillRect(x, y, w, h); }

function mulberry32(a: number) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1337);           // seeded => same scene every load
const rr = (a: number, b: number) => a + rand() * (b - a);
const ri = (a: number, b: number) => Math.floor(rr(a, b + 1));

/* Horizontal color bands with dithered seams (classic pixel-art gradient) */
function bands(g: CanvasRenderingContext2D, y0: number, y1: number, colors: string[], bh: number) {
  for (let y = y0; y < y1; y++) {
    const i = Math.min(colors.length - 1, Math.floor((y - y0) / bh));
    const r = (y - y0) % bh;
    const next = colors[i + 1];
    for (let x = 0; x < W; x++) {
      let col = colors[i];
      if (next && r >= bh - 3) {
        const k = r - (bh - 3);
        const on = k === 0 ? ((x + y) % 4 === 0) : k === 1 ? ((x + y) % 2 === 0) : ((x + y) % 4 !== 0);
        if (on) col = next;
      }
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
  }
}

/* Pixel pine: stacked tiers, lit on the right (moon side), shaded on the left */
function pine(g: CanvasRenderingContext2D, cx: number, baseY: number, h: number, w: number, body: string, light: string, dark: string) {
  const trunk = Math.max(2, Math.round(h * 0.08));
  const bodyH = h - trunk;
  const tiers = Math.max(2, Math.round(bodyH / 9));
  const th = bodyH / tiers;
  for (let row = 0; row < bodyH; row++) {
    const ti = Math.min(tiers - 1, Math.floor(row / th));
    const t = (row - ti * th) / th;
    const maxHW = (w / 2) * ((ti + 1.4) / (tiers + 0.4));
    const hw = Math.max(0, Math.round(maxHW * (0.3 + 0.7 * t)));
    const y = baseY - h + row;
    for (let x = -hw; x <= hw; x++) {
      if (t > 0.8 && Math.abs(x) === hw && (row + x) % 2 === 0) continue; // ragged hem
      let col = body;
      if (x >= hw - 1 && hw > 1) col = light;
      else if (x <= -hw + 1 && hw > 1) col = dark;
      g.fillStyle = col; g.fillRect(cx + x, y, 1, 1);
    }
  }
  g.fillStyle = dark; g.fillRect(cx - 1, baseY - trunk, 2, trunk);
}

/* Ragged pixel circle for leaf canopies */
function blob(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string) {
  g.fillStyle = col;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y);
    if (d <= r - 1 || (d <= r && rand() < 0.55)) g.fillRect(cx + x, cy + y, 1, 1);
  }
}

/* Pre-rendered soft glow sprite (cheap to flicker with globalAlpha) */
function makeGlow(r: number, rgb: string) {
  const c = document.createElement('canvas');
  c.width = c.height = r * 2 + 1;
  const g = c.getContext('2d');
  if (!g) throw new Error('Canvas 2D is not available');
  if (!g) throw new Error('Canvas 2D is not available');
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y) / r;
    if (d < 1) {
      const a = Math.round(Math.pow(1 - d, 2) * 10) / 10 * 0.6;   // quantized = pixel-y falloff
      if (a > 0) { g.fillStyle = `rgba(${rgb},${a})`; g.fillRect(x + r, y + r, 1, 1); }
    }
  }
  return c;
}

/* ---------- 2. STATIC LAYERS ---------- */
const sky = makeLayer(), land = makeLayer(), bank = makeLayer(),
      water = makeLayer(), dock = makeLayer(), refl = makeLayer(), vig = makeLayer();

/* Sky */
bands(sky.g, 0, HORIZON,
  ['#090c24', '#0f1438', '#161c4a', '#1f2760', '#2b3175', '#3a3c86', '#4c4796'], 17);

/* Far shore: two hill silhouettes, tiny pines, mist */
function hills(g: CanvasRenderingContext2D, fn: (x: number) => number, col: string) {
  g.fillStyle = col;
  for (let x = 0; x < W; x++) { const t = Math.round(fn(x)); g.fillRect(x, t, 1, HORIZON - t); }
}
hills(land.g, x => 100 + Math.sin(x * 0.018 + 0.5) * 6 + Math.sin(x * 0.05 + 1) * 3, '#2e316f');
hills(land.g, x => 109 + Math.sin(x * 0.027 + 2) * 4 + Math.sin(x * 0.09) * 2, '#22275c');
for (let x = 2; x < W; x += rr(5, 10)) {
  const h = ri(9, 20);
  pine(land.g, Math.round(x), HORIZON, h, Math.round(h * 0.45) + 2, '#171c4c', '#1d2358', '#12163f');
}
for (let i = 0; i < 8; i++) rect(land.g, 0, HORIZON - 8 + i, W, 1, `rgba(150,150,220,${(0.03 + i * 0.012).toFixed(3)})`);

/* Source for the water reflection = sky + far shore */
refl.g.drawImage(sky.c, 0, 0);
refl.g.drawImage(land.c, 0, 0);

/* Water base */
bands(water.g, HORIZON, H, ['#2c3380', '#252a6e', '#1f2560', '#181d50', '#121744', '#0d1236'], 14);

/* Left bank (ground + trees + cabin + lantern) */
const topY = (x: number) => x < 110 ? 118 : 118 + (x - 110) * 0.18;
const shoreY = (x: number) => 136 - x * 0.07 + Math.sin(x * 0.07) * 1.5;
const BANK_END = 151;

(function buildBank() {
  const g = bank.g;

  // ground
  for (let x = 0; x <= BANK_END; x++) {
    const t = Math.round(topY(x)), s = Math.round(shoreY(x));
    if (s <= t) continue;
    for (let y = t; y < s; y++) {
      const d = s - y;
      let col = '#17303a';
      if (y - t < 2) col = '#2d5a4e';
      else if (y - t < 4) col = '#214540';
      if (d <= 2 || (d <= 3 && x % 2 === 0)) col = '#0e1d26';
      rect(g, x, y, 1, 1, col);
    }
  }
  // soft shadow on the water along the shore
  for (let x = 0; x <= BANK_END; x++) {
    const s = Math.round(shoreY(x));
    for (let k = 0; k < 7; k++) rect(g, x, s + k, 1, 1, `rgba(6,10,28,${(0.45 * (1 - k / 7)).toFixed(2)})`);
  }
  // back grass tufts
  for (let x = 1; x < 150; x += 3) {
    const t = Math.round(topY(x)), h = ri(1, 3);
    rect(g, x, t - h, 1, h, '#2f6a52');
  }

  // pines behind the cabin
  const NB = '#16314a', NL = '#3b6f86', ND = '#0f2133';
  pine(g, 40, 126, 46, 20, NB, NL, ND);
  pine(g, 120, 130, 52, 24, NB, NL, ND);
  pine(g, 137, 126, 38, 18, NB, NL, ND);
  pine(g, 149, 122, 24, 12, NB, NL, ND);

  // autumn maple
  rect(g, 20, 112, 3, 20, '#2a1620');
  rect(g, 17, 128, 9, 4, '#2a1620');
  blob(g, 22, 100, 14, '#8a2f1c');
  blob(g, 14, 106, 10, '#a63d1d');
  blob(g, 31, 105, 10, '#a63d1d');
  blob(g, 22, 96, 10, '#c4561f');
  blob(g, 17, 100, 6, '#e0802a');
  blob(g, 28, 99, 6, '#e0802a');
  for (let i = 0; i < 40; i++) {
    const a = rand() * 6.283, rad = rand() * 11;
    rect(g, Math.round(24 + Math.cos(a) * rad), Math.round(98 + Math.sin(a) * rad * 0.9), 1, 1, '#f2a23a');
  }

  // cabin
  const x0 = 50, x1 = 100, base = 128, top = 112;
  rect(g, 92, 94, 5, 18, '#4a4a63');                       // chimney (behind roof)
  rect(g, 91, 93, 7, 2, '#363650');
  for (let y = 96; y < 110; y += 3) rect(g, 92, y, 5, 1, '#3a3a52');
  for (let y = top; y < base; y++) {                        // log walls
    const row = Math.floor((y - top) / 3);
    rect(g, x0, y, x1 - x0, 1, row % 2 === 0 ? '#6a4030' : '#5a3425');
    if ((y - top) % 3 === 2) rect(g, x0, y, x1 - x0, 1, '#3d2118');
  }
  for (let y = top; y < base; y += 3) { rect(g, x0 - 1, y, 2, 2, '#7d5038'); rect(g, x1 - 1, y, 2, 2, '#7d5038'); }
  const peak = 92, eave = 112;                              // roof
  for (let y = peak; y <= eave; y++) {
    const hw = Math.round((y - peak) / (eave - peak) * 33);
    for (let x = -hw; x <= hw; x++) {
      let col = (y - peak) % 3 === 2 ? '#2f1b2d' : '#3a2236';
      if (x >= hw - 1 && hw > 2) col = '#5a3550';
      rect(g, 75 + x, y, 1, 1, col);
    }
  }
  rect(g, 42, eave, 67, 2, '#241524');
  rect(g, 73, 102, 5, 5, '#3d2118'); rect(g, 74, 103, 3, 3, '#d9a24a');   // attic window
  rect(g, 60, 118, 8, 10, '#24141a'); rect(g, 60, 118, 8, 1, '#4a2c24');   // door
  rect(g, 66, 123, 1, 1, '#e0b060'); rect(g, 58, 128, 12, 1, '#3a2a2a');
  rect(g, 77, 126, 15, 1, '#7d5038');                                       // window sill
  rect(g, 78, 117, 13, 9, '#3d2118');
  rect(g, 79, 118, 5, 7, '#ffd27a'); rect(g, 85, 118, 5, 7, '#ffd27a');
  rect(g, 79, 118, 5, 1, '#fff0b8'); rect(g, 85, 118, 5, 1, '#fff0b8');

  // lantern post (left of cabin)
  rect(g, 44, 122, 2, 8, '#2a1a1f');
  rect(g, 42, 116, 6, 6, '#3d2118'); rect(g, 43, 117, 4, 4, '#ffcf6b');

  // front tufts at the shoreline
  for (let x = 2; x < 148; x += 4) {
    const s = Math.round(shoreY(x)) - 3, h = ri(1, 3);
    rect(g, x, s - h, 1, h, '#2f6a52');
    if (rand() < 0.4) rect(g, x + 1, s - h + 1, 1, h - 1, '#3a7a5c');
  }
})();

/* Dock */
(function buildDock() {
  const g = dock.g, x0 = 196, top = 148;
  for (const px of [200, 236, 272, 308]) {                  // posts (drawn first, planks overlap)
    rect(g, px, 150, 3, 20, '#2c1a14');
    rect(g, px, 150, 1, 20, '#4a2e22');
    rect(g, px + 2, 150, 1, 20, '#1c0f0c');
  }
  rect(g, x0, top, W - x0, 4, '#74503a');                    // planks
  for (let x = x0; x < W; x += 9) rect(g, x, top, 1, 4, '#4a3022');
  rect(g, x0, top, W - x0, 1, '#8a6247');
  rect(g, x0, top + 4, W - x0, 3, '#2e1b15');
  rect(g, x0, top + 4, W - x0, 1, '#463024');
  rect(g, x0 - 1, top, 1, 7, '#2e1b15');
  rect(g, 197, 136, 3, 12, '#3a2418');                       // end post + lantern
  rect(g, 195, 130, 7, 1, '#2a1a1f');
  rect(g, 195, 131, 7, 6, '#3d2118'); rect(g, 196, 132, 5, 4, '#ffcf6b');
  rect(g, 214, 148, 18, 1, 'rgba(0,0,0,0.3)');               // fox shadow
})();

/* Vignette */
(function () {
  const gr = vig.g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.65);
  gr.addColorStop(0, 'rgba(0,0,10,0)'); gr.addColorStop(1, 'rgba(0,0,10,0.45)');
  vig.g.fillStyle = gr; vig.g.fillRect(0, 0, W, H);
})();

/* Moon sprite (crescent + glow) */
const MOON = { x: 240, y: 38 };
const moonSprite = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  if (!g) throw new Error('Canvas 2D is not available');
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const d = Math.hypot(x - 24, y - 24);
    const inA = d <= 12;
    const inB = Math.hypot(x - 24 - 5, y - 24 + 3) <= 11;
    if (inA && !inB) { g.fillStyle = d > 10 ? '#f3e2a8' : '#fff3c8'; g.fillRect(x, y, 1, 1); }
    else if (d < 23) {
      const dd = Math.max(d, 12);
      const a = Math.pow(1 - (dd - 12) / 11, 2) * 0.22;
      if (a > 0.02) { g.fillStyle = `rgba(255,240,190,${a.toFixed(3)})`; g.fillRect(x, y, 1, 1); }
    }
  }
  return c;
})();

/* Glow sprites */
const glowWindow = makeGlow(24, '255,190,90');
const glowLantern = makeGlow(14, '255,190,90');
const glowFly = makeGlow(6, '255,240,140');

/* ---------- 3. DYNAMIC STATE ---------- */
const stars: Star[] = [];
while (stars.length < 70) {
  const x = ri(2, W - 3), y = ri(2, 92);
  if (Math.hypot(x - MOON.x, y - MOON.y) < 28) continue;
  stars.push({ x, y, ph: rr(0, 6.28), sp: rr(0.6, 2.2), big: rand() < 0.12 });
}
const shimmer: Shimmer[] = [];
for (let i = 0; i < 46; i++) {
  const y = HORIZON + 3 + rand() * 75;
  shimmer.push({ x: rand() * W, y: Math.round(y), len: 2 + Math.floor(((y - HORIZON) / 80) * 8 * rand()), ph: rr(0, 6.28), sp: rr(0.8, 2) });
}
const reeds: Reed[] = [];
for (let i = 0; i < 14; i++) reeds.push({ x: 4 + i * 3 + ri(0, 1), len: ri(20, 36), ph: rr(0, 6.28) });
for (let i = 0; i < 9; i++) reeds.push({ x: 286 + i * 3 + ri(0, 1), len: ri(14, 28), ph: rr(0, 6.28) });
const flies: Firefly[] = [];
for (let i = 0; i < 16; i++) flies.push({ bx: rr(14, 306), by: rr(95, 170), ax: rr(8, 26), ay: rr(4, 14), sp: rr(0.3, 0.8), ph: rr(0, 6.28) });
const leafCols = ['#e0802a', '#c4561f', '#f2a23a'];
const leaves: Leaf[] = [];
for (let i = 0; i < 12; i++) leaves.push({ x: rr(0, W), y: rr(-20, 120), vy: rr(7, 13), ph: rr(0, 6.28), col: leafCols[i % 3] });
const smoke: SmokeParticle[] = [];
let smokeTimer = 0;
const ripples: Ripple[] = [];

/* Fox sprite as colored spans: [color, row, x0, x1] */
const FX = 212, FY = 133;
const FOX_COL = { O: '#e8742c', D: '#b4491b', W: '#f6ecd9', K: '#1d1424' };
const FOX_BODY: PixelSpan[] = [
  ['K', 0, 3, 3], ['K', 1, 2, 4], ['O', 1, 3, 3],
  ['O', 2, 2, 9], ['O', 3, 1, 10], ['O', 4, 0, 10], ['W', 4, 1, 2], ['K', 4, 0, 0],
  ['W', 5, 1, 9], ['W', 6, 2, 8], ['O', 6, 9, 12],
  ['W', 7, 3, 6], ['O', 7, 7, 13],
  ['W', 8, 3, 6], ['O', 8, 7, 14],
  ['W', 9, 4, 6], ['O', 9, 7, 15],
  ['W', 10, 4, 6], ['O', 10, 7, 15],
  ['W', 11, 4, 6], ['D', 11, 7, 15],
  ['K', 12, 4, 5], ['D', 12, 7, 15],
  ['K', 13, 4, 5], ['D', 13, 8, 15],
  ['K', 14, 3, 6], ['K', 14, 9, 15],
];
const FOX_EAR2: PixelSpan[] = [['K', 0, 8, 8], ['K', 1, 7, 9], ['O', 1, 8, 8]];
const FOX_TAIL: PixelSpan[] = [['O', 13, 15, 17], ['O', 12, 16, 18], ['O', 11, 17, 19], ['O', 10, 18, 19], ['O', 9, 18, 19], ['W', 8, 18, 19], ['W', 7, 18, 19]];
let foxTwitch = 0;

function spans(list: PixelSpan[], ox: number, oy: number, shiftFn?: (y: number) => number) {
  for (const [c, y, a, b] of list) {
    const s = shiftFn ? shiftFn(y) : 0;
    ctx.fillStyle = FOX_COL[c];
    ctx.fillRect(ox + a + s, oy + y, b - a + 1, 1);
  }
}
function drawFox(t: number) {
  const sway = Math.floor(t * 1.4) % 2;
  const blink = (t % 4.3) < 0.12;
  const twitch = foxTwitch > 0 || (t % 7) < 0.15;
  spans(FOX_BODY, FX, FY);
  ctx.fillStyle = blink ? FOX_COL.O : FOX_COL.K; ctx.fillRect(FX + 3, FY + 4, 1, 1);   // eye
  spans(FOX_EAR2, FX + (twitch ? 1 : 0), FY);
  spans(FOX_TAIL, FX, FY, y => (y <= 10 ? sway : 0));
}

/* ---------- Draw helpers ---------- */
function drawStars(t: number) {
  for (const s of stars) {
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    ctx.globalAlpha = 0.3 + 0.7 * tw;
    ctx.fillStyle = '#dfe6ff';
    ctx.fillRect(s.x, s.y, 1, 1);
    if (s.big && tw > 0.8) {
      ctx.fillRect(s.x - 1, s.y, 1, 1); ctx.fillRect(s.x + 1, s.y, 1, 1);
      ctx.fillRect(s.x, s.y - 1, 1, 1); ctx.fillRect(s.x, s.y + 1, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}
function drawMoon(t: number) {
  ctx.globalAlpha = 0.92 + 0.08 * Math.sin(t * 0.8);
  ctx.drawImage(moonSprite, MOON.x - 24, MOON.y - 24);
  ctx.globalAlpha = 1;
}
function drawReflection(t: number) {
  const N = 70;
  for (let dy = 0; dy < N; dy++) {
    const sy = HORIZON - 1 - Math.floor(dy * 0.9);
    if (sy < 0) break;
    const off = Math.round(Math.sin(t * 1.6 + dy * 0.55) * (0.6 + dy * 0.035));
    ctx.globalAlpha = 0.38 * (1 - dy / N);
    ctx.drawImage(refl.c, 0, sy, W, 1, off, HORIZON + dy, W, 1);
  }
  ctx.globalAlpha = 1;
}
function drawMoonReflection(t: number) {
  for (let dy = 0; dy < 46; dy += 2) {
    if (Math.sin(dy * 1.7 + t * 1.2) > 0.6) continue;
    const w = Math.max(2, Math.round(11 - dy * 0.17));
    const off = Math.round(Math.sin(t * 2 + dy * 0.5) * 2);
    ctx.fillStyle = `rgba(255,240,190,${(0.55 - dy / 100).toFixed(2)})`;
    ctx.fillRect(MOON.x - (w >> 1) + off, HORIZON + 2 + dy, w, 1);
  }
}
function drawShimmer(t: number) {
  ctx.fillStyle = '#9aa6ff';
  for (const s of shimmer) {
    const a = Math.max(0, Math.sin(t * s.sp + s.ph)) * 0.35;
    if (a < 0.03) continue;
    ctx.globalAlpha = a;
    ctx.fillRect(Math.round(s.x), s.y, Math.max(2, s.len), 1);
  }
  ctx.globalAlpha = 1;
}
function ring(cx: number, cy: number, rx: number, ry: number, alpha: number, col: string) {
  ctx.fillStyle = col; ctx.globalAlpha = alpha;
  for (let a = 0; a < 6.283; a += 0.06) ctx.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
  ctx.globalAlpha = 1;
}
function drawPostRipples(t: number) {
  for (const px of [200, 236, 272, 308]) {
    const p = (t * 0.6 + px * 0.13) % 1;
    const rx = 2 + p * 7;
    ring(px + 1, 170, rx, rx * 0.35, 0.4 * (1 - p), '#aab4ff');
  }
}
function drawRipples(dt: number) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]; r.age += dt;
    if (r.age > 1.6) { ripples.splice(i, 1); continue; }
    const rx = 2 + r.age * 18;
    ring(r.x, r.y, rx, rx * 0.3, 0.7 * (1 - r.age / 1.6), '#cdd5ff');
  }
}
function flicker(t: number, seed: number) { return 0.8 + 0.1 * Math.sin(t * 9 + seed) + 0.1 * Math.sin(t * 13.3 + seed * 2); }
function drawGlows(t: number) {
  ctx.globalAlpha = flicker(t, 0) * 0.9;
  ctx.drawImage(glowWindow, 84 - 24, 121 - 24);
  ctx.globalAlpha = flicker(t, 3);
  ctx.drawImage(glowLantern, 45 - 14, 119 - 14);
  ctx.globalAlpha = flicker(t, 7);
  ctx.drawImage(glowLantern, 198 - 14, 134 - 14);
  ctx.globalAlpha = 1;
}
function drawSmoke(dt: number) {
  smokeTimer -= dt;
  if (smokeTimer <= 0) { smoke.push({ x: 94, y: 92, age: 0, ph: rr(0, 6.28) }); smokeTimer = 0.6; }
  for (let i = smoke.length - 1; i >= 0; i--) {
    const p = smoke[i]; p.age += dt;
    if (p.age > 4) { smoke.splice(i, 1); continue; }
    p.y -= 6 * dt; p.x += (3 + p.age * 2) * dt + Math.sin(p.age * 2 + p.ph) * 0.15;
    const s = 1 + Math.floor(p.age * 0.9);
    ctx.globalAlpha = 0.35 * (1 - p.age / 4);
    ctx.fillStyle = '#9a9ec8';
    ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
  }
  ctx.globalAlpha = 1;
}
function drawReeds(t: number) {
  for (const r of reeds) {
    for (let i = 0; i < r.len; i++) {
      const ox = Math.round(Math.sin(t * 1.3 + r.ph) * i * 0.07);
      ctx.fillStyle = i > r.len * 0.6 ? '#1c4a48' : '#0f2d33';
      ctx.fillRect(r.x + ox, H - 1 - i, 1, 1);
    }
    const tx = r.x + Math.round(Math.sin(t * 1.3 + r.ph) * r.len * 0.07);
    ctx.fillStyle = '#6b3b24'; ctx.fillRect(tx, H - r.len - 4, 2, 5);
  }
}
function drawLeaves(t: number, dt: number) {
  for (const l of leaves) {
    l.y += l.vy * dt;
    l.x += (Math.sin(t * 1.4 + l.ph) * 10 + 5) * dt;
    if (l.y > HORIZON + 40) { l.y = -6; l.x = rr(0, W); }
    if (l.x > W + 4) l.x = -4;
    ctx.fillStyle = l.col;
    ctx.fillRect(Math.round(l.x), Math.round(l.y), 2, 1);
    ctx.fillRect(Math.round(l.x) + 1, Math.round(l.y) + 1, 1, 1);
  }
}
function drawFireflies(t: number) {
  for (const f of flies) {
    const x = f.bx + Math.sin(t * f.sp + f.ph) * f.ax;
    const y = f.by + Math.cos(t * f.sp * 0.8 + f.ph) * f.ay;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + f.ph * 3);
    ctx.globalAlpha = 0.25 + 0.55 * pulse;
    ctx.drawImage(glowFly, Math.round(x) - 6, Math.round(y) - 6);
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.fillStyle = '#fff3a0'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

/* ---------- FRAME ---------- */
function frame(t: number, dt: number) {
  if (foxTwitch > 0) foxTwitch -= dt;
  ctx.drawImage(sky.c, 0, 0);
  drawStars(t);
  drawMoon(t);
  ctx.drawImage(land.c, 0, 0);
  ctx.drawImage(water.c, 0, 0);
  drawReflection(t);
  drawMoonReflection(t);
  drawShimmer(t);
  ctx.drawImage(bank.c, 0, 0);
  drawGlows(t);
  drawSmoke(dt);
  ctx.drawImage(dock.c, 0, 0);
  drawPostRipples(t);
  drawRipples(dt);
  drawFox(t);
  drawReeds(t);
  drawLeaves(t, dt);
  drawFireflies(t);
  ctx.drawImage(vig.c, 0, 0);
}

/* ---------- 4. INTERACTION HOOKS ---------- */
/* Hit boxes in buffer coordinates (320x200). Add `onClick` / `onHover` per object. */
const objects: SceneObject[] = [
  { id: 'moon',         x: MOON.x - 14, y: MOON.y - 14, w: 28, h: 28 },
  { id: 'cabin',        x: 42,  y: 92,  w: 68, h: 38 },
  { id: 'lantern-yard', x: 42,  y: 116, w: 6,  h: 14 },
  { id: 'lantern-dock', x: 195, y: 130, w: 7,  h: 18 },
  { id: 'fox',          x: FX,  y: FY,  w: 20, h: 15, onClick: () => { foxTwitch = 0.6; } },
];
let hover: SceneObject | null = null;
function toBuf(e: PointerEvent) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
function pick(p: { x: number; y: number }): SceneObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (p.x >= o.x && p.x < o.x + o.w && p.y >= o.y && p.y < o.y + o.h) return o;
  }
  return null;
}
canvas.addEventListener('pointermove', e => {
  hover = pick(toBuf(e));
  canvas.style.cursor = hover ? 'pointer' : 'default';
}, { signal });
canvas.addEventListener('pointerdown', e => {
  const p = toBuf(e), o = pick(p);
  if (o && o.onClick) o.onClick(p);
  else if (p.y > HORIZON) ripples.push({ x: p.x, y: p.y, age: 0 });   // click water => ripple
}, { signal });

/* Loop */
let last = performance.now(), T = 0, raf = 0, disposed = false;
function loop(now: number) {
  if (disposed) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; T += dt;
  frame(T, dt);
  raf = requestAnimationFrame(loop);
}
const scene: SceneState = { W, H, HORIZON, ctx, objects, ripples, stars, flies, leaves, getHover: () => hover };
window.scene = scene;
raf = requestAnimationFrame(loop);

return () => {
  disposed = true;
  cancelAnimationFrame(raf);
  listenerController.abort();
  if (window.scene === scene) delete window.scene;
};

  }, [])

  return (
    <section className="grid w-full place-items-center overflow-hidden bg-[#05071a]">
      <canvas ref={canvasRef} id="scene" aria-label="Interactive pixel-art moonlit dock" role="img" className="block aspect-[16/10] w-full [image-rendering:pixelated] [image-rendering:crisp-edges]" style={{ imageRendering: "crisp-edges" }} />
    </section>
  )
}

