// Fetch both sources, merge validated Codex notes, write site data and RSS.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseClaudeChangelog, parseCodexBody, parseCodexChangelog, parseCodexScreenshots, surfaces } from "./parse.mjs";
import { isCurrentNote } from "./ko-notes.mjs";

const DATA = new URL("../site/data/releases.json", import.meta.url);
const FEED = new URL("../site/feed.xml", import.meta.url);
// Korean notes keyed by release id, kept with the hash of the items they were written from.
// Written by the Codex routine (scripts/apply-ko.mjs).
const KO = new URL("../data/ko.json", import.meta.url);
const WINDOW_DAYS = Number(process.env.WINDOW_DAYS ?? 90);
const SITE_URL = process.env.SITE_URL ?? "";
const now = new Date();
const cutoff = new Date(now - WINDOW_DAYS * 864e5);

// Retries network drops and 5xx; large GitHub API pages sometimes close mid-body.
async function get(url, as = "text", tries = 3) {
  const headers = { "user-agent": "agent-track" };
  if (url.startsWith("https://api.github.com") && process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.status >= 500) throw new Error(`${res.status} ${url}`);
      if (!res.ok) throw Object.assign(new Error(`${res.status} ${url}`), { final: true });
      return as === "json" ? await res.json() : await res.text();
    } catch (err) {
      if (err.final || attempt >= tries) throw err;
      console.warn(`retry ${attempt} ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

async function claudeReleases(previous) {
  const [md, npm] = await Promise.all([
    get("https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md"),
    get("https://registry.npmjs.org/@anthropic-ai/claude-code", "json"),
  ]);
  return parseClaudeChangelog(md)
    .map((r, i) => {
      const id = `claude-code@${r.version}`;
      // npm publish time is the real release time. A version not on npm keeps the time we first saw it;
      // only the newest one can be new to us, older unpublished versions are dropped.
      const date = npm.time?.[r.version] ?? previous.get(id)?.date ?? (i === 0 ? now.toISOString() : null);
      if (!date) return null;
      return {
        id,
        tool: "claude-code",
        version: r.version,
        date,
        prerelease: false,
        url: `https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#${r.version.replace(/\./g, "")}`,
        items: r.items,
      };
    })
    .filter((r) => r && new Date(r.date) >= cutoff);
}

async function codexReleases() {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await get(`https://api.github.com/repos/openai/codex/releases?per_page=50&page=${page}`, "json");
    for (const r of batch) {
      if (r.draft || !r.published_at) continue;
      const items = parseCodexBody(r.body ?? "");
      // Alpha tags commonly have a version-only body; they add no update record.
      if (r.prerelease && !items.length) continue;
      out.push({
        id: `codex@${r.tag_name}`,
        tool: "codex",
        version: r.tag_name.replace(/^rust-v/, ""),
        date: r.published_at,
        prerelease: r.prerelease,
        url: r.html_url,
        source: "github-releases",
        items,
      });
    }
    if (batch.length < 50 || new Date(batch.at(-1).published_at) < cutoff) break;
  }
  return out.filter((r) => new Date(r.date) >= cutoff);
}

function codexChangelog(html) {
  const entries = parseCodexChangelog(html);
  if (!entries.length) throw new Error("Official Codex changelog has no parseable entries");
  return entries
    .filter((e) => new Date(`${e.date}T00:00:00Z`) >= cutoff)
    .map((e) => ({
      id: `codex@changelog:${e.id}`,
      tool: "codex",
      version: e.title,
      date: `${e.date}T00:00:00Z`,
      datePrecision: "day",
      prerelease: false,
      source: "official-changelog",
      topics: e.topics,
      url: `https://developers.openai.com/codex/changelog#${e.id}`,
      items: e.items,
    }));
}

const itemsHash = (items) => createHash("sha1").update(JSON.stringify(items.map((i) => i.text))).digest("hex").slice(0, 12);

async function main() {
  const prev = JSON.parse(await readFile(DATA, "utf8").catch(() => '{"releases":[]}'));
  const previous = new Map(prev.releases.map((r) => [r.id, r]));
  const koCache = JSON.parse(await readFile(KO, "utf8").catch(() => "{}"));

  const [claude, codex, html] = await Promise.all([claudeReleases(previous), codexReleases(), get("https://developers.openai.com/codex/changelog")]);
  const editorial = codexChangelog(html);
  const screenshots = parseCodexScreenshots(html).filter((s) => s.date && new Date(s.date) >= new Date(cutoff - 30 * 864e5));
  const releases = [...claude, ...codex, ...editorial]
    .map((r) => {
      const topicSurfaces = r.topics?.flatMap((topic) => ({ "codex-app": ["desktop"], "codex-mobile": ["mobile"], "codex-cli": ["cli"], general: ["general"] })[topic] ?? []) ?? [];
      const items = r.items.map((it) => ({ ...it, surfaces: topicSurfaces.length ? [...new Set([...topicSurfaces, ...surfaces(it.text).filter((surface) => surface !== "cli")])] : surfaces(it.text) }));
      const hash = itemsHash(items);
      const cached = koCache[r.id];
      return { ...r, items, hash, ko: isCurrentNote(cached, hash) ? cached.ko : null };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const missingNotes = releases.filter((r) => !r.ko && r.items.length).length;
  if (missingNotes) console.log(`${missingNotes} releases await Korean notes`);
  const data = { generatedAt: now.toISOString(), windowDays: WINDOW_DAYS, releases, screenshots };
  await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
  await writeFile(FEED, feed(releases));
  console.log(`${releases.length} updates (${claude.length} Claude Code, ${codex.length} Codex GitHub releases, ${editorial.length} official Codex changelog), ${screenshots.length} screenshots`);
}

async function refreshNotes() {
  const data = JSON.parse(await readFile(DATA, "utf8"));
  const koCache = JSON.parse(await readFile(KO, "utf8").catch(() => "{}"));
  const releases = data.releases.map((release) => {
    const cached = koCache[release.id];
    return { ...release, ko: isCurrentNote(cached, release.hash) ? cached.ko : null };
  });
  await writeFile(DATA, JSON.stringify({ ...data, releases }, null, 1) + "\n");
  await writeFile(FEED, feed(releases));
  console.log(`Refreshed notes for ${releases.filter((release) => release.ko).length} releases`);
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function feed(releases) {
  const name = { "claude-code": "Claude Code", codex: "Codex" };
  const items = releases
    .filter((r) => r.items.length)
    .slice(0, 30)
    .map((r) => {
      const lines = r.items.map((it, i) => `<li>${esc(r.ko?.items?.[i] ?? it.text)}</li>`).join("");
      const desc = `${r.ko?.summary ? `<p>${esc(r.ko.summary)}</p>` : ""}<ul>${lines}</ul>`;
      const title = r.source === "official-changelog" ? r.version : `${name[r.tool]} ${r.version}`;
      return `<item><title>${esc(title)}</title><link>${esc(r.url)}</link><guid isPermaLink="false">${r.id}</guid><pubDate>${new Date(r.date).toUTCString()}</pubDate><description>${esc(desc)}</description></item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Agent Track</title><link>${esc(SITE_URL || "https://github.com/anthropics/claude-code")}</link><description>Claude Code · Codex 업데이트</description><language>ko</language><lastBuildDate>${now.toUTCString()}</lastBuildDate>
${items}
</channel></rss>
`;
}

(process.argv.includes("--notes-only") ? refreshNotes() : main()).catch((err) => {
  console.error(err);
  process.exit(1);
});
