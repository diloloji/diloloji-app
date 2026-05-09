import type { UnitData } from './types';

export function voc(rows: [string, string, string][]): NonNullable<UnitData['vocabulary']> {
  return rows.map(([word, meaning, example]) => ({ word, meaning, example }));
}

export function q(
  id: string,
  type: UnitData['exercises'][0]['type'],
  question: string,
  options: string[],
  answer: string,
  explanation: string
): UnitData['exercises'][0] {
  return { id, type, question, options, answer, explanation };
}

export function expl(
  title: string,
  content: string,
  rules?: { rule: string; example_es: string; example_tr: string }[],
  table?: { headers: string[]; rows: string[][] }
): UnitData['explanation'][0] {
  const o: UnitData['explanation'][0] = { title, content };
  if (rules) o.rules = rules;
  if (table) o.table = table;
  return o;
}
