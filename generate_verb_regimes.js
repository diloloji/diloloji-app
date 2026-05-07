import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-1-20250805';
const PROMPT_PATH = './verb_regimes_prompt.txt';
const OUTPUT_PATH = './src/data/verb_regimes.js';

function ensureKey() {
  if (process.env.ANTHROPIC_API_KEY) return;
  if (process.env.VITE_ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
    return;
  }
  if (!fs.existsSync('./.env.local')) return;
  const raw = fs.readFileSync('./.env.local', 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
  if (!process.env.ANTHROPIC_API_KEY && process.env.VITE_ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
  }
}

function parseJsonObject(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0 || b <= a) throw new Error('JSON bulunamadı');
  return JSON.parse(s.slice(a, b + 1));
}

async function main() {
  ensureKey();
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY eksik');
  if (!fs.existsSync(PROMPT_PATH)) throw new Error(`${PROMPT_PATH} bulunamadı`);

  const prompt = fs.readFileSync(PROMPT_PATH, 'utf8').trim();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = res?.content?.[0]?.text;
  const obj = parseJsonObject(text);
  fs.writeFileSync(
    OUTPUT_PATH,
    `export const verbRegimes = ${JSON.stringify(obj, null, 2)};\n`
  );
  console.log(`✅ Yazıldı: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exit(1);
});
