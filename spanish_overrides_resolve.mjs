/**
 * spanish_conjugation_overrides.json — hem uygulama tense id (presente, imperfecto…)
 * hem audit etiketleri ("Pretérito Imperfecto") ve şahıs etiketleri (tú, él/ella…) kabul eder.
 * Node araçları (audit_verbs, generate_irregular_by_tense) ve mantık tek yerde.
 */

export const PRONOUN_IDS_LIST = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'];

/** Uygulama tense id → audit / JSON-insan etiketi */
export const TENSE_ID_TO_AUDIT_LABEL = {
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

/** Audit etiketi → uygulama tense id */
export const AUDIT_LABEL_TO_TENSE_ID = Object.fromEntries(
  Object.entries(TENSE_ID_TO_AUDIT_LABEL).map(([id, label]) => [label, id])
);

/** Görünen şahıs anahtarı → uygulama pronoun id */
export const PERSON_DISPLAY_TO_INTERNAL = {
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

export function findRawTensePatch(verbEntry, tenseId) {
  if (!verbEntry || typeof verbEntry !== 'object') return null;
  const byId = verbEntry[tenseId];
  if (byId && typeof byId === 'object' && !Array.isArray(byId)) return byId;
  const label = TENSE_ID_TO_AUDIT_LABEL[tenseId];
  if (label) {
    const byLabel = verbEntry[label];
    if (byLabel && typeof byLabel === 'object' && !Array.isArray(byLabel)) return byLabel;
  }
  return null;
}

export function normalizePatchToInternal(rawPatch) {
  const out = {};
  if (!rawPatch || typeof rawPatch !== 'object') return out;
  for (const [k, v] of Object.entries(rawPatch)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    const internal =
      PERSON_DISPLAY_TO_INTERNAL[k] ??
      PERSON_DISPLAY_TO_INTERNAL[k?.toLowerCase?.()] ??
      (PRONOUN_IDS_LIST.includes(k) ? k : null);
    if (internal) out[internal] = s;
  }
  return out;
}

/**
 * @param {string} verbInfinitive
 * @param {Record<string, unknown>} overridesRoot
 * @param {string} tenseId - uygulama id (örn. imperfecto)
 * @param {Record<string, string>} baseMap
 */
export function applySpanishConjugationOverrides(verbInfinitive, overridesRoot, tenseId, baseMap) {
  const ovKey = Object.keys(overridesRoot).find((k) => k.toLowerCase() === verbInfinitive.trim().toLowerCase());
  if (!ovKey) return { ...baseMap };
  const raw = findRawTensePatch(overridesRoot[ovKey], tenseId);
  if (!raw) return { ...baseMap };
  const patch = normalizePatchToInternal(raw);
  const next = { ...baseMap };
  for (const pid of PRONOUN_IDS_LIST) {
    const val = patch[pid];
    if (val !== undefined && val !== null && String(val).length > 0) {
      next[pid] = String(val);
    }
  }
  return next;
}

/** fix_verbs: şahıs etiketi geçerli mi */
export function isKnownDisplayPerson(person) {
  if (!person || typeof person !== 'string') return false;
  const p = person.trim();
  if (PERSON_DISPLAY_TO_INTERNAL[p] !== undefined) return true;
  if (PERSON_DISPLAY_TO_INTERNAL[p.toLowerCase()] !== undefined) return true;
  return false;
}
