// Run from launchd or a terminal. All generated work stays in a disposable clone.
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./ko-notes.mjs";
import { nearbyShots } from "./parse.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const siteUrl = "https://jjjung0921.github.io/agent-track/";
const codexModel = "gpt-6-luna";
const workerCount = 2;

function run(command, args, { cwd = root, env = process.env, input, capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: [input === undefined ? "ignore" : "pipe", capture ? "pipe" : "inherit", "inherit"] });
    let output = "";
    if (capture) child.stdout.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output.trim()) : reject(new Error(`${command} exited ${code}`)));
    if (input !== undefined) child.stdin.end(input);
  });
}

function content(data) {
  const { generatedAt, ...meaningful } = data;
  return JSON.stringify(meaningful);
}

async function noteFiles(dir) {
  return (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
}

async function writeKoreanNotes(checkout, temporary, pending, pendingDir, outDir) {
  const groups = Array.from({ length: Math.min(workerCount, pending.length) }, () => ({ names: [], items: 0 }));
  const files = await Promise.all(pending.map(async (name) => {
    const note = JSON.parse(await readFile(join(pendingDir, name), "utf8"));
    return { name, items: note.input.items.length };
  }));
  for (const file of files.sort((a, b) => b.items - a.items || a.name.localeCompare(b.name))) {
    const group = groups.reduce((least, next) => next.items < least.items ? next : least);
    group.names.push(file.name);
    group.items += file.items;
  }

  const prompt = await readFile(join(checkout, "prompts/routine.md"), "utf8");
  async function translate(names, index, model) {
    const workspace = join(temporary, `translator-${index}`);
    const workerPending = join(workspace, "work/pending");
    const workerOut = join(workspace, "work/out");
    const workerPrompts = join(workspace, "prompts");
    await Promise.all([mkdir(workerPending, { recursive: true }), mkdir(workerOut, { recursive: true }), mkdir(workerPrompts, { recursive: true })]);
    await Promise.all([
      ...names.map((name) => copyFile(join(pendingDir, name), join(workerPending, name))),
      copyFile(join(checkout, "prompts/ko-notes.md"), join(workerPrompts, "ko-notes.md")),
      copyFile(join(checkout, "prompts/ko-notes.schema.json"), join(workerPrompts, "ko-notes.schema.json")),
    ]);
    console.log(`Translator ${index}: ${names.length} releases (${model}).`);
    try {
      await run("codex", ["exec", "--ephemeral", "--skip-git-repo-check", "--sandbox", "workspace-write", "-m", model, "-c", "model_reasoning_effort='medium'", "-C", workspace, "-"], { cwd: workspace, input: prompt });
    } finally {
      const output = await noteFiles(workerOut);
      await Promise.all(output.filter((name) => names.includes(name)).map((name) => copyFile(join(workerOut, name), join(outDir, name))));
    }
  }

  const source = JSON.parse(await readFile(join(checkout, "site/data/releases.json"), "utf8"));
  const byId = new Map(source.releases.map((release) => [release.id, release]));
  async function invalid(name) {
    try {
      const expected = JSON.parse(await readFile(join(pendingDir, name), "utf8"));
      const actual = JSON.parse(await readFile(join(outDir, name), "utf8"));
      if (actual.id !== expected.id || actual.hash !== expected.hash) throw new Error("id or hash mismatch");
      const release = byId.get(expected.id);
      validate(actual.output, release, nearbyShots(release, source.screenshots), "codex-cli");
      return false;
    } catch (error) {
      console.warn(`${name}: ${error.message}`);
      return true;
    }
  }

  await Promise.allSettled(groups.map((group, index) => translate(group.names, index + 1, codexModel)));
  const retry = (await Promise.all(pending.map(async (name) => await invalid(name) ? name : null))).filter(Boolean);
  if (retry.length) {
    console.warn(`Retrying ${retry.length} incomplete or invalid releases with gpt-6-sol.`);
    await Promise.allSettled(retry.map((name, index) => translate([name], `retry-${index + 1}`, "gpt-6-sol")));
  }
  const failed = (await Promise.all(pending.map(async (name) => await invalid(name) ? name : null))).filter(Boolean);
  if (failed.length) throw new Error(`Invalid Korean notes after retry: ${failed.join(", ")}`);
}

async function main() {
  const remote = await run("git", ["remote", "get-url", "origin"], { capture: true });
  const temporary = await mkdtemp(join(tmpdir(), "agent-track-"));
  const checkout = join(temporary, "repo");
  let completed = false;
  try {
    await run("git", ["clone", "--quiet", "--depth", "1", "--branch", "main", remote, checkout]);
    await run("npm", ["ci"], { cwd: checkout, env: { ...process.env, npm_config_cache: join(temporary, "npm-cache") } });
    const dataFile = join(checkout, "site/data/releases.json");
    const before = JSON.parse(await readFile(dataFile, "utf8"));
    const token = await run("gh", ["auth", "token"], { capture: true });
    await run("node", ["scripts/update.mjs"], { cwd: checkout, env: { ...process.env, GITHUB_TOKEN: token, SITE_URL: siteUrl } });
    const after = JSON.parse(await readFile(dataFile, "utf8"));
    const releasesChanged = content(before) !== content(after);

    await run("node", ["scripts/pending.mjs", "8", "240"], { cwd: checkout });
    const pendingDir = join(checkout, "work/pending");
    const outDir = join(checkout, "work/out");
    const pending = await noteFiles(pendingDir);
    if (pending.length) {
      await writeKoreanNotes(checkout, temporary, pending, pendingDir, outDir);
      const output = await noteFiles(outDir);
      if (JSON.stringify(output) !== JSON.stringify(pending)) throw new Error("Codex output files do not match pending files");
      for (const name of pending) {
        const expected = JSON.parse(await readFile(join(pendingDir, name), "utf8"));
        const actual = JSON.parse(await readFile(join(outDir, name), "utf8"));
        if (actual.id !== expected.id || actual.hash !== expected.hash) throw new Error(`Codex output does not match ${name}`);
      }
      await run("node", ["scripts/apply-ko.mjs"], { cwd: checkout });
      await run("node", ["scripts/update.mjs", "--notes-only"], { cwd: checkout, env: { ...process.env, SITE_URL: siteUrl } });
    }

    if (!releasesChanged && !pending.length) {
      console.log("No new release data or Korean notes; nothing to deploy.");
      completed = true;
      return;
    }
    await run("npm", ["test"], { cwd: checkout });
    const allowed = ["data/ko.json", "site/data/releases.json", "site/feed.xml"];
    const changed = (await run("git", ["diff", "--name-only"], { cwd: checkout, capture: true })).split("\n").filter(Boolean);
    if (changed.some((name) => !allowed.includes(name))) throw new Error(`Unexpected tracked changes: ${changed.join(", ")}`);
    const generated = JSON.parse(await readFile(join(checkout, "data/ko.json"), "utf8"));
    for (let attempt = 1; attempt <= 3; attempt++) {
      await run("git", ["fetch", "origin", "main"], { cwd: checkout });
      const local = await run("git", ["rev-parse", "HEAD"], { cwd: checkout, capture: true });
      const latest = await run("git", ["rev-parse", "origin/main"], { cwd: checkout, capture: true });
      if (local !== latest) {
        // The scheduled GitHub fetch can commit while Codex is writing. Rebuild on its latest data.
        await run("git", ["reset", "--hard", "origin/main"], { cwd: checkout });
        await run("node", ["scripts/update.mjs"], { cwd: checkout, env: { ...process.env, GITHUB_TOKEN: token, SITE_URL: siteUrl } });
        const latestData = JSON.parse(await readFile(dataFile, "utf8"));
        const latestKo = JSON.parse(await readFile(join(checkout, "data/ko.json"), "utf8"));
        for (const release of latestData.releases) {
          const note = generated[release.id];
          if (note?.hash === release.hash) latestKo[release.id] = note;
        }
        await writeFile(join(checkout, "data/ko.json"), JSON.stringify(latestKo, null, 1) + "\n");
        await run("node", ["scripts/update.mjs", "--notes-only"], { cwd: checkout, env: { ...process.env, SITE_URL: siteUrl } });
        await run("npm", ["test"], { cwd: checkout });
      }
      await run("git", ["add", "--", ...allowed], { cwd: checkout });
      const staged = await run("git", ["diff", "--cached", "--name-only"], { cwd: checkout, capture: true });
      if (!staged) {
        completed = true;
        return;
      }
      await run("git", ["-c", "user.name=agent-track-local", "-c", "user.email=agent-track-local@users.noreply.github.com", "commit", "-m", "data: update releases and Korean notes"], { cwd: checkout });
      try {
        await run("git", ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", "push", "origin", "HEAD:main"], { cwd: checkout });
        console.log("Pushed data to main; GitHub Actions will deploy the site.");
        completed = true;
        return;
      } catch (error) {
        if (attempt === 3) throw error;
        console.warn(`Push failed; retrying with current main (${attempt}/3).`);
      }
    }
  } finally {
    if (completed) await rm(temporary, { recursive: true, force: true });
    else console.error(`Preserved generated files at ${checkout}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
