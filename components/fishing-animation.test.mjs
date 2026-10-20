import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Exercise the actual TypeScript model without adding a test runner dependency.
const source = readFileSync(new URL("./fishing-animation.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { createFishingCycle, advanceFishing, startCatch, fishingPose, fishPosition, CATCH_TIMING } =
  await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("bite waits 2–4 seconds and stays ready until activated", () => {
  for (const random of [0, 0.5, 0.999999]) {
    const cycle = createFishingCycle(() => random);
    assert.ok(cycle.wait >= 2 && cycle.wait <= 4);
    assert.equal(startCatch(cycle, false), false);
    assert.equal(advanceFishing(cycle, cycle.wait - 0.001).bite, false);
    assert.equal(advanceFishing(cycle, 0.002).bite, true);
    advanceFishing(cycle, 30);
    assert.equal(cycle.phase, "bite");
    assert.equal(startCatch(cycle, false), true);
    assert.equal(cycle.elapsed, 0);
  }
});

test("one click produces one splash and one landing at different frame rates", () => {
  for (const dt of [1 / 120, 1 / 60, 1 / 30, 0.05]) {
    const cycle = createFishingCycle(() => 0);
    advanceFishing(cycle, 2);
    startCatch(cycle, false);
    let splashes = 0, landings = 0;
    while (cycle.phase === "catching") {
      assert.equal(startCatch(cycle, false), false, "repeat clicks cannot restart a catch");
      const events = advanceFishing(cycle, dt, () => 0.75);
      splashes += Number(events.splash);
      landings += Number(events.landed);
    }
    assert.equal(splashes, 1);
    assert.equal(landings, 1);
    assert.equal(cycle.caught, 1);
    assert.equal(cycle.wait, 3.5);
    assert.equal(cycle.elapsed, 0);
  }
});

test("reduced motion completes the same interaction without a splash or flight", () => {
  const cycle = createFishingCycle(() => 0);
  advanceFishing(cycle, 2);
  startCatch(cycle, true);
  assert.equal(fishingPose(cycle, true).catching, false);
  const events = advanceFishing(cycle, 0.5);
  assert.equal(events.splash, false);
  assert.equal(events.landed, true);
  assert.equal(events.reset, true);
  assert.equal(cycle.caught, 1);
});

test("fish emerges at the line and enters the bucket nose first with a continuous path", () => {
  assert.deepEqual(fishPosition(CATCH_TIMING.splash).position, [160, 203]);
  assert.deepEqual(fishPosition(CATCH_TIMING.land).position, [110.5, 188]);
  assert.equal(fishPosition(CATCH_TIMING.land).angle, Math.PI / 2);
  let previous = fishPosition(CATCH_TIMING.splash).position;
  for (let t = CATCH_TIMING.splash; t <= CATCH_TIMING.hide; t += 1 / 120) {
    const { position } = fishPosition(t);
    assert.ok(Math.hypot(position[0] - previous[0], position[1] - previous[1]) < 2);
    previous = position;
  }
});

test("line stays attached until release and returns exactly to the idle pose", () => {
  const cycle = createFishingCycle();
  cycle.phase = "catching";
  for (const elapsed of [0.2, 0.4, 0.6, 0.779]) {
    cycle.elapsed = elapsed;
    assert.deepEqual(fishingPose(cycle, false).hook, fishPosition(elapsed).position);
  }
  cycle.elapsed = CATCH_TIMING.end;
  const pose = fishingPose(cycle, false);
  assert.deepEqual(pose.tip, [160, 170]);
  assert.deepEqual(pose.control, [152, 180]);
  assert.ok(Math.hypot(pose.hook[0] - 160, pose.hook[1] - 203) < 1e-10);
  assert.equal(pose.lean, -0);
});

test("rod keeps its length and curvature throughout bites, lifts, and returns", () => {
  const cycle = createFishingCycle();
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const rest = fishingPose(cycle, false);
  for (const phase of ["bite", "catching"]) {
    cycle.phase = phase;
    for (let t = 0; t <= CATCH_TIMING.end; t += 1 / 120) {
      cycle.elapsed = t;
      const pose = fishingPose(cycle, false);
      // A rigid triangle preserves every point of the quadratic shaft, not
      // just its tip distance. This catches the former moving-control kink.
      for (const [a, b] of [["base", "tip"], ["base", "control"], ["control", "tip"]]) {
        assert.ok(Math.abs(distance(pose[a], pose[b]) - distance(rest[a], rest[b])) < 1e-10);
      }
      // The paw follows the body pivot, while the rod rotates around that paw.
      const c = Math.cos(pose.lean), s = Math.sin(pose.lean);
      const grip = [134 + 4 * c + 2 * s, 191 + 4 * s - 2 * c];
      assert.ok(Math.abs(distance(pose.base, grip) - Math.hypot(4, -2)) < 1e-10);
    }
  }
});
