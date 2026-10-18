import { test } from "node:test";
import assert from "node:assert/strict";
import { claudeCategory, parseClaudeChangelog, parseCodexBody, surfaces, parseCodexScreenshots } from "../scripts/parse.mjs";

test("claude categories follow the leading verb, past platform prefixes", () => {
  assert.equal(claudeCategory("Added `/foo` command"), "new");
  assert.equal(claudeCategory("Improved startup time"), "improved");
  assert.equal(claudeCategory("Windows: Fixed every file write being refused"), "fixed");
  assert.equal(claudeCategory("Self-hosted runner: Fixed git fetches"), "fixed");
  assert.equal(claudeCategory("Changed the footer hint"), "changed");
  assert.equal(claudeCategory("Removed the old flag"), "changed");
});

test("claude changelog splits versions and joins wrapped bullets", () => {
  const md = "# Changelog\n\n## 2.1.302\n\n- Added A\n- Fixed B\n  continued\n\n## 2.1.301\n\n- Improved C\n";
  const r = parseClaudeChangelog(md);
  assert.deepEqual(r.map((x) => x.version), ["2.1.302", "2.1.301"]);
  assert.deepEqual(r[0].items, [{ cat: "new", text: "Added A" }, { cat: "fixed", text: "Fixed B continued" }]);
});

test("codex body maps sections, drops PR refs and the raw Changelog list", () => {
  const body = "## New Features\n\n- Open `/config` to search. (#52990, #53429)\n\n## Bug Fixes\n\n- Fixed a crash. (#51866)\n\n## Changelog\n\n- #53678 Preserve context @keyz\n";
  assert.deepEqual(parseCodexBody(body), [
    { cat: "new", text: "Open `/config` to search." },
    { cat: "fixed", text: "Fixed a crash." },
  ]);
  assert.deepEqual(parseCodexBody(""), []);
});

test("surfaces come from keywords, default cli", () => {
  assert.deepEqual(surfaces("Changed the desktop app and VS Code to run subagents"), ["desktop", "vscode"]);
  assert.deepEqual(surfaces("Added CLAUDE_CODE_AUTO_MODE_MODEL"), ["cli"]);
});

test("codex screenshots keep light/dark pair and entry context", () => {
  const html = `<li id="codex-2026-04-16-app" class="x"><time class="t">2026-04-16</time><h3 class="h"><span> Codex helps <span class="v">26.415</span></span></h3>
<article><h4 id="v">Verify more of your work</h4><p>The Codex app now includes an <strong>in-app browser</strong>.</p>
<div data-codex-screenshot-root><figure><picture class="block dark:hidden"> <img src="/images/a-light.webp" alt="Codex app showing a browser comment"></picture>
<picture class="hidden dark:block"> <img src="/images/a-dark.webp" alt="Codex app showing a browser comment"></picture></figure></div></article></li>`;
  const [s] = parseCodexScreenshots(html);
  assert.equal(s.date, "2026-04-16");
  assert.equal(s.title, "Codex helps");
  assert.equal(s.section, "Verify more of your work");
  assert.equal(s.light, "https://developers.openai.com/images/a-light.webp");
  assert.equal(s.dark, "https://developers.openai.com/images/a-dark.webp");
  assert.match(s.context, /in-app browser/);
});

test("korean notes: schema check and index guard", async () => {
  const { checkShape, validate, isCurrentNote } = await import("../scripts/ko-notes.mjs");
  const release = { items: [{ cat: "new", text: "Added A", surfaces: ["cli"] }] };
  const feature = { index: 0, title: "t", what: "w", steps: [], terminal: { title: "", lines: [] }, desktop: { steps: [], before: "", after: "" }, screenshot_id: "x", notable: false };
  const good = { summary: "s", items: [{ index: 0, ko: "가" }, { index: 5, ko: "범위 밖" }], features: [feature] };
  assert.deepEqual(checkShape(good), []);
  const v = validate(good, release, [], "m");
  assert.deepEqual(v.items, ["가"]);
  assert.equal(v.features[0].screenshot_id, "");
  assert.match(checkShape({ summary: 1, items: [], features: [] })[0], /summary/);
  assert.throws(() => validate({ summary: "s", items: [], features: [{ ...feature, extra: 1 }] }, release, [], "m"), /not allowed/);
  assert.throws(() => validate({ summary: "s", items: [], features: [feature] }, release, [], "m"), /missing Korean item/);
  assert.throws(() => validate({ summary: "s", items: [{ index: 0, ko: "가" }], features: [] }, release, [], "m"), /missing feature detail/);
  assert.equal(isCurrentNote({ hash: "h", ko: { model: "claude-haiku-5-5" } }, "h"), false);
  assert.equal(isCurrentNote({ hash: "h", ko: { model: "codex-cloud" } }, "h"), true);
});
