/**
 * İspanyolca çekim motoru: spanish-verbs kütüphanesi.
 * person: 0=yo, 1=tú, 2=él/ella/ud., 3=nosotros, 4=vosotros, 5=ellos/ellas/uds.
 */
import { getConjugation as getConjugationLib } from 'spanish-verbs';
import type { PronounEs, TenseIdEs } from '../data/spanish';
import { getVerbListSpanish } from '../data/spanish';
import conjugationOverridesJson from '../data/spanish_conjugation_overrides.json';

/** İç id veya audit etiketi (zaman / şahıs) — spanish_overrides_resolve.mjs ile uyumlu */
type ConjugationOverridesFile = Record<string, Record<string, Record<string, string>>>;

const conjugationOverrides = conjugationOverridesJson as ConjugationOverridesFile;

const TENSE_ID_TO_AUDIT_LABEL: Record<TenseIdEs, string> = {
  presente: 'Presente',
  imperfecto: 'Pretérito Imperfecto',
  preterito: 'Pretérito Indefinido',
  'preterito-perfecto': 'Pretérito Perfecto',
  futuro: 'Futuro Simple',
  condicional: 'Condicional',
  'subjuntivo-presente': 'Subjuntivo Presente',
  pluscuamperfecto: 'Pluscuamperfecto',
  'futuro-compuesto': 'Futuro Compuesto',
};

const PERSON_DISPLAY_TO_KEY: Record<string, PronounEs> = {
  yo: 'yo',
  tú: 'tu',
  tu: 'tu',
  'él/ella': 'el',
  él: 'el',
  ella: 'el',
  el: 'el',
  nosotros: 'nosotros',
  vosotros: 'vosotros',
  'ellos/ellas': 'ellos',
  ellos: 'ellos',
  ellas: 'ellos',
};

const PRONOUN_IDS: PronounEs[] = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'];

function findRawTensePatch(verbEntry: Record<string, Record<string, string>> | undefined, tenseId: TenseIdEs): Record<string, string> | null {
  if (!verbEntry) return null;
  const byId = verbEntry[tenseId];
  if (byId && typeof byId === 'object' && !Array.isArray(byId)) return byId;
  const label = TENSE_ID_TO_AUDIT_LABEL[tenseId];
  if (label) {
    const byLabel = verbEntry[label];
    if (byLabel && typeof byLabel === 'object' && !Array.isArray(byLabel)) return byLabel;
  }
  return null;
}

function normalizePersonPatch(raw: Record<string, string>): Partial<Record<PronounEs, string>> {
  const out: Partial<Record<PronounEs, string>> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    const pid =
      PERSON_DISPLAY_TO_KEY[k] ??
      PERSON_DISPLAY_TO_KEY[k.toLowerCase()] ??
      (PRONOUN_IDS.includes(k as PronounEs) ? (k as PronounEs) : undefined);
    if (pid) out[pid] = s;
  }
  return out;
}

const TENSE_TO_LIB: Record<TenseIdEs, string> = {
  presente: 'INDICATIVE_PRESENT',
  imperfecto: 'INDICATIVE_IMPERFECT',
  preterito: 'INDICATIVE_PRETERITE',
  'preterito-perfecto': 'INDICATIVE_PERFECT',
  pluscuamperfecto: 'INDICATIVE_PLUPERFECT',
  futuro: 'INDICATIVE_FUTURE',
  'futuro-compuesto': 'INDICATIVE_FUTURE_PERFECT',
  'subjuntivo-presente': 'SUBJUNCTIVE_PRESENT',
  condicional: 'CONDITIONAL_PRESENT',
};

export type ConjugationMapEs = Record<PronounEs, string>;

function normalizeInfinitive(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Girdinin geçerli bir İspanyolca fiil (infinitivo) olup olmadığını dener.
 */
export function findVerbKeyEs(infinitive: string): string | null {
  const raw = normalizeInfinitive(infinitive);
  if (!raw) return null;
  const list = getVerbListSpanish();
  const exact = list.find((v) => v.toLowerCase() === raw);
  if (exact) return exact;
  try {
    getConjugationLib(raw, 'INDICATIVE_PRESENT', 0);
    return raw;
  } catch {
    return null;
  }
}

/**
 * Tek zaman için tüm şahısların çekimini üretir (sadece çekim metni, zamir yok).
 */
function applyConjugationOverrides(
  infinitive: string,
  tenseId: TenseIdEs,
  base: ConjugationMapEs
): ConjugationMapEs {
  const ovKey = Object.keys(conjugationOverrides).find(
    (k) => k.toLowerCase() === infinitive.trim().toLowerCase()
  );
  if (!ovKey) return base;
  const rawPatch = findRawTensePatch(conjugationOverrides[ovKey], tenseId);
  if (!rawPatch) return base;
  const patch = normalizePersonPatch(rawPatch);
  const next = { ...base };
  for (const pid of PRONOUN_IDS) {
    const v = patch[pid];
    if (v !== undefined && v !== null && String(v).length > 0) {
      next[pid] = String(v);
    }
  }
  return next;
}

export function getConjugationForTenseEs(
  infinitive: string,
  tenseId: TenseIdEs
): ConjugationMapEs {
  const tense = TENSE_TO_LIB[tenseId];
  const result = {} as ConjugationMapEs;
  for (let person = 0; person < 6; person++) {
    const conjugated = getConjugationLib(infinitive, tense, person as 0 | 1 | 2 | 3 | 4 | 5);
    result[PRONOUN_IDS[person]] = conjugated;
  }
  return applyConjugationOverrides(infinitive, tenseId, result);
}

/**
 * Verilen fiil ve zaman için çekim sonucu (helpers ile uyumlu format).
 */
export type ConjugationResultEs =
  | { ok: true; infinitive: string; conjugations: ConjugationMapEs }
  | { ok: false; error: string };

const DEFAULT_ERROR_ES = 'Bu fiil kütüphanede bulunamadı. Geçerli bir İspanyolca fiil girin.';

export function getConjugationsEs(
  verbInput: string,
  tenseId: TenseIdEs
): ConjugationResultEs {
  const trimmed = verbInput.trim();
  if (!trimmed) {
    return { ok: false, error: 'Lütfen bir fiil girin.' };
  }
  const verbKey = findVerbKeyEs(trimmed);
  if (!verbKey) {
    return { ok: false, error: DEFAULT_ERROR_ES };
  }
  try {
    const conjugations = getConjugationForTenseEs(verbKey, tenseId);
    return { ok: true, infinitive: verbKey, conjugations };
  } catch {
    return { ok: false, error: DEFAULT_ERROR_ES };
  }
}
