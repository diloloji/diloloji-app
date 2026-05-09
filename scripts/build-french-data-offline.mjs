/**
 * french-data.ts üretir: önce override + sezgisel Lefff; olmazsa MyMemory (es|fr) + Lefff doğrulama.
 * Önbellek: src/data/french-mm-cache.json (tekrar çalıştırmada API az kullanılır)
 *
 * node scripts/build-french-data-offline.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const spanishPath = join(root, 'src/data/spanish-data.ts');
const outPath = join(root, 'src/data/french-data.ts');
const cachePath = join(root, 'src/data/french-mm-cache.json');
const lefff = JSON.parse(readFileSync(join(root, 'node_modules/french-verbs-lefff/dist/conjugations.json'), 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function decodeEntities(str) {
  return String(str || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** MyMemory çıktısından olası mastar parçala */
function mtToFrenchTokens(raw) {
  const s = decodeEntities(raw)
    .replace(/\r/g, '\n')
    .split(/\n/)[0]
    .trim();
  const cleaned = s.replace(/^[\s\-–—:]+/, '').replace(/[.:;!?]+$/, '');
  const parts = cleaned.split(/[\s,/;(]+/).map((p) => p.trim()).filter(Boolean);
  return parts;
}

const OVERRIDES = {
  ser: 'être',
  estar: 'être',
  tener: 'avoir',
  hacer: 'faire',
  ir: 'aller',
  decir: 'dire',
  poder: 'pouvoir',
  ver: 'voir',
  querer: 'vouloir',
  venir: 'venir',
  saber: 'savoir',
  dar: 'donner',
  caber: 'tenir',
  traer: 'apporter',
  caer: 'tomber',
  oír: 'entendre',
  oir: 'entendre',
  jugar: 'jouer',
  empezar: 'commencer',
  volver: 'revenir',
  pedir: 'demander',
  medir: 'mesurer',
  servir: 'servir',
  sentir: 'sentir',
  dormir: 'dormir',
  morir: 'mourir',
  seguir: 'suivre',
  conseguir: 'obtenir',
  repetir: 'répéter',
  vestir: 'habiller',
  elegir: 'élire',
  freír: 'frire',
  reír: 'rire',
  sonreír: 'sourire',
  prohibir: 'interdire',
  bendecir: 'bénir',
  maldecir: 'maudire',
  predecir: 'prédire',
  desdecir: 'démentir',
  escribir: 'écrire',
  vivir: 'vivre',
  subir: 'monter',
  recibir: 'recevoir',
  concebir: 'concevoir',
  percibir: 'percevoir',
  lucir: 'luire',
  conducir: 'conduire',
  traducir: 'traduire',
  producir: 'produire',
  reducir: 'réduire',
  introducir: 'introduire',
  seducir: 'séduire',
  abrir: 'ouvrir',
  cubrir: 'couvrir',
  descubrir: 'découvrir',
  ofrecer: 'offrir',
  padecer: 'souffrir',
  agradecer: 'remercier',
  aparecer: 'apparaître',
  desaparecer: 'disparaître',
  parecer: 'sembler',
  nacer: 'naître',
  conocer: 'connaître',
  reconocer: 'reconnaître',
  crecer: 'croître',
  ejercer: 'exercer',
  vencer: 'vaincre',
  cocer: 'cuire',
  escoger: 'choisir',
  coger: 'prendre',
  proteger: 'protéger',
  recoger: 'ramasser',
  fingir: 'feindre',
  dirigir: 'diriger',
  exigir: 'exiger',
  surgir: 'surgir',
  emerger: 'émerger',
  sumergir: 'submerger',
  converger: 'converger',
  diverger: 'diverger',
  regir: 'régir',
  rendir: 'rendre',
  teñir: 'teindre',
  ceñir: 'ceindre',
  gemir: 'gémir',
  impedir: 'empêcher',
  despedir: 'congédier',
  competir: 'rivaliser',
  salir: 'sortir',
  poner: 'mettre',
  mantener: 'maintenir',
  sostener: 'soutenir',
  obtener: 'obtenir',
  retener: 'retenir',
  detener: 'détenir',
  convenir: 'convenir',
  intervenir: 'intervenir',
  prevenir: 'prévenir',
  subvenir: 'subvenir',
  satisfacer: 'satisfaire',
  deshacer: 'défaire',
  rehacer: 'refaire',
  placer: 'plaire',
  complacer: 'complaire',
  yacer: 'gésir',
  valer: 'valoir',
  leer: 'lire',
  oler: 'sentir',
  roer: 'ronger',
  errar: 'errer',
  asir: 'saisir',
};

function uniqueCandidates(es) {
  const s = es.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const out = [];
  const add = (x) => {
    if (x && !out.includes(x)) out.push(x);
  };

  add(s);
  if (OVERRIDES[es]) add(OVERRIDES[es].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  if (s.endsWith('arse')) {
    const b = s.slice(0, -4);
    add(b + 'er');
  } else if (s.endsWith('erse')) {
    const b = s.slice(0, -4);
    add(b + 'er');
  } else if (s.endsWith('irse')) {
    const b = s.slice(0, -4);
    add(b + 'ir');
  }

  if (s.endsWith('ificar')) add(s.slice(0, -6) + 'fier');
  if (s.endsWith('izar')) {
    const b = s.slice(0, -4);
    add(b + 'iser');
  }

  if (s.endsWith('ar')) {
    const stem = s.slice(0, -2);
    add(stem + 'er');
  }

  return out;
}

function guessFrenchHeuristic(es) {
  if (OVERRIDES[es]) {
    const k = findLefffKey(OVERRIDES[es]);
    if (k) return k;
  }
  for (const cand of uniqueCandidates(es)) {
    const k = findLefffKey(cand);
    if (k) return k;
  }
  return null;
}

async function mymemoryTranslate(es, cache) {
  if (cache[es]) return cache[es];
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(es)}&langpair=es|fr`;
  const res = await fetch(url);
  const j = await res.json();
  const txt = j?.responseData?.translatedText ?? '';
  cache[es] = txt;
  await sleep(400);
  return txt;
}

function resolveFromMt(es, mtRaw) {
  const tokens = mtToFrenchTokens(mtRaw);
  for (const t of tokens) {
    const k = findLefffKey(t);
    if (k) return k;
  }
  for (const t of tokens) {
    const stripped = t.replace(/^\(?\)?/, '').replace(/\?+$/, '');
    const k = findLefffKey(stripped);
    if (k) return k;
  }
  return null;
}

async function main() {
  const rows = parseSpanishRows(readFileSync(spanishPath, 'utf8'));
  if (rows.length !== 1000) throw new Error(`expected 1000 rows, got ${rows.length}`);

  /** @type {Record<string, string>} */
  const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};

  const lines = [];
  const failed = [];

  for (const r of rows) {
    let fr = guessFrenchHeuristic(r.es);
    if (!fr) {
      const mt = await mymemoryTranslate(r.es, cache);
      fr = resolveFromMt(r.es, mt);
    }
    if (!fr) {
      failed.push({ es: r.es, mt: cache[r.es] });
      continue;
    }
    const group = frenchGroupFromInfinitive(fr);
    const escMeaning = r.meaning_tr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const escInf = fr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    lines.push(
      `  { infinitive: '${escInf}', meaning_tr: '${escMeaning}', frequency_rank: ${r.frequency_rank}, is_irregular: ${r.is_irregular}, group: '${group}' },`
    );
  }

  writeFileSync(cachePath, JSON.stringify(cache, null, 0), 'utf8');

  if (failed.length) {
    console.error('Başarısız:', JSON.stringify(failed.slice(0, 30), null, 2));
    throw new Error(`${failed.length} fiil eşlenemedi`);
  }

  const header = `export const FRENCH_VERBS: {
  infinitive: string;
  meaning_tr: string;
  frequency_rank: number;
  is_irregular: boolean;
  group: 'er' | 'ir' | 're';
}[] = [
`;
  writeFileSync(outPath, `${header}${lines.join('\n')}\n];\n`, 'utf8');
  console.log('OK', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
