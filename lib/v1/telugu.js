// తెలుగు తునకలు · lib/v1/telugu.js
// Telugu script utilities shared by every app: alphabet tables, akshara (syllable)
// segmentation, గుణింతం, Telugu digits and look-alike letters.
// Pure functions, no DOM — also runs under Node for the unit tests.

export const VIRAMA = "్";      // ్
export const ANUSVARA = "ం";    // ం
export const VISARGA = "ః";     // ః
export const ZWJ = "‍", ZWNJ = "‌";

/** అచ్చులు in traditional order (ఋ ౠ included; archaic ఌ ౡ left out of teaching sets). */
export const VOWELS = ["అ", "ఆ", "ఇ", "ఈ", "ఉ", "ఊ", "ఋ", "ౠ", "ఎ", "ఏ", "ఐ", "ఒ", "ఓ", "ఔ"];

/** హల్లులు (single code points) in traditional order. క్ష is a conjunct, see ALPHABET. */
export const CONSONANTS = [
  "క", "ఖ", "గ", "ఘ", "ఙ", "చ", "ఛ", "జ", "ఝ", "ఞ", "ట", "ఠ", "డ", "ఢ", "ణ",
  "త", "థ", "ద", "ధ", "న", "ప", "ఫ", "బ", "భ", "మ", "య", "ర", "ల", "వ",
  "శ", "ష", "స", "హ", "ళ", "ఱ",
];

/** Full display alphabet as taught (vowels, ం ః, consonants incl. క్ష). */
export const ALPHABET = [...VOWELS, "అం", "అః", ...CONSONANTS.slice(0, 34), "క్ష", "ఱ"];

/** Independent vowel → dependent vowel sign (గుణింతపు గుర్తు). */
export const VOWEL_SIGN = {
  "ఆ": "ా", "ఇ": "ి", "ఈ": "ీ", "ఉ": "ు", "ఊ": "ూ", "ఋ": "ృ", "ౠ": "ౄ",
  "ఎ": "ె", "ఏ": "ే", "ఐ": "ై", "ఒ": "ొ", "ఓ": "ో", "ఔ": "ౌ",
};
/** Dependent vowel sign → independent vowel. */
export const SIGN_VOWEL = Object.fromEntries(Object.entries(VOWEL_SIGN).map(([v, s]) => [s, v]));

/** గుణింతం order: క కా కి కీ కు కూ కృ కౄ కె కే కై కొ కో కౌ కం కః */
export const GUNINTHAM_SIGNS = ["", "ా", "ి", "ీ", "ు", "ూ", "ృ", "ౄ", "ె", "ే", "ై", "ొ", "ో", "ౌ", ANUSVARA, VISARGA];

export const VARGAS = {
  "క": ["క", "ఖ", "గ", "ఘ", "ఙ"],
  "చ": ["చ", "ఛ", "జ", "ఝ", "ఞ"],
  "ట": ["ట", "ఠ", "డ", "ఢ", "ణ"],
  "త": ["త", "థ", "ద", "ధ", "న"],
  "ప": ["ప", "ఫ", "బ", "భ", "మ"],
};

/** Named letter groups for game "target sets" (labels are what the UI shows). */
export const GROUPS = {
  achchulu:    { te: "అచ్చులు", en: "Vowels", letters: VOWELS },
  hallulu:     { te: "హల్లులు", en: "Consonants", letters: CONSONANTS },
  ka_vargam:   { te: "క వర్గం", en: "ka-row", letters: VARGAS["క"] },
  cha_vargam:  { te: "చ వర్గం", en: "cha-row", letters: VARGAS["చ"] },
  ta_vargam:   { te: "ట వర్గం", en: "ṭa-row", letters: VARGAS["ట"] },
  tha_vargam:  { te: "త వర్గం", en: "ta-row", letters: VARGAS["త"] },
  pa_vargam:   { te: "ప వర్గం", en: "pa-row", letters: VARGAS["ప"] },
  parushamulu: { te: "పరుషములు", en: "Hard stops", letters: ["క", "చ", "ట", "త", "ప"] },
  saralamulu:  { te: "సరళములు", en: "Soft stops", letters: ["గ", "జ", "డ", "ద", "బ"] },
  anunasikamulu: { te: "అనునాసికములు", en: "Nasals", letters: ["ఙ", "ఞ", "ణ", "న", "మ"] },
  antasthamulu:  { te: "అంతస్థములు", en: "Semivowels", letters: ["య", "ర", "ఱ", "ల", "ళ", "వ"] },
  ushmamulu:     { te: "ఊష్మములు", en: "Sibilants", letters: ["శ", "ష", "స", "హ"] },
};

/**
 * Visually confusable letters, used as "smart distractors" so games teach
 * discrimination instead of rewarding luck. Each inner list is one confusion set.
 */
export const LOOKALIKES = [
  ["బ", "భ"], ["ద", "ధ"], ["డ", "ఢ"], ["త", "థ"], ["ప", "ఫ", "ష"], ["చ", "ఛ"],
  ["ట", "ఠ"], ["ల", "ళ"], ["మ", "య"], ["వ", "ప"], ["న", "స"], ["ర", "ఠ"],
  ["అ", "ఆ"], ["ఇ", "ఈ"], ["ఉ", "ఊ"], ["ఎ", "ఏ", "ఐ"], ["ఒ", "ఓ", "ఔ"],
];

export const DIGITS = ["౦", "౧", "౨", "౩", "౪", "౫", "౬", "౭", "౮", "౯"];

/* ---------- character classes (by Unicode range, so rare letters work too) ---------- */
const cp = ch => ch.codePointAt(0);
const inRange = (c, a, b) => c >= a && c <= b;

export const isVowel = ch => { const c = cp(ch); return inRange(c, 0x0C05, 0x0C14) || c === 0x0C60 || c === 0x0C61; };
export const isConsonant = ch => { const c = cp(ch); return inRange(c, 0x0C15, 0x0C39) || inRange(c, 0x0C58, 0x0C5A) || c === 0x0C5D; };
export const isVowelSign = ch => { const c = cp(ch); return inRange(c, 0x0C3E, 0x0C4C) || c === 0x0C55 || c === 0x0C56 || c === 0x0C62 || c === 0x0C63; };
/** ఀ ఁ ం ః ఄ and nukta — marks that attach to the preceding letter. */
export const isMark = ch => { const c = cp(ch); return inRange(c, 0x0C00, 0x0C04) || c === 0x0C3C; };
export const isTeluguDigit = ch => { const c = cp(ch); return inRange(c, 0x0C66, 0x0C6F); };
export const isTelugu = ch => { const c = cp(ch); return inRange(c, 0x0C00, 0x0C7F); };
const attaches = ch => isVowelSign(ch) || isMark(ch) || ch === VIRAMA || ch === ZWJ || ch === ZWNJ;

/** NFC-normalise for storage/comparison (keeps ZWNJ/ZWJ, which change rendering). */
export const nfc = s => String(s ?? "").normalize("NFC");
/** Comparison key: NFC, trimmed, zero-width joiners removed. */
export const normalize = s => nfc(s).trim().replace(/[​-‍﻿]/g, "");
export const sameText = (a, b) => normalize(a) === normalize(b);

/**
 * Split text into tokens: Telugu aksharas (syllable clusters) and everything else.
 * An akshara is  (C ్)* C [sign] [marks]  or  V [marks], where the virama only links
 * to the next consonant when not followed by ZWNJ. A trailing pollu (C ్ with no
 * following consonant, e.g. the న్ in పెన్) is merged into the previous akshara,
 * matching how Telugu readers count syllables.
 * @returns {{text:string, type:"akshara"|"space"|"digit"|"punct"|"other"}[]}
 */
export function tokenize(text, { mergeFinalPollu = true } = {}) {
  const out = [];
  let cur = "", curType = null;
  const flush = () => { if (cur) out.push({ text: cur, type: curType }); cur = ""; curType = null; };
  for (const ch of nfc(text)) {
    if (curType === "akshara") {
      if (attaches(ch)) { cur += ch; continue; }
      if (isConsonant(ch) && (cur.endsWith(VIRAMA) || cur.endsWith(VIRAMA + ZWJ))) { cur += ch; continue; }
    }
    flush();
    if (isConsonant(ch) || isVowel(ch)) curType = "akshara";
    else if (attaches(ch)) curType = "akshara";          // stray sign at start: keep it visible
    else if (/\s/u.test(ch)) curType = "space";
    else if (isTeluguDigit(ch) || /\p{Nd}/u.test(ch)) curType = "digit";
    else if (/\p{P}|\p{S}/u.test(ch)) curType = "punct";
    else curType = "other";
    cur = ch;
  }
  flush();
  if (!mergeFinalPollu) return out;
  const merged = [];
  for (const t of out) {
    const prev = merged[merged.length - 1];
    const isPollu = t.type === "akshara" && isConsonant(t.text[0]) && t.text.endsWith(VIRAMA);
    if (isPollu && prev && prev.type === "akshara") prev.text += t.text;
    else merged.push({ ...t });
  }
  return merged;
}

/** Aksharas only (spaces, digits and punctuation dropped). aksharalu("ప్రపంచం") → ["ప్ర","పం","చం"] */
export const aksharalu = (text, opts) => tokenize(text, opts).filter(t => t.type === "akshara").map(t => t.text);

/** Telugu syllable count of a word. */
export const syllableCount = text => aksharalu(text).length;

/** గుణింతం of a consonant (or conjunct): ["క","కా","కి",…,"కః"] */
export const gunintham = base => GUNINTHAM_SIGNS.map(s => base + s);

/** Attach an independent vowel to a consonant: withVowel("క","ఇ") → "కి" ("అ" → bare consonant). */
export function withVowel(consonant, vowel) {
  if (vowel === "అ") return consonant;
  const sign = VOWEL_SIGN[vowel];
  if (!sign) throw new Error(`Unknown vowel ${vowel}`);
  return consonant + sign;
}

/** The leading letter of an akshara: independent vowel, or its first consonant. */
export const baseLetter = akshara => [...nfc(akshara)].find(ch => isVowel(ch) || isConsonant(ch)) ?? "";

/** Which vowel an akshara carries: "కి" → "ఇ", "క" → "అ", "క్" → null, "ఆ" → "ఆ". */
export function vowelOf(akshara) {
  const chars = [...nfc(akshara)];
  if (isVowel(chars[0])) return chars[0];
  const sign = chars.find(isVowelSign);
  if (sign) return SIGN_VOWEL[sign] ?? null;
  return chars[chars.length - 1] === VIRAMA ? null : "అ";
}

/** Is this akshara a conjunct/double consonant (సంయుక్తం / ద్విత్వం)? */
export const isConjunct = akshara => new RegExp(`[\\u0C15-\\u0C39]${VIRAMA}[\\u0C15-\\u0C39]`, "u").test(nfc(akshara));

/** Letters visually confusable with `letter` (excluding itself). */
export function lookalikesOf(letter) {
  const base = baseLetter(letter);
  const set = new Set();
  for (const group of LOOKALIKES) if (group.includes(base)) group.forEach(g => g !== base && set.add(g));
  return [...set];
}

/** Replace the base letter of an akshara keeping its signs: swapBase("బా","భ") → "భా". */
export const swapBase = (akshara, letter) => { const b = baseLetter(akshara); return b ? nfc(akshara).replace(b, letter) : akshara; };

/* ---------- digits ---------- */
export const toTeluguDigits = n => String(n).replace(/[0-9]/g, d => DIGITS[+d]);
export const fromTeluguDigits = s => String(s).replace(/[౦-౯]/g, d => String(cp(d) - 0x0C66));
/** Indian grouping with Telugu or Latin digits: 150000 → "1,50,000" / "౧,౫౦,౦౦౦". */
export function formatIndian(n, { telugu = false } = {}) {
  const s = Number(n).toLocaleString("en-IN");
  return telugu ? toTeluguDigits(s) : s;
}

/* ---------- small helpers games need ---------- */
/** Seeded PRNG (mulberry32) so puzzles/levels are reproducible from a number. */
export function rng(seed = Date.now()) {
  let a = seed >>> 0;
  const next = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  next.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  next.pick = arr => arr[Math.floor(next() * arr.length)];
  next.shuffle = arr => { const a2 = [...arr]; for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; };
  return next;
}
