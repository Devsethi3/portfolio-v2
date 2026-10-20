/** Seconds on the visible scene's clock; no timers survive a pause or unmount. */
export const CATCH_TIMING = { splash: 0.2, release: 0.78, land: 1.3, hide: 1.52, end: 2.35 };
export type FishingPhase = "waiting" | "bite" | "catching";
export type FishingCycle = {
  phase: FishingPhase;
  elapsed: number;
  wait: number;
  reducedCatch: boolean;
  caught: number;
};
export type Point = readonly [number, number];

export function createFishingCycle(random = Math.random): FishingCycle {
  return { phase: "waiting", elapsed: 0, wait: 2 + random() * 2, reducedCatch: false, caught: 0 };
}

export function startCatch(cycle: FishingCycle, reducedMotion: boolean) {
  if (cycle.phase !== "bite") return false;
  cycle.phase = "catching";
  cycle.elapsed = 0;
  cycle.reducedCatch = reducedMotion;
  return true;
}

/** Threshold crossings fire once, including when a slow frame crosses several. */
export function advanceFishing(cycle: FishingCycle, dt: number, random = Math.random) {
  const previous = cycle.elapsed;
  cycle.elapsed += Math.max(0, dt);
  const events = { bite: false, splash: false, landed: false, reset: false };
  if (cycle.phase === "waiting" && cycle.elapsed >= cycle.wait) {
    cycle.phase = "bite";
    cycle.elapsed = 0;
    events.bite = true;
  } else if (cycle.phase === "catching") {
    const land = cycle.reducedCatch ? 0.12 : CATCH_TIMING.land;
    const end = cycle.reducedCatch ? 0.45 : CATCH_TIMING.end;
    events.splash = !cycle.reducedCatch && previous < CATCH_TIMING.splash && cycle.elapsed >= CATCH_TIMING.splash;
    events.landed = previous < land && cycle.elapsed >= land;
    if (events.landed) cycle.caught++;
    if (cycle.elapsed >= end) {
      cycle.phase = "waiting";
      cycle.elapsed = 0;
      cycle.wait = 2 + random() * 2;
      events.reset = true;
    }
  }
  return events;
}

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => {
  const t = clamp01(n);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pointLerp = (a: Point, b: Point, t: number): Point => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

function rotateAround(point: Point, pivot: Point, angle: number): Point {
  if (angle === 0) return point;
  const x = point[0] - pivot[0], y = point[1] - pivot[1];
  const c = Math.cos(angle), s = Math.sin(angle);
  return [pivot[0] + x * c - y * s, pivot[1] + x * s + y * c];
}

export function fishPosition(elapsed: number): { position: Point; angle: number } {
  if (elapsed >= CATCH_TIMING.land) {
    const drop = smooth((elapsed - CATCH_TIMING.land) / (CATCH_TIMING.hide - CATCH_TIMING.land));
    return { position: [110.5, 188 + 11 * drop], angle: Math.PI / 2 };
  }
  const t = clamp01((elapsed - CATCH_TIMING.splash) / (CATCH_TIMING.land - CATCH_TIMING.splash));
  const u = 1 - t;
  // A continuous arc: lift from the pond, swing above the rabbit, descend nose first.
  const a: Point = [160, 203], b: Point = [169, 131], c: Point = [110.5, 133], d: Point = [110.5, 188];
  const position: Point = [
    u ** 3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t ** 3 * d[0],
    u ** 3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t ** 3 * d[1],
  ];
  const dx = 3 * u * u * (b[0] - a[0]) + 6 * u * t * (c[0] - b[0]) + 3 * t * t * (d[0] - c[0]);
  const dy = 3 * u * u * (b[1] - a[1]) + 6 * u * t * (c[1] - b[1]) + 3 * t * t * (d[1] - c[1]);
  return { position, angle: Math.atan2(dy, dx) };
}

export function fishingPose(cycle: FishingCycle, reducedMotion: boolean) {
  let hook: Point = [160, 203];
  let bend = 0;
  let lean = 0;
  let rodAngle = 0;
  const catching = cycle.phase === "catching" && !cycle.reducedCatch && !reducedMotion;
  const e = cycle.elapsed;
  if (cycle.phase === "bite" && !reducedMotion) {
    const tug = Math.sin(e * 10) * Math.exp(-e * 2.4);
    rodAngle = tug * 0.025;
  } else if (catching) {
    const pull = smooth((e - 0.12) / 0.48);
    const settle = smooth((e - 1.32) / 0.65);
    const lift = pull * (1 - settle);
    const tension = Math.sin(Math.PI * clamp01(e / 0.35));
    rodAngle = -0.68 * lift + tension * 0.035;
    lean = -0.075 * lift;
    if (e >= CATCH_TIMING.splash && e < CATCH_TIMING.release) {
      hook = fishPosition(e).position;
      bend = -2 * Math.sin(pull * Math.PI);
    } else if (e >= CATCH_TIMING.release) {
      const cast = smooth((e - CATCH_TIMING.release) / (2.18 - CATCH_TIMING.release));
      hook = pointLerp(fishPosition(CATCH_TIMING.release).position, [160, 203], cast);
      hook = [hook[0] + 16 * Math.sin(Math.PI * cast), hook[1] - 22 * Math.sin(Math.PI * cast)];
      bend = 11 * Math.sin(Math.PI * cast) * Math.sin(cast * Math.PI * 2);
    }
  }
  // Move the entire original shaft rigidly around the paw, then follow the
  // rabbit's lean. Independent tip/control offsets stretch and kink the rod.
  const grip: Point = [138, 189];
  const bodyPivot: Point = [134, 191];
  const rodPoint = (point: Point) => rotateAround(rotateAround(point, grip, rodAngle), bodyPivot, lean);
  const base = rodPoint([134, 191]);
  const control = rodPoint([152, 180]);
  const tip = rodPoint([160, 170]);
  return { base, tip, control, hook, bend, lean, catching };
}

/** A muted warm fish stays legible as it crosses the sage-colored trees. */
export function drawCaughtFish(g: CanvasRenderingContext2D, elapsed: number) {
  if (elapsed < CATCH_TIMING.splash || elapsed >= CATCH_TIMING.hide) return;
  const { position, angle } = fishPosition(elapsed);
  g.save();
  // Surface and bucket rim occlude the fish as it emerges and slips inside.
  g.beginPath();
  g.rect(0, 0, 342, elapsed >= CATCH_TIMING.land ? 188.5 : 203);
  g.clip();
  g.translate(position[0], position[1]);
  g.rotate(angle);
  g.lineJoin = "round";
  g.lineWidth = 0.65;
  g.strokeStyle = "#60534e";
  g.fillStyle = "#af9378";
  const tail = Math.sin(elapsed * 32) * 0.65;
  g.beginPath();
  g.moveTo(-6, 0);
  g.lineTo(-9, -2 + tail);
  g.lineTo(-8.5, 2 + tail);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = "#d8b58d";
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(-1, -2.7, -5, -2.6, -7, 0);
  g.bezierCurveTo(-5, 2.5, -1, 2.4, 0, 0);
  g.fill();
  g.stroke();
  g.fillStyle = "#b48767";
  g.fillRect(-5, -1.5, 2.5, 1);
  g.fillStyle = "#eee3bc";
  g.fillRect(-4.5, 0.5, 2.5, 0.5);
  g.fillStyle = "#3f5350";
  g.fillRect(-1.5, -0.5, 0.75, 0.75);
  g.restore();
}
