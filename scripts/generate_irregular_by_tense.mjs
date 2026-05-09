/**
 * İspanyolca: her fiil × zaman için spanish-verbs çekimi ile
 * aynı grup (-ar/-er/-ir) düzenli paradigmasından türetilen beklenen çekimi karşılaştırır.
 * overrides (spanish_conjugation_overrides.json) uygulanmış gerçek çekimle eşleşir.
 *
 * Çıktı: src/data/irregular_by_tense.json
 * Çalıştır: node scripts/generate_irregular_by_tense.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { applySpanishConjugationOverrides } from '../spanish_overrides_resolve.mjs';

const require = createRequire(import.meta.url);
const { getConjugation } = require('spanish-verbs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const TENSE_TO_LIB = {
  presente: 'INDICATIVE_PRESENT',
  imperfecto: 'INDICATIVE_IMPERFECT',
  preterito: 'INDICATIVE_PRETERITE',
  'preterito-perfecto': 'INDICATIVE_PERFECT',
  pluscuamperfecto: 'INDICATIVE_PLUPERFECT',
  futuro: 'INDICATIVE_FUTURE',
  'futuro-compuesto': 'INDICATIVE_FUTURE_PERFECT',
  'subjuntivo-presente': 'SUBJUNCTIVE_PRESENT',
  condicional: 'CONDITIONAL_PRESENT',
};

const TENSE_IDS = Object.keys(TENSE_TO_LIB);

const PRONOUN_IDS = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'];

const COMPOUND_LIB_TENSES = new Set([
  'INDICATIVE_PERFECT',
  'INDICATIVE_PLUPERFECT',
  'INDICATIVE_FUTURE_PERFECT',
]);

const conjugationOverrides = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/spanish_conjugation_overrides.json'), 'utf8')
);

function loadSpanishInfinitives() {
  const raw = fs.readFileSync(path.join(root, 'src/data/spanish-data.ts'), 'utf8');
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
  if (v.endsWith('ar')) return 'ar';
  if (v.endsWith('er')) return 'er';
  if (v.endsWith('ir')) return 'ir';
  return null;
}

function modelVerbForGroup(g) {
  if (g === 'ar') return 'hablar';
  if (g === 'er') return 'comer';
  return 'vivir';
}

function applyOverrides(infinitive, tenseId, base) {
  return applySpanishConjugationOverrides(infinitive, conjugationOverrides, tenseId, base);
}

function getActualMap(infinitive, tenseId) {
  const libTense = TENSE_TO_LIB[tenseId];
  const base = {};
  for (let person = 0; person < 6; person++) {
    base[PRONOUN_IDS[person]] = getConjugation(infinitive, libTense, person);
  }
  return applyOverrides(infinitive, tenseId, base);
}

function getExpectedForm(infinitive, libTense, person) {
  const inf = infinitive.trim().toLowerCase();
  const group = verbGroup(inf);
  if (!group) {
    return getConjugation(infinitive, libTense, person);
  }

  const modelVerb = modelVerbForGroup(group);
  const modelStem = modelVerb.slice(0, -2);
  const stem = inf.slice(0, -2);
  const modelForm = getConjugation(modelVerb, libTense, person);

  if (COMPOUND_LIB_TENSES.has(libTense)) {
    const parts = modelForm.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return modelForm;
    const [aux, modelPart] = parts;
    if (!modelPart.startsWith(modelStem)) return modelForm;
    const partSuffix = modelPart.slice(modelStem.length);
    return `${aux} ${stem}${partSuffix}`;
  }

  if (libTense === 'INDICATIVE_FUTURE' || libTense === 'CONDITIONAL_PRESENT') {
    if (modelForm.startsWith(modelVerb)) {
      const suffix = modelForm.slice(modelVerb.length);
      return inf + suffix;
    }
    return modelForm;
  }

  if (!modelForm.startsWith(modelStem)) {
    return modelForm;
  }
  const suffix = modelForm.slice(modelStem.length);
  return stem + suffix;
}

function getExpectedMap(infinitive, tenseId) {
  const libTense = TENSE_TO_LIB[tenseId];
  const map = {};
  for (let person = 0; person < 6; person++) {
    map[PRONOUN_IDS[person]] = getExpectedForm(infinitive, libTense, person);
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

  for (const pid of PRONOUN_IDS) {
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
  const verbs = loadSpanishInfinitives().sort((a, b) => a.localeCompare(b, 'es'));
  /** @type {Record<string, Record<string, boolean>>} */
  const out = {};

  for (const verb of verbs) {
    out[verb] = {};
    for (const tenseId of TENSE_IDS) {
      out[verb][tenseId] = isIrregularForTense(verb, tenseId);
    }
  }

  const dest = path.join(root, 'src/data/irregular_by_tense.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log('Wrote', dest, 'verbs:', verbs.length);

  const sample = ['ser', 'ir', 'hacer', 'hablar', 'comer', 'llegar'];
  for (const v of sample) {
    if (!out[v]) continue;
    console.log(
      v,
      Object.fromEntries(
        ['presente', 'preterito', 'futuro', 'imperfecto'].map((t) => [t, out[v][t]])
      )
    );
  }
}

main();
