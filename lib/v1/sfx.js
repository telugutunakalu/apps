// తెలుగు తునకలు · lib/v1/sfx.js
// Tiny synthesized sound effects (no audio files, no libraries) + Telugu speech.
// Mute is global across apps (one setting for the whole site) and remembered.

const MUTE_KEY = "tt:v1:global:muted";
let muted = (() => { try { return JSON.parse(localStorage.getItem(MUTE_KEY) ?? "false"); } catch { return false; } })();
let ctx = null, master = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
// iOS/Chrome only allow audio after a user gesture: unlock on the first one.
const unlock = () => { audio(); window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
window.addEventListener("pointerdown", unlock);
window.addEventListener("keydown", unlock);

function tone({ freq, to = null, type = "sine", dur = 0.12, gain = 0.2, delay = 0 }) {
  const a = audio(); if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.3, gain = 0.25, from = 1200, to = 200, delay = 0 }) {
  const a = audio(); if (!a) return;
  const t0 = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf;
  f.type = "lowpass"; f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

const notes = (list, opts = {}) => list.forEach((f, i) => tone({ freq: f, dur: 0.16, delay: i * (opts.gap ?? 0.085), type: opts.type ?? "triangle", gain: opts.gain ?? 0.18 }));

const RECIPES = {
  tap:    () => tone({ freq: 880, dur: 0.05, gain: 0.08, type: "triangle" }),
  pop:    () => tone({ freq: 520, to: 1100, dur: 0.07, gain: 0.14 }),
  good:   () => notes([784, 1175], { gap: 0.07 }),
  bad:    () => tone({ freq: 230, to: 130, type: "square", dur: 0.22, gain: 0.09 }),
  coin:   () => { tone({ freq: 988, dur: 0.06, type: "square", gain: 0.07 }); tone({ freq: 1319, dur: 0.14, type: "square", gain: 0.07, delay: 0.055 }); },
  jump:   () => tone({ freq: 330, to: 700, dur: 0.11, type: "triangle", gain: 0.13 }),
  whoosh: () => noise({ dur: 0.28, gain: 0.12, from: 500, to: 2600 }),
  crash:  () => { noise({ dur: 0.5, gain: 0.32, from: 1400, to: 90 }); tone({ freq: 120, to: 50, type: "sawtooth", dur: 0.35, gain: 0.12 }); },
  level:  () => notes([523, 659, 784, 1047]),
  win:    () => notes([523, 659, 784, 1047, 1319, 1568], { gap: 0.1 }),
  tick:   () => tone({ freq: 1400, dur: 0.03, gain: 0.05, type: "square" }),
};

export const sfx = {
  play(name) { if (!muted) { try { RECIPES[name]?.(); } catch { /* audio not available */ } } },
  get muted() { return muted; },
  setMuted(v) { muted = !!v; try { localStorage.setItem(MUTE_KEY, JSON.stringify(muted)); } catch { /* ignore */ } },
  /** Custom one-off tone for games (e.g. a pitch per letter). */
  tone(opts) { if (!muted) tone(opts); },
};

/* ---------- Telugu speech (where the device has a te-IN voice) ---------- */
function teluguVoice() {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  return voices.find(v => /^te(-|_|$)/i.test(v.lang)) ?? null;
}
export const canSpeakTelugu = () => !!teluguVoice();
/** Speak Telugu text. Returns false when no Telugu voice is installed (caller can hide the feature). */
export function speak(text, { rate = 0.9 } = {}) {
  if (muted || !window.speechSynthesis) return false;
  const voice = teluguVoice();
  if (!voice) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice; u.lang = voice.lang; u.rate = rate;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
  return true;
}
// Voices load asynchronously on some browsers.
window.speechSynthesis?.addEventListener?.("voiceschanged", () => {});
