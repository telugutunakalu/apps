// తెలుగు తునకలు · lib/v1/safe.js
// Build DOM without innerHTML so user or remote text can never inject markup.
// All apps share the telugutunakalu.github.io origin (and its localStorage), so one
// injectable app would expose every app — use these helpers for any dynamic text.

/**
 * el("button", { class: "tt-btn", text: "ఆడు", on: { click }, attrs: { "aria-label": "…" } }, child…)
 * Children may be Nodes, strings (inserted as text) or arrays of those; null/false are skipped.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "style" && typeof v === "object") {
      for (const [sk, sv] of Object.entries(v)) sk.startsWith("--") ? node.style.setProperty(sk, sv) : (node.style[sk] = sv);
    }
    else if (k === "on") for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
    else if (k === "attrs") for (const [a, av] of Object.entries(v)) { if (av != null && av !== false) node.setAttribute(a, av === true ? "" : av); }
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Replace all children of `node` with the given children (text-safe). */
export function setChildren(node, ...children) { node.replaceChildren(); append(node, children); return node; }

/** Escape text for the rare places where an HTML string is unavoidable. */
export const escapeHTML = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Static SVG icon markup owned by the kit (never user data). */
export function icon(name) {
  const paths = {
    back: "M15 18l-6-6 6-6", settings: "M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z",
    sound: "M11 5L6 9H2v6h4l5 4V5z M15.5 8.5a5 5 0 010 7 M19 5a10 10 0 010 14",
    mute: "M11 5L6 9H2v6h4l5 4V5z M23 9l-6 6 M17 9l6 6",
    pause: "M6 4h4v16H6z M14 4h4v16h-4z", play: "M6 4l14 8-14 8z",
    close: "M18 6L6 18 M6 6l12 12", restart: "M1 4v6h6 M3.51 15a9 9 0 102.13-9.36L1 10",
    help: "M12 22a10 10 0 100-20 10 10 0 000 20z M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3 M12 17h.01",
  };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true"); svg.classList.add("tt-icon");
  for (const d of (paths[name] ?? "").split(" M").map((p, i) => (i ? "M" + p : p))) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d); svg.append(path);
  }
  return svg;
}
