/**
 * audit_errors.json içindeki düzeltmeleri spanish_conjugation_overrides.json dosyasına yazar.
 * Zaman ve şahıs anahtarları audit ile aynı etiketlerdir (örn. "Pretérito Imperfecto", "tú", "él/ella").
 * Mevcut override ile derin birleştirir; yedek: spanish_conjugation_overrides.json.bak
 *
 *   node fix_verbs.js
 */
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  AUDIT_LABEL_TO_TENSE_ID,
  isKnownDisplayPerson,
} from './spanish_overrides_resolve.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ERRORS_PATH = join(__dirname, 'audit_errors.json');
const OVERRIDES_PATH = join(__dirname, 'src/data/spanish_conjugation_overrides.json');
const BACKUP_PATH = `${OVERRIDES_PATH}.bak`;

function resolveVerbKey(overrides, verb) {
  const found = Object.keys(overrides).find((k) => k.toLowerCase() === verb.toLowerCase());
  return found ?? verb;
}

function countPlannedFixes(errors) {
  let fixCount = 0;
  const verbs = new Set();
  for (const block of errors) {
    if (!block || typeof block !== 'object') continue;
    if (!AUDIT_LABEL_TO_TENSE_ID[block.tense]) continue;
    for (const err of block.errors || []) {
      const correct = err.correct != null ? String(err.correct).trim() : '';
      const current = err.current != null ? String(err.current).trim() : '';
      if (!correct) continue;
      if (correct === current) continue;
      if (!isKnownDisplayPerson(err.person)) continue;
      fixCount += 1;
      verbs.add(String(block.verb));
    }
  }
  return { fixCount, verbCount: verbs.size };
}

function main() {
  if (!existsSync(ERRORS_PATH)) {
    console.error('audit_errors.json bulunamadı. Önce audit_verbs.js çalıştırın.');
    process.exit(1);
  }

  const errors = JSON.parse(readFileSync(ERRORS_PATH, 'utf8'));
  if (!Array.isArray(errors) || errors.length === 0) {
    console.log('Düzeltilecek hata yok.');
    process.exit(0);
  }

  const { fixCount, verbCount } = countPlannedFixes(errors);
  console.log(`Uygulanacak: ${verbCount} fiil, ${fixCount} çekim düzeltmesi (current ≠ correct, bilinen zaman/şahıs).`);
  if (fixCount === 0) {
    console.log('Yazılacak düzeltme yok.');
    process.exit(0);
  }

  let merged = {};
  if (existsSync(OVERRIDES_PATH)) {
    try {
      merged = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8'));
      if (merged === null || typeof merged !== 'object' || Array.isArray(merged)) merged = {};
    } catch {
      merged = {};
    }
  }

  if (existsSync(OVERRIDES_PATH)) {
    copyFileSync(OVERRIDES_PATH, BACKUP_PATH);
    console.log('Yedek:', BACKUP_PATH);
  }

  let applied = 0;

  for (const block of errors) {
    const tenseLabel = block.tense;
    if (!AUDIT_LABEL_TO_TENSE_ID[tenseLabel]) {
      console.warn('Bilinmeyen zaman, atlandı:', tenseLabel);
      continue;
    }

    const verbKey = resolveVerbKey(merged, block.verb);
    const prev =
      merged[verbKey]?.[tenseLabel] && typeof merged[verbKey][tenseLabel] === 'object' && !Array.isArray(merged[verbKey][tenseLabel])
        ? { ...merged[verbKey][tenseLabel] }
        : {};
    const next = { ...prev };

    for (const err of block.errors || []) {
      const personLabel = err.person != null ? String(err.person).trim() : '';
      if (!isKnownDisplayPerson(personLabel)) {
        console.warn('Bilinmeyen şahıs, atlandı:', err.person, block.verb, tenseLabel);
        continue;
      }
      const correct = err.correct != null ? String(err.correct).trim() : '';
      const current = err.current != null ? String(err.current).trim() : '';
      if (!correct) {
        console.warn('Boş correct, atlandı:', block.verb, tenseLabel, personLabel);
        continue;
      }
      if (correct === current) continue;

      next[personLabel] = correct;
      applied += 1;
      console.log(`${verbKey} · ${tenseLabel} · ${personLabel}: ${err.current} → ${correct}`);
    }

    if (Object.keys(next).length > 0) {
      if (!merged[verbKey]) merged[verbKey] = {};
      merged[verbKey][tenseLabel] = next;
    }
  }

  for (const vk of Object.keys(merged)) {
    const entry = merged[vk];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    for (const tk of Object.keys(entry)) {
      const patch = entry[tk];
      if (patch && typeof patch === 'object' && !Array.isArray(patch) && Object.keys(patch).length === 0) {
        delete entry[tk];
      }
    }
    if (Object.keys(entry).length === 0) {
      delete merged[vk];
    }
  }

  writeFileSync(OVERRIDES_PATH, JSON.stringify(merged, null, 2) + '\n');
  console.log(`\n${applied} düzeltme dosyaya işlendi: ${OVERRIDES_PATH}`);
}

main();
