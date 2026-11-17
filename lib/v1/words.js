// తెలుగు తునకలు · lib/v1/words.js — the shared word bank (data/words.json).
// Entry: { te, syllables[], emoji?, emojiBroken?, meaning_en?, level?, sources[] }
let cache = null;

export function loadWords() {
  cache ??= fetch(new URL("./data/words.json", import.meta.url))
    .then(r => { if (!r.ok) throw new Error(`words.json ${r.status}`); return r.json(); })
    .then(d => d.words);
  return cache;
}

/** Filter helper: wordsWhere({ minSyllables: 2, maxSyllables: 4, withEmoji: true }) */
export async function wordsWhere({ minSyllables = 1, maxSyllables = 99, withEmoji = false, withMeaning = false } = {}) {
  const all = await loadWords();
  return all.filter(w => w.syllables.length >= minSyllables && w.syllables.length <= maxSyllables
    && (!withEmoji || (w.emoji && !w.emojiBroken)) && (!withMeaning || w.meaning_en));
}
