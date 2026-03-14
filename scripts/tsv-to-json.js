/**
 * Tatoeba TSV → JSON (fr-tr, es-tr).
 * Usage: node scripts/tsv-to-json.js
 * Reads from Downloads, writes to public/data/
 */

const fs = require('fs');
const path = require('path');

const DOWNLOADS = path.join(process.env.HOME || '', 'Downloads');
const OUT_DIR = path.join(__dirname, '..', 'public', 'data');

const FR_TR_TSV = path.join(DOWNLOADS, 'Sentence pairs in French-Turkish - 2026-03-14.tsv');
const ES_TR_TSV = path.join(DOWNLOADS, 'Sentence pairs in Spanish-Turkish - 2026-03-14.tsv');

function parseTsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length >= 4) {
      out.push({ original: cols[1].trim(), translated: cols[3].trim() });
    }
  }
  return out;
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

if (fs.existsSync(FR_TR_TSV)) {
  const frTr = parseTsv(FR_TR_TSV);
  fs.writeFileSync(path.join(OUT_DIR, 'fr-tr.json'), JSON.stringify(frTr), 'utf8');
  console.log('Wrote public/data/fr-tr.json:', frTr.length, 'pairs');
} else {
  console.warn('Not found:', FR_TR_TSV);
}

if (fs.existsSync(ES_TR_TSV)) {
  const esTr = parseTsv(ES_TR_TSV);
  fs.writeFileSync(path.join(OUT_DIR, 'es-tr.json'), JSON.stringify(esTr), 'utf8');
  console.log('Wrote public/data/es-tr.json:', esTr.length, 'pairs');
} else {
  console.warn('Not found:', ES_TR_TSV);
}
