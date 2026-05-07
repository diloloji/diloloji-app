import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-1-20250805';
const PROMPT_PATH = './collocations_prompt.txt';
const OUTPUT_PATH = './src/data/collocations.js';

function ensureKey() {
  if (process.env.ANTHROPIC_API_KEY) return;
  if (process.env.VITE_ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
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
  const prompt = fs.readFileSync(PROMPT_PATH, 'utf8').trim();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = res?.content?.[0]?.text;
  const obj = parseJsonObject(text);
  fs.writeFileSync(OUTPUT_PATH, `export const collocations = ${JSON.stringify(obj, null, 2)};\n`);
  console.log(`✅ Yazıldı: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exit(1);
});
