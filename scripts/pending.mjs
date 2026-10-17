// Lists releases that still lack Korean notes and writes one input file per release to work/pending/.
// Used by the Claude cloud routine; the routine writes its answers to work/out/ and runs apply-ko.mjs.
//   node scripts/pending.mjs [limit]
import { readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { buildInput } from "./enrich.mjs";
import { nearbyShots } from "./parse.mjs";

const limit = Number(process.argv[2] ?? 10);
const data = JSON.parse(await readFile(new URL("../site/data/releases.json", import.meta.url), "utf8"));
const ko = JSON.parse(await readFile(new URL("../data/ko.json", import.meta.url), "utf8").catch(() => "{}"));
const dir = new URL("../work/pending/", import.meta.url);

const todo = data.releases.filter((r) => r.items.length && ko[r.id]?.hash !== r.hash).slice(0, limit);
await rm(dir, { recursive: true, force: true });
await mkdir(dir, { recursive: true });
await mkdir(new URL("../work/out/", import.meta.url), { recursive: true });

for (const r of todo) {
  const file = `${r.id.replace(/[^\w.-]+/g, "_")}.json`;
  await writeFile(new URL(file, dir), JSON.stringify({ id: r.id, hash: r.hash, input: buildInput(r, nearbyShots(r, data.screenshots)) }, null, 1));
  console.log(`work/pending/${file}  ${r.items.length} items`);
}
console.log(todo.length ? `${todo.length} pending` : "nothing pending");
