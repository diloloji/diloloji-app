/**
 * İspanyolca düzensiz fiil çekimlerini Anthropic ile doğrular.
 * Veri: spanish-verbs + spanish_conjugation_overrides.json (uygulamayla aynı mantık).
 *
 * TEST_LIMIT=5 node audit_verbs.js
 * node audit_verbs.js
 *
 * Gerekli: ANTHROPIC_API_KEY
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getConjugation } from 'spanish-verbs';
import { verbList } from './verb_list.js';
import { applySpanishConjugationOverrides } from './spanish_overrides_resolve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OVERRIDES_PATH = join(__dirname, 'src/data/spanish_conjugation_overrides.json');
const RESULTS_PATH = join(__dirname, 'audit_results.json');
const ERRORS_PATH = join(__dirname, 'audit_errors.json');
const REPORT_PATH = join(__dirname, 'audit_report.txt');

const client = new Anthropic();

const TENSES = [
  'Presente',
  'Pretérito Indefinido',
  'Pretérito Imperfecto',
  'Pretérito Perfecto',
  'Futuro Simple',
  'Condicional',
  'Subjuntivo Presente',
];

/** Uygulama tense id ↔ kütüphane */
const TENSE_LABEL_TO_ID = {
  Presente: 'presente',
  'Pretérito Indefinido': 'preterito',
  'Pretérito Imperfecto': 'imperfecto',
  'Pretérito Perfecto': 'preterito-perfecto',
  'Futuro Simple': 'futuro',
  Condicional: 'condicional',
  'Subjuntivo Presente': 'subjuntivo-presente',
};

const TENSE_TO_LIB = {
  presente: 'INDICATIVE_PRESENT',
  imperfecto: 'INDICATIVE_IMPERFECT',
  preterito: 'INDICATIVE_PRETERITE',
  'preterito-perfecto': 'INDICATIVE_PERFECT',
  futuro: 'INDICATIVE_FUTURE',
  'subjuntivo-presente': 'SUBJUNCTIVE_PRESENT',
  condicional: 'CONDITIONAL_PRESENT',
};

const PRONOUN_IDS = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'];

let overridesCache = null;
function loadOverrides() {
  if (overridesCache !== null) return overridesCache;
  if (!existsSync(OVERRIDES_PATH)) {
    overridesCache = {};
    return overridesCache;
  }
  try {
    overridesCache = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8'));
  } catch {
    overridesCache = {};
  }
  return overridesCache;
}

function applyOverrides(infinitive, tenseId, base) {
  return applySpanishConjugationOverrides(infinitive, loadOverrides(), tenseId, base);
}

function getConjugationMapForVerb(verb, tenseLabel) {
  const tenseId = TENSE_LABEL_TO_ID[tenseLabel];
  if (!tenseId) return null;
  const libTense = TENSE_TO_LIB[tenseId];
  if (!libTense) return null;
  const base = {};
  try {
    for (let person = 0; person < 6; person++) {
      base[PRONOUN_IDS[person]] = getConjugation(verb, libTense, /** @type {0|1|2|3|4|5} */ (person));
    }
  } catch {
    return null;
  }
  return applyOverrides(verb, tenseId, base);
}

/** API / rapor için şahıs etiketleri */
function toDisplayConjugations(map) {
  return {
    yo: map.yo,
    tú: map.tu,
    'él/ella': map.el,
    nosotros: map.nosotros,
    vosotros: map.vosotros,
    'ellos/ellas': map.ellos,
  };
}

function verbHasTenseData(verb, tenseLabel) {
  return getConjugationMapForVerb(verb, tenseLabel) !== null;
}

function extractJsonFromMessage(text) {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : t;
  return JSON.parse(raw);
}

async function auditVerb(verb, tense, conjugations) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: `İspanyolca fiil doğrulama görevi. Aşağıdaki çekimleri kontrol et.

Fiil: "${verb}"
Zaman: "${tense}"
Mevcut çekimler:
${JSON.stringify(conjugations, null, 2)}

Her çekim için doğru mu yanlış mı kontrol et.
Sadece JSON döndür, başka hiçbir şey yazma:
{
  "verb": "${verb}",
  "tense": "${tense}",
  "errors": [
    {
      "person": "yo",
      "current": "mevcut değer",
      "correct": "doğru değer",
      "note": "neden yanlış, Türkçe açıkla"
    }
  ],
  "all_correct": true
}
Hata yoksa "errors": [] ve "all_correct": true döndür. person alanında tam olarak şu anahtarları kullan: yo, tú, él/ella, nosotros, vosotros, ellos/ellas.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const text = textBlock && 'text' in textBlock ? textBlock.text : '';
  return extractJsonFromMessage(text);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY tanımlı değil.');
    process.exit(1);
  }

  const irregularVerbs = verbList.filter((v) => v.irregular === true).map((v) => v.infinitive);

  let verbs = irregularVerbs.filter((v) =>
    TENSES.some((tense) => verbHasTenseData(v, tense))
  );

  const testLimitRaw = process.env.TEST_LIMIT;
  const TEST_LIMIT = testLimitRaw ? parseInt(testLimitRaw, 10) : null;
  if (TEST_LIMIT !== null && !Number.isNaN(TEST_LIMIT) && TEST_LIMIT > 0) {
    verbs = verbs.slice(0, TEST_LIMIT);
  }

  console.log(
    `Audit başlıyor: ${verbs.length} irregular fiil × ${TENSES.length} zaman = ${verbs.length * TENSES.length} istek (TEST_LIMIT=${TEST_LIMIT ?? 'yok'})`
  );

  let processed = 0;

  let existing = {};
  if (existsSync(RESULTS_PATH)) {
    try {
      existing = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));
    } catch {
      existing = {};
    }
  }

  const total = verbs.length * TENSES.length;

  for (const verb of verbs) {
    for (const tense of TENSES) {
      processed++;
      const cacheKey = `${verb}_${tense}`;

      if (existing[cacheKey]) {
        console.log(`✓ Atlandı (${processed}/${total}): ${verb} - ${tense}`);
        continue;
      }

      const rawMap = getConjugationMapForVerb(verb, tense);
      if (!rawMap) {
        console.log(`⚠ Veri yok (${processed}/${total}): ${verb} - ${tense}`);
        continue;
      }

      const conjugations = toDisplayConjugations(rawMap);

      try {
        const result = await auditVerb(verb, tense, conjugations);
        existing[cacheKey] = result;

        if (!result.all_correct && result.errors?.length) {
          console.log(`✗ HATA (${processed}/${total}): ${verb} - ${tense} → ${result.errors.length} hata`);
          result.errors.forEach((e) =>
            console.log(`   ${e.person}: "${e.current}" → "${e.correct}" (${e.note})`)
          );
        } else {
          console.log(`✓ Doğru (${processed}/${total}): ${verb} - ${tense}`);
        }
      } catch (err) {
        console.error(`✗ Hata (${processed}/${total}): ${verb} - ${tense}:`, err.message);
      }

      if (processed % 10 === 0) {
        writeFileSync(RESULTS_PATH, JSON.stringify(existing, null, 2));
      }

      await new Promise((r) => setTimeout(r, 250));
    }
  }

  writeFileSync(RESULTS_PATH, JSON.stringify(existing, null, 2));

  const allErrorBlocks = Object.values(existing).filter(
    (r) => r && r.all_correct === false && Array.isArray(r.errors) && r.errors.length > 0
  );
  writeFileSync(ERRORS_PATH, JSON.stringify(allErrorBlocks, null, 2));

  const report = allErrorBlocks
    .map(
      (e) =>
        `${e.verb} · ${e.tense}:\n` +
        e.errors.map((err) => `  ${err.person}: "${err.current}" → "${err.correct}" — ${err.note}`).join('\n')
    )
    .join('\n\n');

  writeFileSync(REPORT_PATH, report);

  const totalErrCount = allErrorBlocks.reduce((sum, e) => sum + (e.errors?.length ?? 0), 0);

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Audit tamamlandı`);
  console.log(`İşlenen adım: ${processed} / ${total}`);
  console.log(`Hatalı kombinasyon: ${allErrorBlocks.length}`);
  console.log(`Toplam hata satırı: ${totalErrCount}`);
  console.log(`\nRapor: ${REPORT_PATH}`);
  console.log(`Detay: ${ERRORS_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
