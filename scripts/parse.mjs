// Pure parsing helpers: raw changelog text -> normalized release items.

const CLAUDE_VERB = [
  [/^(Added|Add|New)\b/i, "new"],
  [/^(Improved|Improve|Faster|Reduced)\b/i, "improved"],
  [/^(Fixed|Fix)\b/i, "fixed"],
];

// Claude Code lines start with a verb ("Added …", "Fixed …"), sometimes behind a
// platform prefix ("Windows: Fixed …"). The prefix stays in the text.
export function claudeCategory(line) {
  const body = line.replace(/^[A-Z][\w .\-/]{0,30}:\s+/, "");
  for (const [re, cat] of CLAUDE_VERB) if (re.test(body)) return cat;
  return "changed";
}

// CHANGELOG.md -> [{version, items:[{cat,text}]}], newest first.
export function parseClaudeChangelog(md) {
  const releases = [];
  let cur = null;
  for (const raw of md.split("\n")) {
    const h = raw.match(/^##\s+(\d+\.\d+\.\d+\S*)/);
    if (h) {
      cur = { version: h[1], items: [] };
      releases.push(cur);
      continue;
    }
    const li = raw.match(/^[-*]\s+(.*\S)/);
    if (cur && li) cur.items.push({ cat: claudeCategory(li[1]), text: li[1] });
    else if (cur && /^\s{2,}\S/.test(raw) && cur.items.length) cur.items.at(-1).text += " " + raw.trim();
  }
  return releases;
}

const CODEX_SECTION = [
  [/new features?|features|highlights/i, "new"],
  [/improvements?|performance/i, "improved"],
  [/bug ?fix|fixes/i, "fixed"],
  [/chores?|documentation|docs|changes|breaking|other/i, "changed"],
];

// GitHub release body -> items. The "## Changelog" section is a raw PR list and is skipped.
export function parseCodexBody(body = "") {
  const items = [];
  let cat = null;
  for (const raw of body.split("\n")) {
    const h = raw.match(/^#{1,4}\s+(.*)/);
    if (h) {
      cat = /changelog/i.test(h[1]) ? null : (CODEX_SECTION.find(([re]) => re.test(h[1]))?.[1] ?? "changed");
      continue;
    }
    const li = raw.match(/^[-*]\s+(.*\S)/);
    if (cat && li) items.push({ cat, text: stripPrRefs(li[1]) });
    else if (cat && /^\s{2,}\S/.test(raw) && items.length) items.at(-1).text += " " + raw.trim();
  }
  return items;
}

function stripPrRefs(s) {
  return s.replace(/\s*\((?:#\d+(?:,\s*)?)+\)\s*$/, "").trim();
}

const SURFACES = [
  ["desktop", /\bdesktop app\b|\bCodex app\b/i],
  ["vscode", /\bVS ?Code\b|\bIDE extension\b|\bJetBrains\b/i],
  ["sdk", /\bAgent SDK\b/],
];

// Where a change applies, from keywords in the original line. Empty -> terminal/CLI.
export function surfaces(text) {
  const found = SURFACES.filter(([, re]) => re.test(text)).map(([k]) => k);
  return found.length ? found : ["cli"];
}

// developers.openai.com/codex/changelog HTML -> screenshots with their entry context.
export function parseCodexScreenshots(html, base = "https://developers.openai.com") {
  const shots = [];
  const entries = html.split(/<li id="(codex-[^"]+)"/).slice(1);
  for (let i = 0; i < entries.length; i += 2) {
    const id = entries[i];
    const chunk = entries[i + 1];
    const date = chunk.match(/<time[^>]*>(\d{4}-\d{2}-\d{2})<\/time>/)?.[1];
    const title = clean(chunk.match(/<h3[^>]*>\s*<span>([\s\S]*?)<span/)?.[1] ?? "");
    const parts = chunk.split(/<div data-codex-screenshot-root>/);
    for (let j = 1; j < parts.length; j++) {
      const before = parts[j - 1];
      const fig = parts[j];
      const light = fig.match(/dark:hidden[^>]*>\s*<img src="([^"]+)"/)?.[1] ?? fig.match(/<img src="([^"]+)"/)?.[1];
      if (!light) continue;
      const dark = fig.match(/dark:block[^>]*>\s*<img src="([^"]+)"/)?.[1];
      const alt = fig.match(/<img [^>]*alt="([^"]*)"/)?.[1] ?? "";
      const section = clean([...before.matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>/g)].at(-1)?.[1] ?? "");
      const context = clean([...before.matchAll(/<p>([\s\S]*?)<\/p>/g)].at(-1)?.[1] ?? "");
      shots.push({
        id: `${id}#${j}`,
        date,
        title,
        section,
        context,
        alt: decode(alt),
        light: new URL(light, base).href,
        dark: dark ? new URL(dark, base).href : null,
        url: `${base}/codex/changelog#${id}`,
      });
    }
  }
  return shots;
}

function clean(s) {
  return decode(s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&rsquo;|’/g, "’");
}

// Official Codex screenshots posted within three weeks of a release are its candidates.
export function nearbyShots(release, shots) {
  if (release.tool !== "codex") return [];
  const t = new Date(release.date);
  return shots.filter((s) => Math.abs(new Date(s.date) - t) <= 21 * 864e5);
}
