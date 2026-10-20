import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./fishing-dialogue.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { createDialogue, currentLine, startDialogue, dismissDialogue, advanceDialogue, EAGLE_CHATS } =
  await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("rapid clicks cannot replace words mid-fade", () => {
  const d = createDialogue();
  assert.equal(startDialogue(d, EAGLE_CHATS[0]), true);
  assert.equal(startDialogue(d, EAGLE_CHATS[1]), false);
  advanceDialogue(d, 0.4);
  assert.equal(startDialogue(d, EAGLE_CHATS[1]), true);
  assert.equal(currentLine(d).text, EAGLE_CHATS[0][0].text);
  assert.equal(d.phase, "exiting");
  advanceDialogue(d, 0.23);
  assert.equal(d.phase, "visible");
  assert.equal(currentLine(d).text, EAGLE_CHATS[1][0].text);
});

test("dismissal clears a pending line rather than reopening the bubble", () => {
  const d = createDialogue();
  startDialogue(d, EAGLE_CHATS[0]);
  advanceDialogue(d, 0.4);
  startDialogue(d, EAGLE_CHATS[1]);
  dismissDialogue(d);
  advanceDialogue(d, 0.23);
  assert.equal(d.phase, "hidden");
  advanceDialogue(d, 10);
  assert.equal(d.phase, "hidden");
  assert.equal(d.pending, null);
});

test("hover does not interrupt an activated line, and only the eagle speaks", () => {
  const d = createDialogue();
  for (const lines of EAGLE_CHATS) {
    assert.ok(lines.every(line => line.speaker === "eagle"));
  }
  startDialogue(d, EAGLE_CHATS[1]);
  assert.equal(startDialogue(d, EAGLE_CHATS[0], "ambient"), false);
  assert.equal(currentLine(d).text, EAGLE_CHATS[1][0].text);
  advanceDialogue(d, 4);
  advanceDialogue(d, 0.23);
  assert.equal(d.phase, "hidden");
});
