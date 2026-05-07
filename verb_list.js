import fs from 'fs';

function extractStringArray(source, constName) {
  const re = new RegExp(`const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
  const m = source.match(re);
  if (!m) return [];
  const body = m[1];
  const out = [];
  const itemRe = /'([^']+)'/g;
  let it;
  while ((it = itemRe.exec(body)) !== null) {
    out.push(it[1]);
  }
  return out;
}

function loadSpanishVerbs() {
  const spanishSource = fs.readFileSync('./src/data/spanish.ts', 'utf8');
  const irregularSource = fs.readFileSync('./src/data/irregularVerbs.ts', 'utf8');

  const common = extractStringArray(spanishSource, 'COMMON_SPANISH_VERBS');
  const irregularRaw = extractStringArray(irregularSource, 'IRREGULAR_ES_RAW');
  const irregularSet = new Set(irregularRaw.map((v) => v.toLowerCase()));

  return common.map((infinitive) => ({
    infinitive,
    irregular: irregularSet.has(infinitive.toLowerCase()),
  }));
}

export const verbList = loadSpanishVerbs();
