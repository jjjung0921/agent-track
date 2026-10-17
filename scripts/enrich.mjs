// Korean summaries, per-feature explanations and usage examples, written by Claude
// from the original release lines only. The rules and output schema live in prompts/
// so the API path here and the Claude cloud routine (scripts/pending.mjs + apply-ko.mjs) share them.
import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";
export const SYSTEM = readFileSync(new URL("../prompts/ko-notes.md", import.meta.url), "utf8");
export const SCHEMA = JSON.parse(readFileSync(new URL("../prompts/ko-notes.schema.json", import.meta.url), "utf8"));

// Items that get a full explanation: every new feature, plus changes that touch the desktop app or IDE.
export function needsDetail(item) {
  return item.cat === "new" || (item.cat !== "fixed" && item.surfaces.some((s) => s === "desktop" || s === "vscode"));
}

export function buildInput(release, screenshots) {
  return {
    tool: release.tool === "claude-code" ? "Claude Code" : "Codex",
    version: release.version,
    items: release.items.map((it, index) => ({ index, category: it.cat, surfaces: it.surfaces, needs_detail: needsDetail(it), text: it.text })),
    screenshot_candidates: screenshots.map((s) => ({ id: s.id, date: s.date, title: s.title, section: s.section, context: s.context, alt: s.alt })),
  };
}

export function createClient() {
  return new Anthropic();
}

export async function enrichRelease(client, release, screenshots) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(buildInput(release, screenshots)) }],
  });

  if (response.stop_reason === "refusal") throw new Error(`refused: ${response.stop_details?.category ?? "unknown"}`);
  if (response.stop_reason === "max_tokens") throw new Error("output cut off at max_tokens");
  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("no text block in response");
  return validate(JSON.parse(text), release, screenshots, MODEL);
}

// Minimal JSON Schema check for the subset prompts/ko-notes.schema.json uses.
export function checkShape(value, schema = SCHEMA, path = "$") {
  const errors = [];
  const type = Array.isArray(value) ? "array" : value === null ? "null" : Number.isInteger(value) ? "integer" : typeof value;
  const ok = schema.type === type || (schema.type === "number" && type === "integer");
  if (!ok) return [`${path}: expected ${schema.type}, got ${type}`];
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: not one of ${schema.enum.join(", ")}`);
  if (type === "object") {
    for (const k of schema.required ?? []) if (!(k in value)) errors.push(`${path}.${k}: missing`);
    for (const [k, v] of Object.entries(value)) {
      if (!schema.properties?.[k]) errors.push(`${path}.${k}: not allowed`);
      else errors.push(...checkShape(v, schema.properties[k], `${path}.${k}`));
    }
  }
  if (type === "array") value.forEach((v, i) => errors.push(...checkShape(v, schema.items, `${path}[${i}]`)));
  return errors;
}

// Drop anything that does not line up with the release, so a bad index never reaches the page.
export function validate(out, release, screenshots, model) {
  const errors = checkShape(out);
  if (errors.length) throw new Error(`schema: ${errors.slice(0, 5).join("; ")}`);
  const n = release.items.length;
  const ids = new Set(screenshots.map((s) => s.id));
  const items = new Array(n).fill(null);
  for (const it of out.items) if (it.index >= 0 && it.index < n) items[it.index] = it.ko;
  const features = out.features
    .filter((f) => f.index >= 0 && f.index < n)
    .map((f) => ({ ...f, screenshot_id: ids.has(f.screenshot_id) ? f.screenshot_id : "" }));
  return { model, summary: out.summary, items, features };
}
