// Shared input and validation for Korean notes written by Codex.
import { readFileSync } from "node:fs";

export const SCHEMA = JSON.parse(readFileSync(new URL("../prompts/ko-notes.schema.json", import.meta.url), "utf8"));
export const CODEX_PROVENANCE = "codex-cli";
const SUPPORTED_PROVENANCE = new Set(["codex-cloud", CODEX_PROVENANCE]);

export const isCurrentNote = (entry, hash) => entry?.hash === hash && SUPPORTED_PROVENANCE.has(entry.ko?.model);

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

// Catch translations that prepend Korean to a mostly copied English changelog line.
// Short English tokens are deliberately ignored so product names and identifiers
// such as MCP, Codex CLI, or VS Code remain usable in Korean prose.
function mostlyPreservesEnglish(source, translation) {
  const tokens = (text) => text.toLowerCase().match(/[a-z][a-z0-9]*(?:[._/-][a-z0-9]+)*/g) ?? [];
  const sourceTokens = tokens(source);
  if (sourceTokens.length < 4) return false;
  const translatedTokens = new Set(tokens(translation));
  const shared = sourceTokens.filter((token) => translatedTokens.has(token)).length;
  return shared / sourceTokens.length >= 0.8;
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
  for (const it of out.items) if (it.index >= 0 && it.index < n) {
    if (mostlyPreservesEnglish(release.items[it.index].text, it.ko)) {
      throw new Error(`item ${it.index}: Korean translation mostly preserves the English source`);
    }
    items[it.index] = it.ko;
  }
  if (items.some((item) => item === null)) throw new Error("missing Korean item translation");
  const features = out.features
    .filter((f) => f.index >= 0 && f.index < n)
    .map((f) => ({ ...f, screenshot_id: ids.has(f.screenshot_id) ? f.screenshot_id : "" }));
  const featureIds = new Set(features.map((feature) => feature.index));
  if (release.items.some((item, index) => needsDetail(item) && !featureIds.has(index))) throw new Error("missing feature detail");
  return { model, summary: out.summary, items, features };
}
