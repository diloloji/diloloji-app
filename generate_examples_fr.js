import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const TENSES = [
  'Présent',
  'Passé Composé',
  'Imparfait',
  'Futur Simple',
  'Conditionnel',
  'Subjonctif Présent',
];

const JSON_PATH = './example_sentences_fr.json';
const ERRORS_PATH = './errors_fr.json';
const JS_MODULE_PATH = './src/data/example_sentences_fr.js';
const FRENCH_DATA_PATH = './src/data/french-data.ts';
const ESTIMATED_COST_PER_CALL_USD = 0.0004;

function ensureAnthropicKey() {
  if (process.env.ANTHROPIC_API_KEY) return;
  if (process.env.VITE_ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
    return;
  }
  if (!fs.existsSync('./.env.local')) return;
  const raw = fs.readFileSync('./.env.local', 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
  if (!process.env.ANTHROPIC_API_KEY && process.env.VITE_ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
  }
}

function parseJsonObject(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('JSON parse hatası');
  }
  return JSON.parse(s.slice(start, end + 1));
}

function loadFrenchVerbListFromDataTs() {
  if (!fs.existsSync(FRENCH_DATA_PATH)) return [];
  const source = fs.readFileSync(FRENCH_DATA_PATH, 'utf8');
  const out = [];
  const re = /\{\s*infinitive:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push({ infinitive: m[1] });
  }
  return out;
}

function isMissingExample(value) {
  return value == null;
}

async function generateExample(client, verb, tense) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `"${verb}" fiilini "${tense}" zamanında kullanan doğal bir Fransızca cümle yaz.
Kurallar:
- Cümle günlük hayattan, doğal olsun
- Çok kısa (max 10 kelime) veya çok uzun (max 15 kelime) olmasın
- Sadece JSON döndür, başka hiçbir şey yazma:
{"fr":"Fransızca cümle","tr":"Türkçe çevirisi","person":"kullanılan kişi (je/tu/il vb)"}`,
      },
    ],
  });
  const text = response?.content?.[0]?.text;
  const parsed = parseJsonObject(text);
  return {
    fr: String(parsed?.fr ?? '').trim(),
    tr: String(parsed?.tr ?? '').trim(),
    person: String(parsed?.person ?? '').trim(),
  };
}

async function main() {
  ensureAnthropicKey();
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY bulunamadı (.env.local veya env)');
  }
  const testLimit = Number(process.env.TEST_LIMIT || 0);
  const allFrenchVerbs = loadFrenchVerbListFromDataTs();
  const sourceList = testLimit > 0 ? allFrenchVerbs.slice(0, testLimit) : allFrenchVerbs;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const results = {};
  const errors = [];
  let processed = 0;

  let existing = {};
  if (fs.existsSync(JSON_PATH)) {
    existing = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  }

  Object.assign(results, existing);

  let completedVerbCount = 0;
  const verbsToProcess = [];
  let estimatedApiCallCount = 0;
  for (const verb of sourceList) {
    const current = existing[verb.infinitive] || {};
    const missingTenseCount = TENSES.reduce(
      (acc, tense) => (isMissingExample(current[tense]) ? acc + 1 : acc),
      0
    );
    if (missingTenseCount === 0) {
      completedVerbCount += 1;
      continue;
    }
    verbsToProcess.push({ verb, missingTenseCount });
    estimatedApiCallCount += missingTenseCount;
  }

  console.log(
    `Fiiller: ${sourceList.length} | Tamamlanan: ${completedVerbCount} | İşlenecek: ${verbsToProcess.length} | Tahmini API çağrısı: ${estimatedApiCallCount} (~$${(estimatedApiCallCount * ESTIMATED_COST_PER_CALL_USD).toFixed(2)})`
  );

  for (const { verb } of verbsToProcess) {
    const inf = verb.infinitive;
    if (!results[inf]) results[inf] = {};
    for (const tense of TENSES) {
      if (!isMissingExample(results[inf][tense])) continue;
      try {
        const ex = await generateExample(client, inf, tense);
        if (!ex.fr || !ex.tr) throw new Error('Boş alan');
        results[inf][tense] = ex;
        processed += 1;
        fs.writeFileSync(JSON_PATH, JSON.stringify(results, null, 2), 'utf8');
        console.log(`OK ${processed}: ${inf} · ${tense}`);
      } catch (e) {
        errors.push({ verb: inf, tense, error: String(e?.message || e) });
        fs.writeFileSync(ERRORS_PATH, JSON.stringify(errors, null, 2), 'utf8');
        console.error(`Hata: ${inf} ${tense}`, e);
      }
    }
  }

  const banner = `/**\n * Otomatik üretildi — generate_examples_fr.js\n * Kaynak: ${JSON_PATH}\n */\nexport const exampleSentencesFr = `;
  fs.writeFileSync(JS_MODULE_PATH, `${banner}${JSON.stringify(results, null, 2)};\n`, 'utf8');
  console.log('Modül yazıldı:', JS_MODULE_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
