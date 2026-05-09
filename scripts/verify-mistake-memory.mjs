/**
 * mistake_memory.js birim doğrulaması (Node, sahte localStorage).
 * Çalıştır: node scripts/verify-mistake-memory.mjs
 */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const store = new Map();

globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    store.set(k, String(v));
  },
  removeItem: (k) => {
    store.delete(k);
  },
};

const modPath = join(__dirname, '../src/lib/mistake_memory.js');
const {
  recordMistake,
  markResolved,
  getMistake,
  getAllMistakes,
  getUnresolvedMistakes,
  priorityScore,
  getMistakesForReviewSorted,
  getMistakeMemoryStats,
} = await import(pathToFileURL(modPath).href);

store.clear();
recordMistake('ser', 'imperfecto', 'nosotros', 'eramos', 'éramos');
let m = getMistake('ser', 'imperfecto', 'nosotros');
assert.equal(m.errorCount, 1);
assert.equal(m.resolved, false);
assert.equal(m.correctAnswer, 'éramos');

recordMistake('ser', 'imperfecto', 'nosotros', 'eramos', 'éramos');
m = getMistake('ser', 'imperfecto', 'nosotros');
assert.equal(m.errorCount, 2);

markResolved('ser', 'imperfecto', 'nosotros');
m = getMistake('ser', 'imperfecto', 'nosotros');
assert.equal(m.resolved, true);

recordMistake('ir', 'presente', 'yo', 'voy', 'va'); // yanlış örnek — test için
const all = getAllMistakes();
assert.ok(all.length >= 2);
assert.ok(all[0].errorCount >= all[all.length - 1].errorCount);

store.clear();
recordMistake('a', 't1', 'yo', 'x', 'y');
recordMistake('b', 't1', 'yo', 'x', 'y');
recordMistake('b', 't1', 'yo', 'x', 'y');
const unresolved = getUnresolvedMistakes();
assert.ok(unresolved.every((e) => !e.resolved));

const pLow = priorityScore({ errorCount: 1, lastSeen: new Date(Date.now() - 10 * 86400000).toISOString() });
const pHigh = priorityScore({ errorCount: 1, lastSeen: new Date().toISOString() });
assert.ok(pHigh > pLow);
const pMany = priorityScore({ errorCount: 5, lastSeen: new Date(Date.now() - 10 * 86400000).toISOString() });
assert.ok(pMany > pHigh);

store.clear();
recordMistake('ser', 'imperfecto', 'nosotros', 'a', 'b');
recordMistake('estar', 'presente', 'ellos', 'c', 'd');
const stats = getMistakeMemoryStats();
assert.equal(stats.totalErrors, 2);
assert.equal(stats.resolvedCount, 0);

markResolved('ser', 'imperfecto', 'nosotros');
const stats2 = getMistakeMemoryStats();
assert.equal(stats2.resolvedCount, 1);

store.clear();
recordMistake('x', 't', 'yo', 'a', 'b');
const q = getMistakesForReviewSorted();
assert.equal(q.length, 1);
assert.equal(q[0].verb, 'x');

console.log('mistake_memory.js doğrulaması tamam.');
