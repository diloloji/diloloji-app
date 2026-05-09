/**
 * spanish-data.ts satırlarından FRENCH_VERBS üretir (ES→FR anlam eşlemesi + Lefff doğrulama).
 * Çıktı: src/data/french-data.ts
 *
 * Gerekli: ANTHROPIC_API_KEY veya VITE_ANTHROPIC_API_KEY (.env.local)
 * node scripts/build-french-data.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';

config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const spanishPath = join(root, 'src/data/spanish-data.ts');
const outPath = join(root, 'src/data/french-data.ts');
const mapCachePath = join(root, 'src/data/french-es-map.cache.json');

const lefff = JSON.parse(readFileSync(join(root, 'node_modules/french-verbs-lefff/dist/conjugations.json'), 'utf8'));

function parseSpanishRows(ts) {
  const rows = [];
  const re =
    /infinitive: '([^']+)', meaning_tr: '([^']+)', frequency_rank: (\d+), is_irregular: (true|false), group: '([^']+)'/g;
  let m;
  while ((m = re.exec(ts))) {
    rows.push({
      es: m[1],
      meaning_tr: m[2],
      frequency_rank: Number(m[3]),
      is_irregular: m[4] === 'true',
      group_es: m[5],
    });
  }
  return rows;
}

function normalize(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function findLefffKey(frInf) {
  const raw = frInf.trim().toLowerCase();
  if (lefff[raw]) return raw;
  const norm = normalize(raw);
  for (const k of Object.keys(lefff)) {
    if (normalize(k) === norm) return k;
  }
  return null;
}

function frenchGroupFromInfinitive(inf) {
  const x = inf.trim().toLowerCase();
  if (x.endsWith('re')) return 're';
  if (x.endsWith('ir')) return 'ir';
  if (x.endsWith('er')) return 'er';
  return 'er';
}

function parseJsonObject(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('JSON yok');
  return JSON.parse(s.slice(start, end + 1));
}

async function fetchBatch(client, rows) {
  const lines = rows.map((r) => `- ${r.es} → (TR: ${r.meaning_tr})`).join('\n');
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `Her İspanyolca mastar fiil için, verilen Türkçe anlamına en uygun Fransızca mastar fiili (infinitif) ver. Sadece standart Fransızca; reflexive fiillerde "se" ile başlayan mastar kullanma (ör. "s'appeler" yerine "appeler" tercih et — ancak anlam gerçekten dönüşlüyse "se laver" gibi yaygın mastar kabul et).

Kurallar:
- Çıktı YALNIZCA geçerli JSON: {"map":{"ispanyolca_mastar":"fransızca_mastar", ...}}
- Anahtarlar tam olarak listeki İspanyolca mastar ile aynı olmalı (aksanlı karakterler korunur).
- Değerler Lefff sözlüğünde bulunan yaygın Fransızca fiiller olmalı.

Liste:
${lines}`,
      },
    ],
  });
  const text = msg?.content?.[0]?.text;
  const parsed = parseJsonObject(text);
  const map = parsed?.map;
  if (!map || typeof map !== 'object') throw new Error('map yok');
  return map;
}

async function main() {
  const key = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY yok');

  const ts = readFileSync(spanishPath, 'utf8');
  const rows = parseSpanishRows(ts);
  if (rows.length !== 1000) throw new Error(`Beklenen 1000 satır, bulunan: ${rows.length}`);

  /** @type {Record<string, string>} */
  let merged = {};
  if (existsSync(mapCachePath)) {
    try {
      merged = JSON.parse(readFileSync(mapCachePath, 'utf8'));
    } catch {
      merged = {};
    }
  }

  const client = new Anthropic({ apiKey: key });
  const batchSize = 35;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const need = batch.filter((r) => !merged[r.es]);
    if (need.length === 0) continue;
    console.log(`Batch ${i / batchSize + 1}: ${need.length} fiil API…`);
    const part = await fetchBatch(client, need);
    for (const [es, fr] of Object.entries(part)) {
      if (typeof fr === 'string' && fr.trim()) merged[es] = fr.trim();
    }
    writeFileSync(mapCachePath, JSON.stringify(merged, null, 0), 'utf8');
  }

  const missingEs = rows.filter((r) => !merged[r.es]);
  if (missingEs.length) throw new Error(`Eşleşmeyen İspanyolca fiiller: ${missingEs.map((x) => x.es).join(', ')}`);

  const linesOut = [];
  const bad = [];
  for (const r of rows) {
    const frRaw = merged[r.es];
    const keyOk = findLefffKey(frRaw);
    if (!keyOk) {
      bad.push({ es: r.es, fr: frRaw });
      continue;
    }
    const group = frenchGroupFromInfinitive(keyOk);
    linesOut.push(
      `  { infinitive: '${keyOk.replace(/'/g, "\\'")}', meaning_tr: '${r.meaning_tr.replace(/'/g, "\\'")}', frequency_rank: ${r.frequency_rank}, is_irregular: ${r.is_irregular}, group: '${group}' },`
    );
  }

  if (bad.length) {
    console.error('Lefff bulunamayan:', bad.slice(0, 20));
    throw new Error(`${bad.length} Fransızca fiil Lefff'te yok`);
  }

  const header = `export const FRENCH_VERBS: {
  infinitive: string;
  meaning_tr: string;
  frequency_rank: number;
  is_irregular: boolean;
  group: 'er' | 'ir' | 're';
}[] = [
`;
  const footer = `];
`;
  writeFileSync(outPath, header + linesOut.join('\n') + '\n' + footer, 'utf8');
  console.log('Yazıldı:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
