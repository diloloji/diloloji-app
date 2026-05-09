/**
 * İspanyolca alıştırma hata hafızası — saf JS, localStorage.
 * Anahtar: mistake_memory
 */

const STORAGE_KEY = 'mistake_memory';

function getMemory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveMemory(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @param {string} verb
 * @param {string} tense
 * @param {string} person
 * @param {string} wrongAnswer
 * @param {string} correctAnswer
 */
export function recordMistake(verb, tense, person, wrongAnswer, correctAnswer) {
  const memory = getMemory();
  if (!memory[verb]) memory[verb] = {};
  if (!memory[verb][tense]) memory[verb][tense] = {};

  const existing = memory[verb][tense][person];
  memory[verb][tense][person] = {
    errorCount: existing ? existing.errorCount + 1 : 1,
    lastSeen: new Date().toISOString(),
    lastAnswer: wrongAnswer,
    correctAnswer,
    resolved: false,
  };
  saveMemory(memory);
}

/** @param {string} verb @param {string} tense @param {string} person */
export function markResolved(verb, tense, person) {
  const memory = getMemory();
  if (memory[verb]?.[tense]?.[person]) {
    memory[verb][tense][person].resolved = true;
    saveMemory(memory);
  }
}

/** @param {string} verb @param {string} tense @param {string} person */
export function getMistake(verb, tense, person) {
  const memory = getMemory();
  return memory[verb]?.[tense]?.[person] ?? null;
}

export function getAllMistakes() {
  const memory = getMemory();
  const list = [];
  for (const verb in memory) {
    for (const tense in memory[verb]) {
      for (const person in memory[verb][tense]) {
        const entry = memory[verb][tense][person];
        list.push({ verb, tense, person, ...entry });
      }
    }
  }
  return list.sort((a, b) => b.errorCount - a.errorCount);
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

/** Çözülmemiş kayıtlar, tekrar seansı sırası (öncelik yüksek → düşük) */
export function getMistakesForReviewSorted() {
  return getUnresolvedMistakes().sort((a, b) => priorityScore(b) - priorityScore(a));
}

/**
 * Tooltip / özet istatistikleri (ham id'ler; etiketler UI katmanında)
 */
export function getMistakeMemoryStats() {
  const all = getAllMistakes();
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
