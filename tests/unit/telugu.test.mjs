// node --test tests/unit/
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as te from "../../lib/v1/telugu.js";

test("aksharalu splits by syllable, not code point", () => {
  assert.deepEqual(te.aksharalu("ప్రపంచం"), ["ప్ర", "పం", "చం"]);
  assert.deepEqual(te.aksharalu("పునరావృతం"), ["పు", "న", "రా", "వృ", "తం"]);
  assert.deepEqual(te.aksharalu("శ్రీకృష్ణదేవరాయలు"), ["శ్రీ", "కృ", "ష్ణ", "దే", "వ", "రా", "య", "లు"]);
  assert.deepEqual(te.aksharalu("క్షమ"), ["క్ష", "మ"]);
  assert.deepEqual(te.aksharalu("స్త్రీ"), ["స్త్రీ"]);
  assert.deepEqual(te.aksharalu("అమ్మ"), ["అ", "మ్మ"]);
  assert.deepEqual(te.aksharalu("ఉన్నాడు"), ["ఉ", "న్నా", "డు"]);
});

test("final pollu merges into the previous akshara (optional)", () => {
  assert.deepEqual(te.aksharalu("పెన్"), ["పెన్"]);
  assert.deepEqual(te.aksharalu("పెన్", { mergeFinalPollu: false }), ["పె", "న్"]);
});

test("tokenize classifies spaces, digits and punctuation", () => {
  const types = te.tokenize("రాము, ౧౨ 34!").map(t => `${t.text}:${t.type}`);
  assert.deepEqual(types, ["రా:akshara", "ము:akshara", ",:punct", " :space", "౧:digit", "౨:digit", " :space", "3:digit", "4:digit", "!:punct"]);
  assert.deepEqual(te.aksharalu("a\r\nబ\tస"), ["బ", "స"]);
});

test("ZWNJ after virama keeps an explicit pollu (no conjunct)", () => {
  assert.equal(te.aksharalu("క్‌ష", { mergeFinalPollu: false }).length, 2);
});

test("gunintham / withVowel / vowelOf / baseLetter", () => {
  const g = te.gunintham("క");
  assert.equal(g.length, 16);
  assert.deepEqual(g.slice(0, 4), ["క", "కా", "కి", "కీ"]);
  assert.equal(g[14], "కం");
  assert.equal(te.withVowel("మ", "ఊ"), "మూ");
  assert.equal(te.withVowel("మ", "అ"), "మ");
  assert.equal(te.vowelOf("కి"), "ఇ");
  assert.equal(te.vowelOf("క"), "అ");
  assert.equal(te.vowelOf("ఆ"), "ఆ");
  assert.equal(te.vowelOf("క్"), null);
  assert.equal(te.baseLetter("ప్రా"), "ప");
  assert.equal(te.swapBase("బా", "భ"), "భా");
  assert.ok(te.isConjunct("క్ష") && !te.isConjunct("కా"));
});

test("look-alike letters", () => {
  assert.deepEqual(te.lookalikesOf("బా"), ["భ"]);
  assert.ok(te.lookalikesOf("ఒ").includes("ఓ"));
  assert.deepEqual(te.lookalikesOf("క"), []);
});

test("digits and Indian grouping", () => {
  assert.equal(te.toTeluguDigits(2026), "౨౦౨౬");
  assert.equal(te.fromTeluguDigits("౧౫౦"), "150");
  assert.equal(te.formatIndian(150000), "1,50,000");
  assert.equal(te.formatIndian(48785, { telugu: true }), "౪౮,౭౮౫");
});

test("seeded rng is reproducible", () => {
  const a = te.rng(42), b = te.rng(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.deepEqual(te.rng(7).shuffle([1, 2, 3, 4, 5]), te.rng(7).shuffle([1, 2, 3, 4, 5]));
});

test("word bank: every entry's syllables match the segmenter", () => {
  const { words } = JSON.parse(fs.readFileSync(new URL("../../lib/v1/data/words.json", import.meta.url), "utf8"));
  assert.ok(words.length >= 100);
  for (const w of words) {
    assert.equal(w.syllables.join(""), w.te, `${w.te} syllables don't join back`);
    assert.deepEqual(te.aksharalu(w.te), w.syllables, `${w.te} segmentation differs`);
  }
});
