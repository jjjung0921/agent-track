// Shared input and validation for Korean notes written by Codex Cloud.
import { readFileSync } from "node:fs";

export const SCHEMA = JSON.parse(readFileSync(new URL("../prompts/ko-notes.schema.json", import.meta.url), "utf8"));
export const CODEX_PROVENANCE = "codex-cloud";

export const isCurrentNote = (entry, hash) => entry?.hash === hash && entry.ko?.model === CODEX_PROVENANCE;

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
