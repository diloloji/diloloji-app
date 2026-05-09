/**
 * Alıştırma hata hafızası — localStorage.
 * Yapı: { es: { verb: { tense: { person: entry } } }, fr: { ... } }
 * Eski düz { verb: ... } kayıtları otomatik es altına taşınır.
 */

const STORAGE_KEY = 'mistake_memory';

function migrateFlatToNested(flat) {
  if (flat.es && flat.fr) return flat;
  if (flat.es || flat.fr) return flat;
  return { es: flat, fr: {} };
}

function getMemory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { es: {}, fr: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { es: {}, fr: {} };
    const nested = migrateFlatToNested(parsed);
    if (nested !== parsed) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nested));
      } catch {
        /* ignore */
      }
    }
    if (!nested.es) nested.es = {};
    if (!nested.fr) nested.fr = {};
    return nested;
  } catch {
    return { es: {}, fr: {} };
  }
}

function langBranch(lang) {
  return lang === 'fr' ? 'fr' : 'es';
}

function saveMemory(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} verb
 * @param {string} tense
 * @param {string} person
 * @param {string} wrongAnswer
 * @param {string} correctAnswer
 * @param {'es'|'fr'} [lang='es']
 */
export function recordMistake(verb, tense, person, wrongAnswer, correctAnswer, lang = 'es') {
  const memory = getMemory();
  const b = langBranch(lang);
  if (!memory[b][verb]) memory[b][verb] = {};
  if (!memory[b][verb][tense]) memory[b][verb][tense] = {};

  const existing = memory[b][verb][tense][person];
  memory[b][verb][tense][person] = {
    errorCount: existing ? existing.errorCount + 1 : 1,
    lastSeen: new Date().toISOString(),
    lastAnswer: wrongAnswer,
    correctAnswer,
    resolved: false,
  };
  saveMemory(memory);
}

/** @param {string} verb @param {string} tense @param {string} person @param {'es'|'fr'} [lang='es'] */
export function markResolved(verb, tense, person, lang = 'es') {
  const memory = getMemory();
  const b = langBranch(lang);
  if (memory[b][verb]?.[tense]?.[person]) {
    memory[b][verb][tense][person].resolved = true;
    saveMemory(memory);
  }
}

/** @param {string} verb @param {string} tense @param {string} person @param {'es'|'fr'} [lang='es'] */
export function getMistake(verb, tense, person, lang = 'es') {
  const memory = getMemory();
  const b = langBranch(lang);
  return memory[b][verb]?.[tense]?.[person] ?? null;
}

function collectBranch(branch, langCode) {
  const list = [];
  for (const verb in branch) {
    for (const tense in branch[verb]) {
      for (const person in branch[verb][tense]) {
        const entry = branch[verb][tense][person];
        list.push({ verb, tense, person, lang: langCode, ...entry });
      }
    }
  }
  return list;
}

export function getAllMistakes() {
  const memory = getMemory();
  return [...collectBranch(memory.es, 'es'), ...collectBranch(memory.fr, 'fr')].sort(
    (a, b) => b.errorCount - a.errorCount
  );
}

export function getUnresolvedMistakes() {
  return getAllMistakes().filter((e) => !e.resolved);
}

/**
 * @param {{ errorCount: number, lastSeen: string }} entry
 */
export function priorityScore(entry) {
  const daysSinceLastSeen = (Date.now() - new Date(entry.lastSeen).getTime()) / 86400000;
  const recencyScore = Math.max(0, 7 - daysSinceLastSeen);
  return entry.errorCount * 3 + recencyScore;
}

/**
 * @param {'es'|'fr'} lang
 */
export function getMistakesForReviewSorted(lang) {
  const memory = getMemory();
  const b = langBranch(lang);
  return collectBranch(memory[b], lang)
    .filter((e) => !e.resolved)
    .sort((a, b) => priorityScore(b) - priorityScore(a));
}

/**
 * Tooltip / özet istatistikleri (ham id'ler; etiketler UI katmanında)
 * @param {'es'|'fr'|'all'} scope
 */
export function getMistakeMemoryStats(scope = 'all') {
  const all =
    scope === 'es'
      ? collectBranch(getMemory().es, 'es')
      : scope === 'fr'
        ? collectBranch(getMemory().fr, 'fr')
        : getAllMistakes();
  const totalErrors = all.reduce((sum, e) => sum + e.errorCount, 0);
  const resolvedCount = all.filter((e) => e.resolved).length;

  let top = null;
  let topErr = -1;
  for (const e of all) {
    if (e.errorCount > topErr) {
      topErr = e.errorCount;
      top = e;
    }
  }

  const tenseTotals = Object.create(null);
  const personTotals = Object.create(null);
  for (const e of all) {
    tenseTotals[e.tense] = (tenseTotals[e.tense] ?? 0) + e.errorCount;
    personTotals[e.person] = (personTotals[e.person] ?? 0) + e.errorCount;
  }

  let worstTense = null;
  let worstTenseSum = -1;
  for (const t of Object.keys(tenseTotals)) {
    const s = tenseTotals[t];
    if (s > worstTenseSum) {
      worstTenseSum = s;
      worstTense = t;
    }
  }

  let worstPerson = null;
  let worstPersonSum = -1;
  for (const p of Object.keys(personTotals)) {
    const s = personTotals[p];
    if (s > worstPersonSum) {
      worstPersonSum = s;
      worstPerson = p;
    }
  }

  return {
    totalErrors,
    resolvedCount,
    unresolvedCount: all.filter((e) => !e.resolved).length,
    topMistake: top,
    worstTenseId: worstTense,
    worstPersonId: worstPerson,
  };
}
