// Agent Track — renders site/data/releases.json as a filterable vertical timeline.

const REPORT_URL = "https://github.com/jjjung0921/agent-track/issues"; // the "틀린 곳 제보" link is hidden while empty
const TZ = "Asia/Seoul";
const TOOLS = { "claude-code": "Claude Code", codex: "Codex" };
const CATS = { new: "새 기능", improved: "개선", changed: "변경", fixed: "수정" };
const CAT_ORDER = ["new", "improved", "changed", "fixed"];
const PERIODS = { week: ["이번 주", 7], month: ["30일", 30], all: ["전체", Infinity] };
const LOGO = {
  "claude-code": `<svg viewBox="0 0 24 24" class="logo-claude" aria-hidden="true"><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg>`,
  codex: `<svg viewBox="0 0 24 24" class="logo-codex" aria-hidden="true"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>`,
};

const state = { tool: "all", cats: new Set(), period: "week", hidePre: true, q: "", view: "timeline" };
let DATA, NOW, shotsById;

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const rich = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
const badge = (tool) => `<span class="badge ${tool}" title="${TOOLS[tool]}">${LOGO[tool]}<span class="tn">${TOOLS[tool]}</span></span>`;
const tag = (cat) => `<span class="tag ${cat}">${CATS[cat]}</span>`;

const dayKey = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const fmt = (iso, opts) => new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, ...opts }).format(new Date(iso));
const timeOf = (iso) => fmt(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
const weekday = (iso) => fmt(iso, { weekday: "long" });
const md = (iso) => dayKey(iso).slice(5).replace("-", ".");
const longDay = (iso) => `${fmt(iso, { month: "long", day: "numeric" })} ${weekday(iso)}`;

const itemText = (r, i) => r.ko?.items?.[i] || r.items[i].text;
const inPeriod = (r, key = state.period) => NOW - new Date(r.date) <= PERIODS[key][1] * 864e5;

async function init() {
  document.documentElement.classList.add("js");
  DATA = await (await fetch("data/releases.json", { cache: "no-cache" })).json();
  NOW = new Date(DATA.generatedAt);
  shotsById = new Map(DATA.screenshots.map((s) => [s.id, s]));
  $("#synced").textContent = `동기화 ${fmt(DATA.generatedAt, { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} · 6시간마다`;
  renderSummary();
  bindControls();
  render();
}

// ---------- weekly summary ----------
function renderSummary() {
  const week = DATA.releases.filter((r) => inPeriod(r, "week"));
  const from = new Date(NOW - 6 * 864e5);
  $("#week-range").textContent = `${fmt(from, { month: "long", day: "numeric" })} – ${fmt(NOW, { month: "long", day: "numeric" })}`;
  const count = (tool, fn) => week.filter((r) => r.tool === tool).reduce((n, r) => n + fn(r), 0);
  const cats = (...cs) => (r) => r.items.filter((it) => cs.includes(it.cat)).length;
  const rows = [
    ["릴리스", (r) => (r.prerelease ? 0 : 1)],
    ["새 기능", cats("new")],
    ["개선 · 변경", cats("improved", "changed")],
    ["버그 수정", cats("fixed")],
  ];
  $("#stats").innerHTML = rows
    .map(([label, fn]) => `<div class="stat"><span>${label}</span><div class="nums">${Object.keys(TOOLS)
      .map((t) => `<span class="num" title="${TOOLS[t]}">${LOGO[t].replace("<svg", '<svg width="14" height="14"')}${count(t, fn)}</span>`)
      .join("")}</div></div>`)
    .join("");

  const feats = week.flatMap((r) => r.items.map((it, i) => ({ r, i, it })).filter((x) => x.it.cat === "new"));
  const notable = feats.filter(({ r, i }) => r.ko?.features?.some((f) => f.index === i && f.notable));
  const picked = (notable.length ? notable : feats).slice(0, 5);
  $("#highlights-note").textContent = feats.length ? `새 기능 ${feats.length}개 중 ${notable.length ? "자동 선별" : "최신순"}` : "";
  $("#highlights").innerHTML = picked.length
    ? picked.map(({ r, i }) => `<li><button data-open="${r.id}" data-index="${i}">${badge(r.tool)}<span class="text">${rich(featureTitle(r, i))}</span><span class="ver">${esc(r.version)}</span></button></li>`).join("")
    : `<li class="none">이번 주에는 새 기능이 없다.</li>`;
}

function featureTitle(r, i) {
  return r.ko?.features?.find((f) => f.index === i)?.title || itemText(r, i);
}

// ---------- filters ----------
function bindControls() {
  const chipsTool = () => {
    const pool = DATA.releases.filter((r) => inPeriod(r) && (!state.hidePre || !r.prerelease));
    const n = (t) => pool.filter((r) => t === "all" || r.tool === t).length;
    return ["all", ...Object.keys(TOOLS)]
      .map((t) => `<button class="chip" data-tool="${t}" aria-pressed="${state.tool === t}">${t === "all" ? "전체" : TOOLS[t]}<span class="count">${n(t)}</span></button>`)
      .join("");
  };
  const chipsCat = () => {
    const pool = DATA.releases.filter((r) => inPeriod(r) && (state.tool === "all" || r.tool === state.tool));
    return CAT_ORDER.map((c) => `<button class="chip" data-cat="${c}" aria-pressed="${state.cats.has(c)}">${CATS[c]}<span class="count">${pool.reduce((n, r) => n + r.items.filter((it) => it.cat === c).length, 0)}</span></button>`).join("");
  };
  const chipsPeriod = () => Object.entries(PERIODS).map(([k, [label]]) => `<button class="chip" data-period="${k}" aria-pressed="${state.period === k}">${label}</button>`).join("");
  const paint = () => {
    $("#f-tool").innerHTML = $("#f-tool-mobile").innerHTML = chipsTool();
    $("#f-cat").innerHTML = chipsCat();
    $("#f-period").innerHTML = chipsPeriod();
  };
  paint();

  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.tool) state.tool = b.dataset.tool;
    else if (b.dataset.cat) state.cats.has(b.dataset.cat) ? state.cats.delete(b.dataset.cat) : state.cats.add(b.dataset.cat);
    else if (b.dataset.period) state.period = b.dataset.period;
    else if (b.dataset.view) state.view = b.dataset.view;
    else if (b.dataset.day) return openDay(b.dataset.day, null, b);
    else if (b.dataset.open) return openRelease(b.dataset.open, Number(b.dataset.index));
    else if (b.dataset.more) return expandCard(b);
    else return;
    paint();
    render();
  });
  $("#f-pre").addEventListener("change", (e) => { state.hidePre = e.target.checked; paint(); render(); });
  let t;
  $("#search").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); render(); }, 150); });

  const filters = $("#filters");
  const setFilters = (open) => { filters.classList.toggle("open", open); $("#filter-open").setAttribute("aria-expanded", open); };
  $("#filter-open").addEventListener("click", () => setFilters(true));
  $("#filter-close").addEventListener("click", () => setFilters(false));
}

// Items of a release that pass the category and search filters.
function visibleItems(r) {
  return r.items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => !state.cats.size || state.cats.has(it.cat))
    .filter(({ it, i }) => !state.q || `${it.text} ${r.ko?.items?.[i] ?? ""}`.toLowerCase().includes(state.q));
}

function filtered() {
  const filtering = state.cats.size || state.q;
  return DATA.releases.filter((r) => inPeriod(r) && (state.tool === "all" || r.tool === state.tool) && (!filtering || visibleItems(r).length));
}

// ---------- timeline ----------
function render() {
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.view === state.view));
  const releases = filtered();
  $("#empty").hidden = releases.length > 0;
  $("#timeline").innerHTML = state.view === "features" ? featureList(releases) : timeline(releases);
  reveal();
}

function timeline(releases) {
  const days = new Map();
  for (const r of releases) {
    const k = dayKey(r.date);
    if (!days.has(k)) days.set(k, []);
    days.get(k).push(r);
  }
  return [...days.values()]
    .map((list) => {
      const iso = list[0].date;
      const folded = list.filter((r) => r.prerelease && (state.hidePre || !r.items.length));
      const shown = list.filter((r) => !folded.includes(r));
      if (!shown.length && state.hidePre) return "";
      const cards = shown.map(card).join("") + preRow(folded);
      return `<article class="entry">
        <button class="date-btn" data-day="${dayKey(iso)}" aria-haspopup="dialog" aria-expanded="false">
          <span class="md">${md(iso)}</span><span class="wd">${weekday(iso)}</span><span class="label">${longDay(iso)}</span><span class="more">상세 ›</span>
        </button>
        <div class="rail"><span class="top"></span><span class="dot"></span><span class="line"></span></div>
        <div class="cards">${cards}</div>
      </article>`;
    })
    .join("");
}

function counts(r) {
  return CAT_ORDER.map((c) => [c, r.items.filter((it) => it.cat === c).length]).filter(([, n]) => n).map(([c, n]) => `${CATS[c]} ${n}`).join(" · ");
}

function card(r) {
  const items = visibleItems(r).sort((a, b) => CAT_ORDER.indexOf(a.it.cat) - CAT_ORDER.indexOf(b.it.cat));
  const head = items.slice(0, 4);
  const rest = items.length - head.length;
  return `<div class="card" data-id="${r.id}">
    <div class="card-head">${badge(r.tool)}<span class="version">${esc(r.version)}</span><span class="when">${timeOf(r.date)} 배포</span>
      <span class="counts">${counts(r) || "릴리스 노트 없음"}</span><a class="src" href="${esc(r.url)}" target="_blank" rel="noopener">원문 ↗</a></div>
    ${r.ko?.summary ? `<p class="release-summary">${rich(r.ko.summary)}</p>` : ""}
    ${head.length ? `<ul class="items">${head.map(({ it, i }) => itemRow(r, it, i)).join("")}</ul>` : ""}
    ${rest > 0 ? `<button class="more-btn" data-more="${r.id}">나머지 ${rest}개 보기</button>` : ""}
  </div>`;
}

const itemRow = (r, it, i) => `<li class="item">${tag(it.cat)}<p>${rich(itemText(r, i))}</p></li>`;

function expandCard(btn) {
  const r = DATA.releases.find((x) => x.id === btn.dataset.more);
  const items = visibleItems(r).sort((a, b) => CAT_ORDER.indexOf(a.it.cat) - CAT_ORDER.indexOf(b.it.cat));
  btn.previousElementSibling.innerHTML = items.map(({ it, i }) => itemRow(r, it, i)).join("");
  btn.remove();
}

function preRow(list) {
  if (!list.length) return "";
  const vers = list.map((r) => r.version).reverse();
  const note = list.some((r) => r.items.length) ? "" : " — 릴리스 노트 없음";
  return `<button class="pre-row" data-day="${dayKey(list[0].date)}">${badge(list[0].tool)}<span>${esc(vers.join(" · "))}${note}, ${list.length}개 접힘</span></button>`;
}

function featureList(releases) {
  const rows = releases.flatMap((r) => visibleItems(r).filter(({ it }) => it.cat === "new").map(({ i }) => ({ r, i })));
  if (!rows.length) return `<p class="empty">이 기간에는 새 기능이 없다.</p>`;
  return `<div class="feature-list">${rows
    .map(({ r, i }) => `<button class="feature-row" data-open="${r.id}" data-index="${i}">${badge(r.tool)}<span class="text">${rich(featureTitle(r, i))}</span><span class="ver">${esc(r.version)} · ${md(r.date)}</span></button>`)
    .join("")}</div>`;
}

// Scroll reveal: cards rise in once when 10% inside the viewport.
let io;
function reveal() {
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".entry").forEach((e) => e.classList.add("in"));
    return;
  }
  io?.disconnect();
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.querySelectorAll(".card, .pre-row").forEach((c, i) => (c.style.transitionDelay = `${Math.min(i, 4) * 80}ms`));
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  document.querySelectorAll(".entry").forEach((e) => io.observe(e));
}

// ---------- day detail drawer ----------
const drawer = $("#drawer");
let opener = null;
drawer.addEventListener("click", (e) => {
  if (e.target === drawer || e.target.closest("[data-close]")) drawer.close();
  const t = e.target.closest("[data-release]");
  if (t) showRelease(t.dataset.release);
  const s = e.target.closest("[data-surface]");
  if (s && !s.disabled) switchSurface(s);
});
drawer.addEventListener("close", () => {
  opener?.setAttribute("aria-expanded", "false");
  opener?.focus();
});

function openRelease(id, index) {
  const r = DATA.releases.find((x) => x.id === id);
  openDay(dayKey(r.date), id, null, index);
}

function openDay(key, releaseId, btn, index) {
  const list = DATA.releases.filter((r) => dayKey(r.date) === key && (r.items.length || !r.prerelease));
  const day = list.length ? list : DATA.releases.filter((r) => dayKey(r.date) === key);
  if (!day.length) return;
  opener = btn ?? document.activeElement;
  btn?.setAttribute("aria-expanded", "true");
  const iso = day[0].date;
  const nNew = day.reduce((n, r) => n + r.items.filter((it) => it.cat === "new").length, 0);
  const nRest = day.reduce((n, r) => n + r.items.filter((it) => it.cat !== "new").length, 0);
  $("#drawer-title").textContent = `${md(iso)} ${weekday(iso)}`;
  $("#drawer-sub").textContent = `릴리스 ${day.length} · 새 기능 ${nNew} · 개선·변경·수정 ${nRest}`;
  $("#release-tabs").innerHTML = day
    .map((r) => `<button role="tab" data-release="${r.id}">${badge(r.tool)}<span class="v">${esc(r.version)}</span></button>`)
    .join("");
  if (!drawer.open) drawer.showModal(); // before rendering, so the scroll reset below applies to a visible element
  showRelease(releaseId ?? day[0].id, index);
}

function showRelease(id, index) {
  document.querySelectorAll("#release-tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.release === id));
  const r = DATA.releases.find((x) => x.id === id);
  const feats = r.ko?.features ?? [];
  const detailIdx = new Set(feats.map((f) => f.index));
  const rest = r.items.map((it, i) => ({ it, i })).filter(({ i }) => !detailIdx.has(i));

  $("#drawer-body").innerHTML = `
    <div class="lead">
      ${r.ko?.summary ? `<p>${rich(r.ko.summary)}</p>` : ""}
      <p class="src-line">${r.tool === "claude-code" ? "npm 배포" : "GitHub 배포"} ${fmt(r.date, { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} · <a href="${esc(r.url)}" target="_blank" rel="noopener">원문 ↗</a></p>
    </div>
    ${!r.items.length ? `<p class="pending">이 릴리스에는 릴리스 노트가 없다.</p>` : ""}
    ${!r.ko && r.items.length ? `<p class="pending">한국어 설명과 사용 예시는 다음 갱신 때 추가된다. 지금은 원문을 보여준다.</p>` : ""}
    ${feats.map((f) => featureCard(r, f)).join("")}
    ${rest.length ? `<section class="rest"><h3>${feats.length ? "그 밖의 변경" : "전체 변경"} ${rest.length}</h3><ul class="items">${rest
      .sort((a, b) => CAT_ORDER.indexOf(a.it.cat) - CAT_ORDER.indexOf(b.it.cat))
      .map(({ it, i }) => itemRow(r, it, i))
      .join("")}</ul></section>` : ""}`;
  $("#drawer-body").scrollTop = 0;
  if (Number.isInteger(index)) $(`#feature-${index}`)?.scrollIntoView({ block: "start" });
}

function featureCard(r, f) {
  const it = r.items[f.index];
  const term = f.terminal?.lines?.length ? terminal(f.terminal, r.tool) : "";
  const desk = desktopView(f, it);
  const panes = [
    ["terminal", "터미널", term],
    ["desktop", "데스크톱 앱", desk],
  ];
  const first = panes.find(([, , html]) => html)?.[0];
  const example = first
    ? `<div class="sec"><h4>예시 화면</h4>
        <div class="surface-tabs" role="tablist">${panes
          .map(([k, label, html]) => `<button role="tab" data-surface="${k}" aria-selected="${k === first}" ${html ? "" : "disabled"}>${label}</button>`)
          .join("")}</div>
        ${panes.map(([k, , html]) => (html ? `<div class="pane" data-pane="${k}" ${k === first ? "" : "hidden"}>${html}</div>` : "")).join("")}
        ${!desk && it.surfaces.includes("cli") ? `<p class="flow-note">데스크톱 앱 화면에는 바뀌는 곳이 없다.</p>` : ""}
      </div>`
    : "";
  return `<article class="feature" id="feature-${f.index}">
    <div class="feature-head">${tag(it.cat)}<h3>${rich(f.title)}</h3></div>
    ${f.what ? `<div class="sec"><h4>무엇이 바뀌었나</h4><p>${rich(f.what)}</p></div>` : ""}
    ${f.steps?.length ? `<div class="sec"><h4>사용법</h4><ol class="steps">${f.steps.map((s) => `<li>${rich(s)}</li>`).join("")}</ol></div>` : ""}
    ${example}
    <div class="source"><p>원문  ${esc(it.text)}</p>${r.ko ? `<small>설명·예시는 원문을 바탕으로 AI가 작성${REPORT_URL ? ` · <a href="${esc(REPORT_URL)}" target="_blank" rel="noopener">틀린 곳 제보 ↗</a>` : ""}</small>` : ""}</div>
  </article>`;
}

function terminal(t, tool) {
  const lines = t.lines
    .map(({ kind, text }) => {
      if (kind === "cmd") {
        const m = text.match(/^([$>])\s?(.*)$/s);
        return m ? `<span class="${m[1] === "$" ? "p-cmd" : "p-in"}">${m[1]}</span> ${esc(m[2])}` : esc(text);
      }
      return `<span class="${kind}">${esc(text)}</span>`;
    })
    .join("\n");
  return `<div class="terminal"><div class="bar"><i></i><i></i><i></i><span>${esc(t.title || (tool === "codex" ? "codex" : "claude"))}</span></div><pre>${lines}</pre></div>`;
}

function desktopView(f, it) {
  const shot = shotsById.get(f.screenshot_id);
  if (shot) {
    return `<figure class="shot"><img src="${esc(shot.light)}" alt="${esc(shot.alt)}" loading="lazy"><figcaption>출처: <a href="${esc(shot.url)}" target="_blank" rel="noopener">OpenAI Codex changelog ↗</a></figcaption></figure>`;
  }
  const steps = f.desktop?.steps ?? [];
  if (!steps.length) return "";
  const flow = steps
    .map((s, i) => `<li class="${s.changed ? "changed" : ""}"><b>${i + 1}</b><div><strong>${rich(s.title)}</strong>${s.note ? `<span>${rich(s.note)}</span>` : ""}</div></li>`)
    .join(`<li class="arrow" aria-hidden="true">↓</li>`);
  const diff = f.desktop.before || f.desktop.after
    ? `<p class="flow-diff">${f.desktop.before ? `<s>이전: ${rich(f.desktop.before)}</s> →` : ""} ${f.desktop.after ? `<b>이제: ${rich(f.desktop.after)}</b>` : ""}</p>`
    : "";
  return `<ol class="flow">${flow}</ol>${diff}<p class="flow-note">개략 흐름 · 실제 화면 아님</p>`;
}

function switchSurface(btn) {
  const sec = btn.closest(".sec");
  sec.querySelectorAll("[data-surface]").forEach((b) => b.setAttribute("aria-selected", b === btn));
  sec.querySelectorAll("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== btn.dataset.surface));
}

init().catch((err) => {
  console.error(err);
  $("#empty").hidden = false;
  $("#empty").textContent = "데이터를 불러오지 못했다.";
});
