/**
 * KATMAN 2 — Anthropic API ile turkish + level alanlarını doldur.
 *
 * Girdi:  scripts/data/verbs_raw.json
 * Çıktı:  scripts/data/verbs_enriched.json  (her batch sonrası güncellenir)
 *         scripts/data/errors.json           (başarısız fiiller, tekrar edilebilir)
 *
 * Kullanım:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   node scripts/enrich_verbs.cjs              # baştan / devam ettir
 *   node scripts/enrich_verbs.cjs --retry-errors
 *   node scripts/enrich_verbs.cjs --limit 20   # sadece 20 fiil (test)
 *
 * API key kaynakları (öncelik sırasıyla):
 *   1) process.env.ANTHROPIC_API_KEY
 *   2) .env.local içinde ANTHROPIC_API_KEY=...
 */

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk').default;

const DATA_DIR = path.join(__dirname, 'data');
const RAW_PATH = path.join(DATA_DIR, 'verbs_raw.json');
const OUT_PATH = path.join(DATA_DIR, 'verbs_enriched.json');
const ERR_PATH = path.join(DATA_DIR, 'errors.json');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514';
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Argümanlar
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const RETRY_ONLY = args.includes('--retry-errors');
const LIMIT_IDX = args.indexOf('--limit');
const LIMIT = LIMIT_IDX !== -1 ? parseInt(args[LIMIT_IDX + 1], 10) : 0;

// ---------------------------------------------------------------------------
// .env.local okuma (ANTHROPIC_API_KEY için)
// ---------------------------------------------------------------------------
function loadDotEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    if (process.env[key]) continue;
    const val = rawVal.replace(/^['"]|['"]$/g, '');
    process.env[key] = val;
  }
}
loadDotEnvLocal();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    'HATA: ANTHROPIC_API_KEY bulunamadı.\n' +
      '  .env.local içine aşağıdaki satırı ekleyin:\n' +
      '    ANTHROPIC_API_KEY=sk-ant-...\n' +
      '  veya shell üzerinden:\n' +
      '    export ANTHROPIC_API_KEY=sk-ant-...',
  );
  process.exit(1);
}

const client = new Anthropic();

// ---------------------------------------------------------------------------
// JSON okuma/yazma (atomik)
// ---------------------------------------------------------------------------
function readJsonSafe(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    console.warn(`  uyarı: ${path.basename(p)} okunamadı (${err.message}), sıfırdan başlanıyor.`);
    return fallback;
  }
}

function writeJson(p, data) {
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, p);
}

// ---------------------------------------------------------------------------
// Tek fiil zenginleştirme
// ---------------------------------------------------------------------------
const VALID_LEVELS = new Set(['A1', 'A2', 'B1', 'B2']);

async function enrichVerb(verb, attempt = 1) {
  const hint = verb.english ? `\nİngilizce ipucu: "${verb.english}"` : '';
  const prompt = `İspanyolca fiil: "${verb.infinitive}"${hint}
Sadece geçerli JSON döndür, başka hiçbir şey yazma. Açıklama, markdown, kod bloğu yok.
{"turkish": "en yaygın Türkçe karşılığı (mastar hali, örn: 'konuşmak')", "level": "A1|A2|B1|B2"}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((c) => c.type === 'text');
    if (!textBlock) throw new Error('boş yanıt');
    let raw = textBlock.text.trim();
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    const parsed = JSON.parse(raw);
    const turkish = typeof parsed.turkish === 'string' ? parsed.turkish.trim() : '';
    const level = typeof parsed.level === 'string' ? parsed.level.trim().toUpperCase() : '';
    if (!turkish) throw new Error('turkish boş');
    if (!VALID_LEVELS.has(level)) throw new Error(`geçersiz level: "${level}"`);

    return { turkish, level };
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const wait = 1000 * attempt;
      await new Promise((r) => setTimeout(r, wait));
      return enrichVerb(verb, attempt + 1);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Ana akış
// ---------------------------------------------------------------------------
async function main() {
  const raw = readJsonSafe(RAW_PATH, null);
  if (!Array.isArray(raw)) {
    console.error(`HATA: ${RAW_PATH} bulunamadı. Önce 'node scripts/parse_verbs.cjs' çalıştırın.`);
    process.exit(1);
  }

  const enriched = readJsonSafe(OUT_PATH, []);
  const enrichedByInf = new Map(enriched.map((v) => [v.infinitive, v]));

  let errors = readJsonSafe(ERR_PATH, []);
  const errorsByInf = new Map(errors.map((e) => [e.infinitive, e]));

  // İşlenecek liste
  let queue;
  if (RETRY_ONLY) {
    const retrySet = new Set(errors.map((e) => e.infinitive));
    queue = raw.filter((v) => retrySet.has(v.infinitive));
    console.log(`[retry-errors] ${queue.length} fiil tekrar denenecek.`);
    errors = [];
    errorsByInf.clear();
  } else {
    queue = raw.filter((v) => {
      const existing = enrichedByInf.get(v.infinitive);
      return !existing || !existing.turkish || !existing.level;
    });
    console.log(
      `Toplam: ${raw.length}  |  Zaten zengin: ${raw.length - queue.length}  |  İşlenecek: ${queue.length}`,
    );
  }

  if (LIMIT > 0) {
    queue = queue.slice(0, LIMIT);
    console.log(`[--limit] ilk ${queue.length} fiille sınırlandı.`);
  }

  if (queue.length === 0) {
    console.log('Yapılacak iş yok, çıkılıyor.');
    return;
  }

  console.log(`Model: ${MODEL}  |  Batch: ${BATCH_SIZE}  |  Delay: ${BATCH_DELAY_MS}ms\n`);

  const started = Date.now();
  let done = 0;
  let okCount = 0;
  let errCount = 0;

  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (verb) => {
        try {
          const { turkish, level } = await enrichVerb(verb);
          return { verb, ok: true, turkish, level };
        } catch (err) {
          return { verb, ok: false, error: err.message || String(err) };
        }
      }),
    );

    for (const r of results) {
      done++;
      if (r.ok) {
        okCount++;
        const merged = { ...r.verb, turkish: r.turkish, level: r.level };
        enrichedByInf.set(r.verb.infinitive, merged);
        errorsByInf.delete(r.verb.infinitive);
      } else {
        errCount++;
        errorsByInf.set(r.verb.infinitive, {
          infinitive: r.verb.infinitive,
          english: r.verb.english || null,
          error: r.error,
          at: new Date().toISOString(),
        });
      }
    }

    // Her batch sonrası diske yaz (Ctrl-C güvenli)
    const sortedEnriched = Array.from(enrichedByInf.values()).sort((a, b) =>
      a.infinitive.localeCompare(b.infinitive, 'es'),
    );
    writeJson(OUT_PATH, sortedEnriched);
    writeJson(ERR_PATH, Array.from(errorsByInf.values()));

    const elapsed = (Date.now() - started) / 1000;
    const rate = done / elapsed;
    const eta = rate > 0 ? Math.max(0, Math.round((queue.length - done) / rate)) : 0;
    console.log(
      `  ${String(done).padStart(4)} / ${queue.length}  ` +
        `✓ ${okCount}  ✗ ${errCount}  ` +
        `(${rate.toFixed(1)}/s, ETA ${eta}s)`,
    );

    if (i + BATCH_SIZE < queue.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log('\n=== Özet ===');
  console.log(`  Başarılı:  ${okCount}`);
  console.log(`  Başarısız: ${errCount}`);
  console.log(`  Toplam enriched kayıt: ${enrichedByInf.size}`);
  console.log(`  Çıktı: ${path.relative(process.cwd(), OUT_PATH)}`);
  if (errCount > 0) {
    console.log(
      `  Hatalar: ${path.relative(process.cwd(), ERR_PATH)} ` +
        `(tekrar denemek için: node scripts/enrich_verbs.cjs --retry-errors)`,
    );
  }
}

main().catch((err) => {
  console.error('\nBEKLENMEYEN HATA:', err);
  process.exit(1);
});
