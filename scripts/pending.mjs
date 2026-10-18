// Lists releases that still lack Korean notes and writes one input file per release to work/pending/.
// Used by the Codex CLI routine; Codex writes answers to work/out/ and runs apply-ko.mjs.
//   node scripts/pending.mjs [release-limit] [item-limit]
import { readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { buildInput, isCurrentNote } from "./ko-notes.mjs";
import { nearbyShots } from "./parse.mjs";

const limit = Number(process.argv[2] ?? 10);
const itemLimit = Number(process.argv[3] ?? Infinity);
const data = JSON.parse(await readFile(new URL("../site/data/releases.json", import.meta.url), "utf8"));
const ko = JSON.parse(await readFile(new URL("../data/ko.json", import.meta.url), "utf8").catch(() => "{}"));
const dir = new URL("../work/pending/", import.meta.url);
const out = new URL("../work/out/", import.meta.url);

const todo = [];
let itemCount = 0;
for (const release of data.releases) {
  if (!release.items.length || isCurrentNote(ko[release.id], release.hash)) continue;
  if (todo.length >= limit || (todo.length && itemCount + release.items.length > itemLimit)) break;
  todo.push(release);
  itemCount += release.items.length;
}
await rm(dir, { recursive: true, force: true });
await rm(out, { recursive: true, force: true });
await mkdir(dir, { recursive: true });
await mkdir(out, { recursive: true });

for (const r of todo) {
  const file = `${r.id.replace(/[^\w.-]+/g, "_")}.json`;
  await writeFile(new URL(file, dir), JSON.stringify({ id: r.id, hash: r.hash, input: buildInput(r, nearbyShots(r, data.screenshots)) }, null, 1));
  console.log(`work/pending/${file}  ${r.items.length} items`);
}
console.log(todo.length ? `${todo.length} pending` : "nothing pending");
