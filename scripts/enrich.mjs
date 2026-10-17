// Korean summaries, per-feature explanations and usage examples, written by Claude
// from the original release lines only.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";

const SYSTEM = `너는 Claude Code와 Codex 릴리스 노트를 한국어로 정리하는 편집자다.
입력은 한 릴리스의 원문 항목들이다. 원문에 적힌 사실만 쓴다. 원문에 없는 메뉴 이름, 버튼 위치, 출력 화면, 수치를 지어내지 않는다.

문체: 평서문 "~한다/~된다". 짧게. 코드·명령·환경 변수·설정 키는 원문 철자 그대로 백틱으로 감싼다.

출력 규칙
- summary: 이 릴리스에서 사용자에게 가장 중요한 변화 1~2문장.
- items: 모든 항목을 같은 index로 한 줄씩 한국어로 옮긴다. 원문보다 짧게.
- features: 입력에서 needs_detail=true인 항목마다 하나씩 만든다.
  - title: 기능 이름 한 구절.
  - what: 무엇이 바뀌었나 2~3문장. 원문에 있는 범위·제약을 빠뜨리지 않는다.
  - steps: 사용법 2~4단계. 원문으로 알 수 없으면 빈 배열.
  - terminal: 원문에 명령, 슬래시 명령, 플래그, 환경 변수가 직접 나올 때만 lines를 채운다. kind는 comment(설명 한 줄), cmd("$ "로 시작하는 셸 명령 또는 "> "로 시작하는 세션 입력), ui(화면에 보이는 행), hl(바뀐 행). 원문에 화면 모양이 없으면 ui/hl을 쓰지 않는다. 환경 변수 값처럼 원문에 없는 값은 예시임을 comment로 밝힌다. 해당 없으면 lines는 빈 배열.
  - desktop: surfaces에 desktop이 있을 때만 채운다. steps는 원문 문장에서 뽑은 2~4단계 흐름이고, changed는 바뀐 단계면 true. before/after는 원문이 이전 동작을 말할 때만 채운다. 해당 없으면 steps는 빈 배열, before/after는 빈 문자열.
  - screenshot_id: 후보 스크린샷 중 이 기능을 직접 보여주는 것이 있으면 그 id, 없으면 빈 문자열. 비슷한 정도로는 고르지 않는다.
  - notable: 이번 주 주목할 새 기능으로 올릴 만하면 true. 릴리스당 최대 2개.`;

const str = { type: "string" };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "items", "features"],
  properties: {
    summary: str,
    items: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["index", "ko"], properties: { index: { type: "integer" }, ko: str } },
    },
    features: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "title", "what", "steps", "terminal", "desktop", "screenshot_id", "notable"],
        properties: {
          index: { type: "integer" },
          title: str,
          what: str,
          steps: { type: "array", items: str },
          terminal: {
            type: "object",
            additionalProperties: false,
            required: ["title", "lines"],
            properties: {
              title: str,
              lines: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["kind", "text"],
                  properties: { kind: { type: "string", enum: ["comment", "cmd", "ui", "hl"] }, text: str },
                },
              },
            },
          },
          desktop: {
            type: "object",
            additionalProperties: false,
            required: ["steps", "before", "after"],
            properties: {
              steps: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title", "note", "changed"],
                  properties: { title: str, note: str, changed: { type: "boolean" } },
                },
              },
              before: str,
              after: str,
            },
          },
          screenshot_id: str,
          notable: { type: "boolean" },
        },
      },
    },
  },
};

// Items that get a full explanation: every new feature, plus changes that touch the desktop app or IDE.
export function needsDetail(item) {
  return item.cat === "new" || (item.cat !== "fixed" && item.surfaces.some((s) => s === "desktop" || s === "vscode"));
}

export function createClient() {
  return new Anthropic();
}

export async function enrichRelease(client, release, screenshots) {
  const input = {
    tool: release.tool === "claude-code" ? "Claude Code" : "Codex",
    version: release.version,
    items: release.items.map((it, index) => ({ index, category: it.cat, surfaces: it.surfaces, needs_detail: needsDetail(it), text: it.text })),
    screenshot_candidates: screenshots.map((s) => ({ id: s.id, date: s.date, title: s.title, section: s.section, context: s.context, alt: s.alt })),
  };

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(input) }],
  });

  if (response.stop_reason === "refusal") throw new Error(`refused: ${response.stop_details?.category ?? "unknown"}`);
  if (response.stop_reason === "max_tokens") throw new Error("output cut off at max_tokens");
  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("no text block in response");
  return validate(JSON.parse(text), release, screenshots);
}

// Drop anything that does not line up with the release, so a bad index never reaches the page.
function validate(out, release, screenshots) {
  const n = release.items.length;
  const ids = new Set(screenshots.map((s) => s.id));
  const items = new Array(n).fill(null);
  for (const it of out.items) if (Number.isInteger(it.index) && it.index >= 0 && it.index < n) items[it.index] = it.ko;
  const features = out.features
    .filter((f) => Number.isInteger(f.index) && f.index >= 0 && f.index < n)
    .map((f) => ({ ...f, screenshot_id: ids.has(f.screenshot_id) ? f.screenshot_id : "" }));
  return { model: MODEL, summary: out.summary, items, features };
}
