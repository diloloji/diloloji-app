/**
 * spanish-data.ts satırlarından fiil listesi (audit scriptleri için).
 * ESM — proje kökünden import edilir.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = dirname(fileURLToPath(import.meta.url));
const tsPath = join(root, 'src/data/spanish-data.ts');
const ts = readFileSync(tsPath, 'utf8');

/** @type {{ infinitive: string; irregular: boolean }[]} */
export const verbList = [];

for (const line of ts.split('\n')) {
  const inf = line.match(/infinitive:\s*'([^']+)'/);
  const irr = line.match(/is_irregular:\s*(true|false)/);
  if (inf && irr) {
    verbList.push({ infinitive: inf[1], irregular: irr[1] === 'true' });
  }
}
