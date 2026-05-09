/**
 * french-mm-cache.json + es-fr-mt-fixes.json + sezgisel/override ile french-data.ts üretir (API yok).
 * node scripts/compose-french-final.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const spanishPath = join(root, 'src/data/spanish-data.ts');
const outPath = join(root, 'src/data/french-data.ts');
const cachePath = join(root, 'src/data/french-mm-cache.json');
const fixesPath = join(root, 'src/data/es-fr-mt-fixes.json');
const lefff = JSON.parse(readFileSync(join(root, 'node_modules/french-verbs-lefff/dist/conjugations.json'), 'utf8'));

const MT_FIXES = existsSync(fixesPath) ? JSON.parse(readFileSync(fixesPath, 'utf8')) : {};
const CACHE = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};

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
  return String(str || '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function tokensFromMt(raw) {
  const s = decodeEntities(raw).split(/\n/)[0].trim();
  return s
    .split(/[\s,/;:()]+/)
    .map((t) => t.replace(/^[\d.¿?¡!]+|[¿?.!:;]+$/g, '').trim())
    .filter(Boolean);
}

function resolveFromMt(mtRaw) {
  for (const t of tokensFromMt(mtRaw)) {
    const k = findLefffKey(t);
    if (k) return k;
  }
  return null;
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
  errar: 'errer',
  hablar: 'parler',
  comer: 'manger',
  llamar: 'appeler',
  trabajar: 'travailler',
  estudiar: 'étudier',
  ayudar: 'aider',
  buscar: 'chercher',
  dejar: 'laisser',
  llegar: 'arriver',
  pasar: 'passer',
  creer: 'croire',
  terminar: 'finir',
  intentar: 'essayer',
  explicar: 'expliquer',
  contar: 'conter',
  pensar: 'penser',
  entender: 'comprendre',
};

function uniqueCandidates(es) {
  const s = es.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const out = [];
  const add = (x) => {
    if (x && !out.includes(x)) out.push(x);
  };
  add(s);
  if (OVERRIDES[es]) add(OVERRIDES[es].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  if (s.endsWith('arse')) add(s.slice(0, -4) + 'er');
  else if (s.endsWith('erse')) add(s.slice(0, -4) + 'er');
  else if (s.endsWith('irse')) add(s.slice(0, -4) + 'ir');
  if (s.endsWith('ificar')) add(s.slice(0, -6) + 'fier');
  if (s.endsWith('izar')) add(s.slice(0, -4) + 'iser');
  if (s.endsWith('ar')) add(s.slice(0, -2) + 'er');
  return out;
}

function guessHeuristic(es) {
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

function resolveFrench(es) {
  if (MT_FIXES[es]) {
    const k = findLefffKey(MT_FIXES[es]);
    if (k) return k;
  }
  const h = guessHeuristic(es);
  if (h) return h;
  const mt = CACHE[es];
  if (mt) {
    const k = resolveFromMt(mt);
    if (k) return k;
  }
  return null;
}

function main() {
  const rows = parseSpanishRows(readFileSync(spanishPath, 'utf8'));
  const lines = [];
  const failed = [];
  for (const r of rows) {
    const fr = resolveFrench(r.es);
    if (!fr) {
      failed.push(r.es);
      continue;
    }
    const group = frenchGroupFromInfinitive(fr);
    const escMeaning = r.meaning_tr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const escInf = fr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    lines.push(
      `  { infinitive: '${escInf}', meaning_tr: '${escMeaning}', frequency_rank: ${r.frequency_rank}, is_irregular: ${r.is_irregular}, group: '${group}' },`
    );
  }
  if (failed.length) {
    console.error('Eşlenemedi:', failed.join(', '));
    throw new Error(`${failed.length} fiil`);
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

main();
