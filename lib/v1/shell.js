// తెలుగు తునకలు · lib/v1/shell.js
// The app shell every upgraded app uses: top bar (back link, title, sound, help, settings),
// a settings sheet persisted per app, overlays, toasts, best scores, a fixed-timestep loop,
// and pointer/keyboard input that never double-fires.
import { el, icon, setChildren } from "./safe.js";
import { sfx } from "./sfx.js";

const NS = "tt:v1";

/** Namespaced, exception-safe localStorage (private mode / blocked storage just no-ops). */
export function store(app) {
  const k = key => `${NS}:${app}:${key}`;
  return {
    get(key, fallback) {
      try { const v = localStorage.getItem(k(key)); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(k(key), JSON.stringify(value)); } catch { /* storage unavailable */ } },
    remove(key) { try { localStorage.removeItem(k(key)); } catch { /* ignore */ } },
  };
}
export const globalStore = store("global");

/** True when running from the staging folder (apps/next/). */
export const isBeta = () => /\/next\//.test(location.pathname);
export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const isTouch = () => matchMedia("(pointer: coarse)").matches;
export const params = () => new URLSearchParams(location.search);

/** Wait (bounded) for web fonts so canvas/WebGL text is drawn with the right Telugu font. */
export async function fontsReady(specs = ["700 48px 'Noto Sans Telugu'", "48px Ramabhadra"], timeout = 3000) {
  if (!document.fonts) return;
  const loads = Promise.all(specs.map(s => document.fonts.load(s, "అకతెలుగు").catch(() => null)));
  await Promise.race([loads, new Promise(r => setTimeout(r, timeout))]);
}

export function haptic(pattern = 12) {
  if (globalStore.get("haptics", true) && navigator.vibrate) { try { navigator.vibrate(pattern); } catch { /* ignore */ } }
}

/* ======================================================================================
   createApp — builds the frame and returns the app API.
   settings: [{ key, label, type: "segmented"|"range"|"toggle", default, options:[{value,label}],
               min, max, step, format(v), help, restart }]
   ====================================================================================== */
export function createApp({
  id, title, accent, theme = "dark", game = false, settings = [], help = null,
  onSettings = null, stage: existingStage = null, mount = document.body,
  backHref = "./index.html", backLabel = "తునకలు",
}) {
  const root = document.documentElement;
  root.lang = "te";
  if (accent) root.dataset.accent = accent;
  root.dataset.theme = theme;
  const s = store(id);

  const values = {};
  for (const f of settings) values[f.key] = s.get("setting:" + f.key, f.default);

  // ---- frame ----
  const frame = el("div", { class: "tt-app" + (game ? " tt-app--game" : "") });
  const titleEl = el("h1", { class: "tt-topbar__title", text: title });
  const soundBtn = el("button", { class: "tt-iconbtn", type: "button", attrs: { "aria-label": "శబ్దం" } });
  const renderSound = () => {
    setChildren(soundBtn, icon(sfx.muted ? "mute" : "sound"));
    soundBtn.setAttribute("aria-pressed", String(!sfx.muted));
    soundBtn.title = sfx.muted ? "శబ్దం ఆన్ చేయండి" : "శబ్దం ఆఫ్ చేయండి";
  };
  soundBtn.addEventListener("click", () => { sfx.setMuted(!sfx.muted); renderSound(); if (!sfx.muted) sfx.play("tap"); });
  renderSound();

  const topbar = el("header", { class: "tt-topbar" },
    el("a", { class: "tt-back", href: backHref, attrs: { "aria-label": "తెలుగు తునకలు యాప్‌లకు తిరిగి వెళ్ళండి" } },
      icon("back"), el("span", { class: "tt-back__label", text: backLabel })),
    titleEl,
    isBeta() && el("span", { class: "tt-beta", text: "బీటా", title: "ఇది పరీక్షలో ఉన్న కొత్త వెర్షన్" }),
  );
  const actions = [];
  const stage = existingStage ?? el("main", { class: "tt-stage" });
  stage.classList.add("tt-stage");
  frame.append(topbar, stage);
  mount.prepend(frame);

  // ---- toasts (one live region, newest replaces current: no stale timers) ----
  const toastRegion = el("div", { class: "tt-toasts", attrs: { role: "status", "aria-live": "polite" } });
  document.body.append(toastRegion);
  let toastTimer = 0;
  function toast(message, { tone = "info", ms = 1800 } = {}) {
    clearTimeout(toastTimer);
    const t = el("div", { class: `tt-toast${tone !== "info" ? " tt-toast--" + tone : ""}`, text: message });
    setChildren(toastRegion, t);
    toastTimer = setTimeout(() => { t.classList.add("is-leaving"); toastTimer = setTimeout(() => t.remove(), 220); }, ms);
  }

  // ---- overlay card (start / pause / game over) ----
  const overlayEl = el("div", { class: "tt-overlay", hidden: true });
  stage.append(overlayEl);
  let overlayOpen = false;
  function overlay({ title: t, body = null, stats = null, actions: acts = [] } = {}) {
    const card = el("div", { class: "tt-card", attrs: { role: "dialog", "aria-modal": "true", "aria-label": t } },
      t && el("h2", { text: t }),
      body == null ? null : (body instanceof Node ? body : el("p", { text: body })),
      stats && el("div", { class: "tt-card__stat" }, stats.map(st => el("div", {}, el("b", { text: st.value }), el("span", { text: st.label })))),
      acts.length && el("div", { class: "tt-card__actions" }, acts.map((a, i) => el("button", {
        type: "button", class: "tt-btn" + (a.ghost ? " tt-btn--ghost" : "") + (i === 0 && !a.ghost ? " tt-btn--lg" : ""),
        text: a.label, on: { click: () => { sfx.play("tap"); a.onClick?.(); } },
      }))),
    );
    setChildren(overlayEl, card);
    overlayEl.hidden = false; overlayOpen = true;
    requestAnimationFrame(() => card.querySelector("button")?.focus({ preventScroll: true }));
  }
  function hideOverlay() { overlayEl.hidden = true; overlayOpen = false; overlayEl.replaceChildren(); }

  // ---- sheets (settings / help) ----
  function sheet(heading, bodyNodes, footNodes = null) {
    const dlg = el("dialog", { class: "tt-sheet" });
    const close = () => dlg.close();
    dlg.append(el("div", { class: "tt-sheet__panel" },
      el("div", { class: "tt-sheet__head" }, el("h2", { text: heading }),
        el("button", { class: "tt-iconbtn", type: "button", attrs: { "aria-label": "మూసివేయి" }, on: { click: close } }, icon("close"))),
      el("div", { class: "tt-sheet__body" }, bodyNodes),
      footNodes && el("div", { class: "tt-sheet__foot" }, footNodes),
    ));
    dlg.addEventListener("click", e => { if (e.target === dlg) close(); });
    dlg.addEventListener("close", () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
    return dlg;
  }

  function settingField(f) {
    const note = el("div", { class: "tt-field__note", hidden: true, text: "కొత్త ఆటలో అమలవుతుంది" });
    const commit = v => {
      values[f.key] = v; s.set("setting:" + f.key, v);
      if (f.restart) note.hidden = false;
      onSettings?.({ ...values }, f.key);
    };
    const label = el("div", { class: "tt-field__label", text: f.label });
    const help = f.help && el("div", { class: "tt-field__help", text: f.help });
    if (f.type === "toggle") {
      const input = el("input", { type: "checkbox", class: "tt-switch", checked: !!values[f.key], attrs: { "aria-label": f.label },
        on: { change: e => commit(e.target.checked) } });
      return el("div", { class: "tt-field" }, el("label", { class: "tt-field__row" }, el("div", {}, label, help), input), note);
    }
    if (f.type === "range") {
      const fmt = f.format ?? (v => v);
      const out = el("span", { class: "tt-field__value", text: fmt(values[f.key]) });
      const input = el("input", { type: "range", class: "tt-range", min: f.min, max: f.max, step: f.step ?? 1, value: values[f.key],
        attrs: { "aria-label": f.label },
        on: { input: e => { out.textContent = fmt(+e.target.value); }, change: e => commit(+e.target.value) } });
      return el("div", { class: "tt-field" }, el("div", { class: "tt-field__row" }, label, out), help, input, note);
    }
    // segmented (default)
    const seg = el("div", { class: "tt-seg", attrs: { role: "group", "aria-label": f.label } });
    const render = () => setChildren(seg, f.options.map(o => el("button", {
      type: "button", text: o.label, attrs: { "aria-pressed": String(o.value === values[f.key]) },
      on: { click: () => { commit(o.value); render(); sfx.play("tap"); } },
    })));
    render();
    return el("div", { class: "tt-field" }, label, help, seg, note);
  }

  function openSettings() {
    sfx.play("tap");
    sheet("అమరికలు", settings.map(settingField), [
      el("button", { type: "button", class: "tt-btn tt-btn--ghost", text: "మొదటి అమరికలు",
        on: { click: () => { for (const f of settings) { values[f.key] = f.default; s.remove("setting:" + f.key); }
          onSettings?.({ ...values }, null); document.querySelector("dialog.tt-sheet")?.close(); toast("అమరికలు మార్చబడ్డాయి"); } } }),
      el("button", { type: "button", class: "tt-btn", text: "సరే", on: { click: e => e.target.closest("dialog").close() } }),
    ]);
  }

  function openHelp() {
    sfx.play("tap");
    const body = typeof help === "function" ? help() : help;
    sheet("ఎలా ఆడాలి?", body instanceof Node ? body : el("div", {}, String(body).split("\n").map(line => el("p", { text: line }))));
  }

  function addAction(name, label, onClick) {
    const b = el("button", { class: "tt-iconbtn", type: "button", attrs: { "aria-label": label }, title: label, on: { click: onClick } }, icon(name));
    actions.push(b); topbar.append(b); return b;
  }
  topbar.append(soundBtn);
  if (help) addAction("help", "ఎలా ఆడాలి?", openHelp);
  if (settings.length) addAction("settings", "అమరికలు", openSettings);

  return {
    id, stage, topbar, root: frame, settings: values, store: s,
    toast, overlay, hideOverlay, get overlayOpen() { return overlayOpen; },
    openSettings, openHelp, sheet, addAction,
    setTitle(t) { titleEl.textContent = t; },
    /** Best score per key (e.g. per level or grid size). submit() → { best, isNew } */
    best(key = "default") {
      return {
        get: () => s.get("best:" + key, 0),
        submit(score, { lowerIsBetter = false } = {}) {
          const prev = s.get("best:" + key, null);
          const isNew = prev === null || (lowerIsBetter ? score < prev : score > prev);
          if (isNew) s.set("best:" + key, score);
          return { best: isNew ? score : prev, isNew: isNew && prev !== null };
        },
      };
    },
  };
}

/* ======================================================================================
   createLoop — fixed-timestep update (same speed at 60/90/120 Hz) + per-frame render.
   onHidden: called when the tab hides (games show their pause card); without it the
   loop simply stops while hidden and resumes when visible.
   ====================================================================================== */
export function createLoop({ update = () => {}, render = () => {}, step = 1 / 60, onHidden = null }) {
  let acc = 0, last = null, raf = 0, running = false, autoResume = false;
  const frame = t => {
    raf = requestAnimationFrame(frame);
    if (last === null) last = t;
    const dt = Math.min((t - last) / 1000, 0.1);
    last = t; acc += dt;
    let n = 0;
    while (acc >= step && n < 6) { update(step); acc -= step; n++; }
    if (n === 6) acc = 0;
    render(dt, acc / step);
  };
  const api = {
    start() { if (running) return; running = true; last = null; acc = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    get running() { return running; },
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) { api.stop(); if (onHidden) onHidden(); else autoResume = true; }
    else if (!document.hidden && autoResume) { autoResume = false; api.start(); }
  });
  return api;
}

/* ======================================================================================
   Input. Pointer events only (one event stream for mouse/touch/pen → no ghost taps).
   ====================================================================================== */
export function pointerControls(target, {
  onTap, onSwipe, onDragStart, onDrag, onDragEnd, swipeDistance = 28, tapSlop = 10, tapTime = 350,
  // Presses that start on these never count as game input (so tapping "Start" doesn't also steer).
  ignore = "button, a, input, select, textarea, label, dialog, .tt-overlay, .tt-pad",
} = {}) {
  target.style.touchAction = "none";
  let start = null;
  const pos = e => { const r = target.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }; };
  const down = e => {
    if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (ignore && e.target instanceof Element && e.target.closest(ignore)) return;
    start = { ...pos(e), t: performance.now() };
    target.setPointerCapture?.(e.pointerId);
    onDragStart?.(start);
  };
  const move = e => { if (!start) return; const p = pos(e); onDrag?.({ ...p, dx: p.x - start.x, dy: p.y - start.y }); };
  const up = e => {
    if (!start) return;
    const p = pos(e), dx = p.x - start.x, dy = p.y - start.y, dist = Math.hypot(dx, dy), dt = performance.now() - start.t;
    start = null;
    onDragEnd?.({ ...p, dx, dy });
    if (dist < tapSlop && dt < tapTime) onTap?.({ ...p, side: p.x < p.w / 2 ? "left" : "right" });
    else if (dist >= swipeDistance) {
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      onSwipe?.({ dir, dx, dy });
    }
  };
  const cancel = () => { start = null; };
  target.addEventListener("pointerdown", down);
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", up);
  target.addEventListener("pointercancel", cancel);
  return () => { target.removeEventListener("pointerdown", down); target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", up); target.removeEventListener("pointercancel", cancel); };
}

/**
 * keyControls({ ArrowLeft: fn, " ": fn, KeyA: fn }) — matches e.key or e.code.
 * Ignored while typing in a field, while a modal sheet is open, or when the key
 * would activate a focused button (prevents Space firing twice).
 */
export function keyControls(map, { repeat = false } = {}) {
  const handler = e => {
    if (e.defaultPrevented || (!repeat && e.repeat)) return;
    const t = e.target;
    if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if ((e.key === " " || e.key === "Enter") && t instanceof HTMLElement && /^(BUTTON|A)$/.test(t.tagName)) return;
    if (document.querySelector("dialog[open]")) return;
    const fn = map[e.key] ?? map[e.code];
    if (fn) { e.preventDefault(); fn(e); }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}

/** Share a link with the native sheet, falling back to the clipboard. */
export async function share({ title, text, url = location.href }, toast) {
  try {
    if (navigator.share) { await navigator.share({ title, text, url }); return; }
    await navigator.clipboard.writeText(url);
    toast?.("లింక్ కాపీ అయింది");
  } catch { /* user cancelled */ }
}
