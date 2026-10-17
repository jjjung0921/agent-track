// Validates Korean notes in work/out/*.json and merges them into data/ko.json.
// Each file: {"id": "...", "hash": "...", "output": {summary, items, features}} (see prompts/ko-notes.schema.json).
//   KO_MODEL=claude-haiku-5-5 node scripts/apply-ko.mjs
import { readFile, writeFile, readdir } from "node:fs/promises";
import { validate } from "./enrich.mjs";
import { nearbyShots } from "./parse.mjs";

const KO = new URL("../data/ko.json", import.meta.url);
const OUT = new URL("../work/out/", import.meta.url);
const model = process.env.KO_MODEL ?? "claude-cloud-routine";

const data = JSON.parse(await readFile(new URL("../site/data/releases.json", import.meta.url), "utf8"));
const byId = new Map(data.releases.map((r) => [r.id, r]));
const ko = JSON.parse(await readFile(KO, "utf8").catch(() => "{}"));

let applied = 0;
let failed = 0;
for (const name of (await readdir(OUT).catch(() => [])).filter((f) => f.endsWith(".json"))) {
  try {
    const { id, hash, output } = JSON.parse(await readFile(new URL(name, OUT), "utf8"));
    const r = byId.get(id);
    if (!r) throw new Error(`unknown release ${id}`);
    if (r.hash !== hash) throw new Error(`release changed since pending (hash ${hash} ≠ ${r.hash})`);
    ko[id] = { hash, ko: validate(output, r, nearbyShots(r, data.screenshots), model) };
    applied++;
    console.log(`ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${name}: ${err.message}`);
  }
}

await writeFile(KO, JSON.stringify(ko, null, 1) + "\n");
console.log(`${applied} applied, ${failed} failed`);
if (failed && !applied) process.exit(1);
