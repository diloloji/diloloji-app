import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const TENSES = [
  'Presente',
  'Pretérito Indefinido',
  'Pretérito Imperfecto',
  'Pretérito Perfecto',
  'Futuro Simple',
  'Condicional',
  'Subjuntivo Presente',
];

const JSON_PATH = './example_sentences.json';
const ERRORS_PATH = './errors.json';
const JS_MODULE_PATH = './src/data/example_sentences.js';
const SPANISH_DATA_PATH = './src/data/spanish-data.ts';
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

function loadSpanishVerbListFromDataTs() {
  if (!fs.existsSync(SPANISH_DATA_PATH)) return [];
  const source = fs.readFileSync(SPANISH_DATA_PATH, 'utf8');
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
    messages: [{
      role: 'user',
      content: `"${verb}" fiilini "${tense}" zamanında kullanan doğal bir İspanyolca cümle yaz.
Kurallar:
- Cümle günlük hayattan, doğal olsun
- Çok kısa (max 10 kelime) veya çok uzun (max 15 kelime) olmasın
- Sadece JSON döndür, başka hiçbir şey yazma:
{"es":"İspanyolca cümle","tr":"Türkçe çevirisi","person":"kullanılan kişi (yo/tú/él vb)"}`,
    }],
  });
  const text = response?.content?.[0]?.text;
  const parsed = parseJsonObject(text);
  return {
    es: String(parsed?.es ?? '').trim(),
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
  const allSpanishVerbs = loadSpanishVerbListFromDataTs();
  const sourceList = testLimit > 0 ? allSpanishVerbs.slice(0, testLimit) : allSpanishVerbs;
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
      completedVerbCount++;
      continue;
    }
    verbsToProcess.push(verb);
    estimatedApiCallCount += missingTenseCount;
  }
  const total = verbsToProcess.length * TENSES.length;
  const estimatedCost = estimatedApiCallCount * ESTIMATED_COST_PER_CALL_USD;
  console.log(`Toplam fiil sayısı: ${sourceList.length}`);
  console.log(`Zaten tamamlanmış fiil sayısı: ${completedVerbCount}`);
  console.log(`İşlenecek fiil sayısı: ${verbsToProcess.length}`);
  console.log(`Tahmini maliyet: $${estimatedCost.toFixed(4)}`);

  for (const verb of verbsToProcess) {
    results[verb.infinitive] = existing[verb.infinitive] || {};
    for (const tense of TENSES) {
      processed++;
      if (!isMissingExample(results[verb.infinitive][tense])) {
        console.log(`✓ Atlandı (${processed}/${total}): ${verb.infinitive} - ${tense}`);
        continue;
      }
      try {
        const example = await generateExample(client, verb.infinitive, tense);
        results[verb.infinitive][tense] = example;
        console.log(`✓ (${processed}/${total}): ${verb.infinitive} - ${tense}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`✗ Hata (${processed}/${total}): ${verb.infinitive} - ${tense}: ${message}`);
        errors.push({ verb: verb.infinitive, tense, message });
        results[verb.infinitive][tense] = null;
      }

      if (processed % 10 === 0) {
        fs.writeFileSync(JSON_PATH, JSON.stringify(results, null, 2));
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(results, null, 2));
  fs.writeFileSync(
    JS_MODULE_PATH,
    `export const exampleSentences = ${JSON.stringify(results, null, 2)};\n`
  );

  if (errors.length > 0) {
    fs.writeFileSync(ERRORS_PATH, JSON.stringify(errors, null, 2));
    console.log(`\n⚠️ ${errors.length} hata oluştu, errors.json dosyasına kaydedildi.`);
  }

  console.log(`\n✅ Tamamlandı! ${processed} kombinasyon işlendi.`);
}

main().catch((err) => {
  console.error('Script hatası:', err instanceof Error ? err.message : err);
  process.exit(1);
});
