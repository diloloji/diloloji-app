/**
 * KATMAN 1 — Açık kaynak fiil veritabanını kendi formatımıza dönüştür.
 *
 * Kaynak: https://github.com/ghidinelli/fred-jehle-spanish-verbs
 * Çıktı:  scripts/data/verbs_raw.json
 *
 * Kullanım:
 *   node scripts/parse_verbs.cjs
 *
 * İlk çalıştırmada CSV'yi indirir ve scripts/data/jehle_verb_database.csv
 * altına önbelleğe alır. Sonraki çalışmalarda önbellek kullanılır; yeniden
 * indirmek için bu dosyayı silin.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CSV_URL =
  'https://raw.githubusercontent.com/ghidinelli/fred-jehle-spanish-verbs/master/jehle_verb_database.csv';

const DATA_DIR = path.join(__dirname, 'data');
const CSV_PATH = path.join(DATA_DIR, 'jehle_verb_database.csv');
const OUT_PATH = path.join(DATA_DIR, 'verbs_raw.json');

// ---------------------------------------------------------------------------
// Mood | Tense  →  uygulama tense id eşleşmesi
// Uygulamanın desteklediği 9 zaman (src/data/spanish.ts) ile birebir.
// ---------------------------------------------------------------------------
const TENSE_MAP = {
  'Indicativo|Presente': 'presente',
  'Indicativo|Imperfecto': 'imperfecto',
  'Indicativo|Pretérito': 'preterito',
  'Indicativo|Pretérito perfecto': 'preterito-perfecto',
  'Indicativo|Pluscuamperfecto': 'pluscuamperfecto',
  'Indicativo|Futuro': 'futuro',
  'Indicativo|Futuro perfecto': 'futuro-compuesto',
  'Indicativo|Condicional': 'condicional',
  'Subjuntivo|Presente': 'subjuntivo-presente',
};

const TARGET_TENSES = Object.values(TENSE_MAP);

const PRONOUN_COLUMNS = [
  ['form_1s', 'yo'],
  ['form_2s', 'tu'],
  ['form_3s', 'el'],
  ['form_1p', 'nosotros'],
  ['form_2p', 'vosotros'],
  ['form_3p', 'ellos'],
];

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------
function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return download(res.headers.location, destPath).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} — ${url}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      })
      .on('error', (err) => {
        fs.unlink(destPath, () => reject(err));
      });
  });
}

/**
 * RFC 4180 uyumlu basit CSV ayrıştırıcı.
 * Alanlar virgülle ayrılır, "..." içinde virgül ve satır sonu olabilir,
 * içteki çift tırnaklar "" olarak kaçırılır.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\r') {
        // yoksay, bir sonraki \n satırı bitirir
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Presente zamanına bakıp düzenli -ar/-er/-ir kalıbına uymayan en az bir
 * form varsa fiili düzensiz kabul eder. Kapsamlı olmasa da hızlı bir
 * heuristik ve manuel düzensiz listemiz (irregularVerbs.ts) ile
 * birleştirildiğinde yeterli.
 */
function detectIrregular(infinitive, presente) {
  if (!presente) return false;
  const inf = infinitive.toLowerCase();
  const ending = inf.slice(-2);
  const stem = inf.slice(0, -2);

  const endings =
    ending === 'ar'
      ? { yo: 'o', tu: 'as', el: 'a', nosotros: 'amos', vosotros: 'áis', ellos: 'an' }
      : ending === 'er'
      ? { yo: 'o', tu: 'es', el: 'e', nosotros: 'emos', vosotros: 'éis', ellos: 'en' }
      : ending === 'ir'
      ? { yo: 'o', tu: 'es', el: 'e', nosotros: 'imos', vosotros: 'ís', ellos: 'en' }
      : null;

  if (!endings) return true; // standart dışı mastar (ör. -ír, -ír değilse)

  for (const [p, suffix] of Object.entries(endings)) {
    const expected = stem + suffix;
    const actual = (presente[p] || '').toLowerCase();
    if (!actual) continue;
    if (actual !== expected) return true;
  }
  return false;
}

function emptyFormMap() {
  return { yo: '', tu: '', el: '', nosotros: '', vosotros: '', ellos: '' };
}

// ---------------------------------------------------------------------------
// Ana akış
// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(CSV_PATH)) {
    console.log(`[1/4] CSV indiriliyor → ${path.relative(process.cwd(), CSV_PATH)}`);
    await download(CSV_URL, CSV_PATH);
  } else {
    console.log(`[1/4] Önbellekten okunuyor: ${path.relative(process.cwd(), CSV_PATH)}`);
  }

  const text = fs.readFileSync(CSV_PATH, 'utf8');
  console.log('[2/4] CSV ayrıştırılıyor…');
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('CSV boş veya bozuk.');

  const header = rows[0].map((h) => h.trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const required = [
    'infinitive',
    'infinitive_english',
    'mood',
    'tense',
    'form_1s',
    'form_2s',
    'form_3s',
    'form_1p',
    'form_2p',
    'form_3p',
    'gerund',
    'pastparticiple',
  ];
  for (const col of required) {
    if (!(col in idx)) throw new Error(`CSV'de beklenen sütun yok: ${col}`);
  }

  console.log(`[3/4] ${rows.length - 1} satır işleniyor…`);

  /** @type {Map<string, any>} */
  const verbs = new Map();
  let skipped = 0;
  let usedRows = 0;

  for (let r = 1; r < rows.length; r++) {
    try {
      const row = rows[r];
      if (!row || row.length < header.length) {
        skipped++;
        continue;
      }
      const infinitive = (row[idx.infinitive] || '').trim().toLowerCase();
      if (!infinitive) {
        skipped++;
        continue;
      }
      const mood = (row[idx.mood] || '').trim();
      const tense = (row[idx.tense] || '').trim();
      const key = `${mood}|${tense}`;
      const tenseId = TENSE_MAP[key];
      if (!tenseId) continue; // ihtiyacımız olmayan zaman

      let entry = verbs.get(infinitive);
      if (!entry) {
        entry = {
          infinitive,
          english: (row[idx.infinitive_english] || '').trim() || null,
          turkish: null,
          level: null,
          irregular: false,
          gerund: (row[idx.gerund] || '').trim() || null,
          participle: (row[idx.pastparticiple] || '').trim() || null,
          forms: Object.fromEntries(TARGET_TENSES.map((t) => [t, emptyFormMap()])),
        };
        verbs.set(infinitive, entry);
      } else {
        if (!entry.gerund && row[idx.gerund]) entry.gerund = row[idx.gerund].trim();
        if (!entry.participle && row[idx.pastparticiple]) entry.participle = row[idx.pastparticiple].trim();
      }

      const target = entry.forms[tenseId];
      for (const [col, pronoun] of PRONOUN_COLUMNS) {
        const val = (row[idx[col]] || '').trim();
        if (val) target[pronoun] = val;
      }
      usedRows++;
    } catch (err) {
      skipped++;
      console.warn(`  satır ${r} atlandı:`, err.message);
    }
  }

  // Düzensiz tespiti (presente üzerinden)
  let irregularCount = 0;
  for (const v of verbs.values()) {
    v.irregular = detectIrregular(v.infinitive, v.forms.presente);
    if (v.irregular) irregularCount++;
  }

  // Eksik zaman uyarısı
  const tenseCoverage = Object.fromEntries(TARGET_TENSES.map((t) => [t, 0]));
  for (const v of verbs.values()) {
    for (const t of TARGET_TENSES) {
      const f = v.forms[t];
      const hasAny = Object.values(f).some((x) => x && x.length > 0);
      if (hasAny) tenseCoverage[t]++;
    }
  }

  const list = Array.from(verbs.values()).sort((a, b) =>
    a.infinitive.localeCompare(b.infinitive, 'es'),
  );

  console.log(`[4/4] ${path.relative(process.cwd(), OUT_PATH)} yazılıyor…`);
  fs.writeFileSync(OUT_PATH, JSON.stringify(list, null, 2), 'utf8');

  console.log('\n=== Özet ===');
  console.log(`  Toplam fiil:        ${list.length}`);
  console.log(`  Kullanılan satır:   ${usedRows}`);
  console.log(`  Atlanan satır:      ${skipped}`);
  console.log(`  Düzensiz (heuristik): ${irregularCount}`);
  console.log('  Zaman kapsaması:');
  for (const t of TARGET_TENSES) {
    console.log(`    - ${t.padEnd(22)} ${tenseCoverage[t]} fiil`);
  }
}

main().catch((err) => {
  console.error('HATA:', err);
  process.exit(1);
});
