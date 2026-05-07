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
  const { verbList } = await import('./verb_list.js');
  const testLimit = Number(process.env.TEST_LIMIT || 0);
  const sourceList = testLimit > 0 ? verbList.slice(0, testLimit) : verbList;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const results = {};
  const errors = [];
  let processed = 0;
  const total = sourceList.length * TENSES.length;

  let existing = {};
  if (fs.existsSync(JSON_PATH)) {
    existing = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  }

  for (const verb of sourceList) {
    results[verb.infinitive] = existing[verb.infinitive] || {};
    for (const tense of TENSES) {
      processed++;
      if (results[verb.infinitive][tense]) {
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
