// Fetch both sources, merge with the previous data, enrich new releases, write site/data + feed.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseClaudeChangelog, parseCodexBody, parseCodexScreenshots, surfaces } from "./parse.mjs";
import { createClient, enrichRelease } from "./enrich.mjs";

const DATA = new URL("../site/data/releases.json", import.meta.url);
const FEED = new URL("../site/feed.xml", import.meta.url);
const WINDOW_DAYS = Number(process.env.WINDOW_DAYS ?? 90);
const MAX_ENRICH = Number(process.env.MAX_ENRICH ?? 15);
const SITE_URL = process.env.SITE_URL ?? "";
const now = new Date();
const cutoff = new Date(now - WINDOW_DAYS * 864e5);

async function get(url, as = "text") {
  const headers = { "user-agent": "agent-track" };
  if (url.startsWith("https://api.github.com") && process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === "json" ? res.json() : res.text();
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
  for (let page = 1; page <= 10; page++) {
    const batch = await get(`https://api.github.com/repos/openai/codex/releases?per_page=100&page=${page}`, "json");
    for (const r of batch) {
      if (r.draft || !r.published_at) continue;
      out.push({
        id: `codex@${r.tag_name}`,
        tool: "codex",
        version: r.tag_name.replace(/^rust-v/, ""),
        date: r.published_at,
        prerelease: r.prerelease,
        url: r.html_url,
        items: parseCodexBody(r.body ?? ""),
      });
    }
    if (batch.length < 100 || new Date(batch.at(-1).published_at) < cutoff) break;
  }
  return out.filter((r) => new Date(r.date) >= cutoff);
}

async function codexScreenshots() {
  try {
    const html = await get("https://developers.openai.com/codex/changelog");
    return parseCodexScreenshots(html).filter((s) => s.date && new Date(s.date) >= new Date(cutoff - 30 * 864e5));
  } catch (err) {
    console.warn(`screenshots skipped: ${err.message}`);
    return [];
  }
}

const itemsHash = (items) => createHash("sha1").update(JSON.stringify(items.map((i) => i.text))).digest("hex").slice(0, 12);

function nearbyShots(release, shots) {
  if (release.tool !== "codex") return [];
  const t = new Date(release.date);
  return shots.filter((s) => Math.abs(new Date(s.date) - t) <= 21 * 864e5);
}

async function main() {
  const prev = JSON.parse(await readFile(DATA, "utf8").catch(() => '{"releases":[]}'));
  const previous = new Map(prev.releases.map((r) => [r.id, r]));

  const [claude, codex, screenshots] = await Promise.all([claudeReleases(previous), codexReleases(), codexScreenshots()]);
  const releases = [...claude, ...codex]
    .map((r) => {
      const items = r.items.map((it) => ({ ...it, surfaces: surfaces(it.text) }));
      const hash = itemsHash(items);
      const old = previous.get(r.id);
      return { ...r, items, hash, ko: old?.hash === hash ? old.ko ?? null : null };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const todo = releases.filter((r) => !r.ko && r.items.length).slice(0, MAX_ENRICH);
  if (todo.length && (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)) {
    const client = createClient();
    for (const r of todo) {
      try {
        r.ko = await enrichRelease(client, r, nearbyShots(r, screenshots));
        console.log(`enriched ${r.id}`);
      } catch (err) {
        console.warn(`enrich failed ${r.id}: ${err.message}`);
      }
    }
  } else if (todo.length) {
    console.warn(`no Anthropic credentials: ${todo.length} releases left without Korean text`);
  }

  const data = { generatedAt: now.toISOString(), windowDays: WINDOW_DAYS, releases, screenshots };
  await writeFile(DATA, JSON.stringify(data, null, 1) + "\n");
  await writeFile(FEED, feed(releases));
  console.log(`${releases.length} releases (${claude.length} Claude Code, ${codex.length} Codex), ${screenshots.length} screenshots`);
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
      return `<item><title>${name[r.tool]} ${esc(r.version)}</title><link>${esc(r.url)}</link><guid isPermaLink="false">${r.id}</guid><pubDate>${new Date(r.date).toUTCString()}</pubDate><description>${esc(desc)}</description></item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Agent Track</title><link>${esc(SITE_URL || "https://github.com/anthropics/claude-code")}</link><description>Claude Code · Codex 업데이트</description><language>ko</language><lastBuildDate>${now.toUTCString()}</lastBuildDate>
${items}
</channel></rss>
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
