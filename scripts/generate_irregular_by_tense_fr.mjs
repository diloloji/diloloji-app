/**
 * Fransızca: Lefff çekimi ile aynı gruptaki düzenli paradigma (parler / finir / vendre) karşılaştırması.
 * Çıktı: src/data/irregular_by_tense_fr.json
 *
 * node scripts/generate_irregular_by_tense_fr.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getConjugation, isComposedTense } = require('french-verbs');
const lefff = require('french-verbs-lefff/dist/conjugations.json');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const TENSE_TO_LIB = {
  present: 'PRESENT',
  imparfait: 'IMPARFAIT',
  'passe-simple': 'PASSE_SIMPLE',
  'passe-compose': 'PASSE_COMPOSE',
  'futur-simple': 'FUTUR',
  'subjonctif-present': 'SUBJONCTIF_PRESENT',
};

const TENSE_IDS = Object.keys(TENSE_TO_LIB);
const PRONOUN_INDEX = [0, 1, 2, 3, 4, 5];

const COMPOUND_LIB_TENSES = new Set(['PASSE_COMPOSE']);

function loadFrenchInfinitives() {
  const raw = fs.readFileSync(path.join(root, 'src/data/french-data.ts'), 'utf8');
  const out = [];
  const re = /infinitive:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(raw))) out.push(m[1]);
  return [...new Set(out)];
}

function normalizeCompare(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function verbGroup(inf) {
  const v = inf.trim().toLowerCase();
  if (v.endsWith('re')) return 're';
  if (v.endsWith('ir')) return 'ir';
  if (v.endsWith('er')) return 'er';
  return null;
}

function modelVerbForGroup(g) {
  if (g === 'er') return 'parler';
  if (g === 'ir') return 'finir';
  return 'vendre';
}

function rawConjugation(infinitive, libTense, person) {
  const composed = isComposedTense(libTense)
    ? { agreeGender: 'M', agreeNumber: 'S' }
    : {};
  return getConjugation(lefff, infinitive, libTense, person, composed, false, undefined, undefined, 'Act');
}

function getActualMap(infinitive, tenseId) {
  const libTense = TENSE_TO_LIB[tenseId];
  const map = {};
  for (const person of PRONOUN_INDEX) {
    try {
      map[person] = rawConjugation(infinitive, libTense, person);
    } catch {
      map[person] = undefined;
    }
  }
  return map;
}

function getExpectedForm(infinitive, libTense, person) {
  const inf = infinitive.trim().toLowerCase();
  const group = verbGroup(inf);
  if (!group) {
    try {
      return rawConjugation(infinitive, libTense, person);
    } catch {
      return undefined;
    }
  }

  const modelVerb = modelVerbForGroup(group);
  const modelStem = modelVerb.slice(0, -2);
  const stem = inf.slice(0, -2);
  let modelForm;
  try {
    modelForm = rawConjugation(modelVerb, libTense, person);
  } catch {
    return undefined;
  }
  if (modelForm === undefined) return undefined;

  if (COMPOUND_LIB_TENSES.has(libTense)) {
    const parts = String(modelForm).split(/\s+/).filter(Boolean);
    if (parts.length < 2) return modelForm;
    const [aux, modelPart] = parts;
    if (!modelPart.startsWith(modelStem)) return rawConjugation(infinitive, libTense, person);
    const partSuffix = modelPart.slice(modelStem.length);
    try {
      return `${aux} ${stem}${partSuffix}`;
    } catch {
      return modelForm;
    }
  }

  if (libTense === 'FUTUR' || libTense === 'CONDITIONAL_PRESENT') {
    if (String(modelForm).startsWith(modelVerb)) {
      const suffix = String(modelForm).slice(modelVerb.length);
      return inf + suffix;
    }
    return modelForm;
  }

  if (!String(modelForm).startsWith(modelStem)) {
    return modelForm;
  }
  const suffix = String(modelForm).slice(modelStem.length);
  return stem + suffix;
}

function getExpectedMap(infinitive, tenseId) {
  const libTense = TENSE_TO_LIB[tenseId];
  const map = {};
  for (const person of PRONOUN_INDEX) {
    map[person] = getExpectedForm(infinitive, libTense, person);
  }
  return map;
}

function isIrregularForTense(infinitive, tenseId) {
  let actual;
  let expected;
  try {
    actual = getActualMap(infinitive, tenseId);
    expected = getExpectedMap(infinitive, tenseId);
  } catch {
    return false;
  }

  for (const pid of PRONOUN_INDEX) {
    const a = actual[pid];
    const e = expected[pid];
    if (a === undefined || e === undefined) continue;
    if (normalizeCompare(a) !== normalizeCompare(e)) {
      return true;
    }
  }
  return false;
}

function main() {
  const verbs = loadFrenchInfinitives().sort((a, b) => a.localeCompare(b, 'fr'));
  /** @type {Record<string, Record<string, boolean>>} */
  const out = {};

  for (const verb of verbs) {
    out[verb] = {};
    for (const tenseId of TENSE_IDS) {
      out[verb][tenseId] = isIrregularForTense(verb, tenseId);
    }
  }

  const dest = path.join(root, 'src/data/irregular_by_tense_fr.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log('Wrote', dest, 'verbs:', verbs.length);
}

main();
