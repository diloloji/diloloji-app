/**
 * UnitData → mevcut LessonView ile uyumlu UnitContent (tek ders = tek ünite oturumu).
 */

import type { UnitContent, LessonItem, QuizQuestion, LessonExample, LessonConjugationRow } from '../learningUnitTypes';
import type { UnitData, UnitExerciseType } from './types';

const UNIT_COMPLETE_XP = 30;

function appendExplanationToContent(blocks: string[], ex: UnitData['explanation'][0]) {
  blocks.push(`【${ex.title}】\n\n${ex.content}`);
  if (ex.rules?.length) {
    blocks.push(
      ex.rules
        .map((r) => `• ${r.rule}\n  Örnek: ${r.example_es} → ${r.example_tr}`)
        .join('\n\n')
    );
  }
  if (ex.table?.headers?.length && ex.table.rows?.length) {
    const headerLine = ex.table.headers.join(' | ');
    const sep = ex.table.headers.map(() => '---').join(' | ');
    const rowLines = ex.table.rows.map((row) => row.join(' | ')).join('\n');
    blocks.push(`${headerLine}\n${sep}\n${rowLines}`);
  }
}

function vocabSection(v: UnitData['vocabulary']): string {
  if (!v?.length) return '';
  const lines = v.map((x) => `• ${x.word} — ${x.meaning}\n  Örnek: ${x.example}`);
  return `\n\n— Kelime haznesi —\n${lines.join('\n')}`;
}

/** explanation içindeki ilk “fiil tablosu”nu LessonView çekim tablosuna dönüştürür (başlıklar: Özne | Fiil | Telaffuz | Anlam). */
function extractConjugation(data: UnitData): LessonConjugationRow[] | undefined {
  for (const ex of data.explanation) {
    const t = ex.table;
    if (!t?.headers?.length || !t.rows?.length) continue;
    const h = t.headers.map((x) => x.toLowerCase());
    const idx = (keys: string[]) => keys.findIndex((k) => h.some((cell) => cell.includes(k)));
    const subj = idx(['özne', 'persona', 'subject']);
    const verb = idx(['fiil', 'forma', 'verb']);
    const phone = idx(['telaffuz', 'fonét']);
    const mean = idx(['anlam', 'meaning', 'significado']);
    if (subj >= 0 && verb >= 0 && mean >= 0) {
      return t.rows.map((row) => ({
        subject: row[subj] ?? '',
        verb: row[verb] ?? '',
        phonetic: phone >= 0 ? row[phone] : undefined,
        meaning: row[mean] ?? '',
      }));
    }
  }
  return undefined;
}

function mapExerciseType(t: UnitExerciseType): QuizQuestion['type'] {
  if (t === 'multiple' || t === 'match' || t === 'translate') return 'multiple_choice';
  return 'multiple_choice';
}

function ensureOptions(ex: UnitData['exercises'][0]): string[] {
  if (ex.options && ex.options.length > 0) return ex.options;
  return [ex.answer, `${ex.answer} (yanlış)`, '—', '—'].filter((x, i, a) => a.indexOf(x) === i);
}

function toQuizQuestions(data: UnitData): QuizQuestion[] {
  return data.exercises.map((ex) => ({
    type: mapExerciseType(ex.type),
    question: ex.question,
    options: ensureOptions(ex),
    correctAnswer: ex.answer,
    explanation: ex.explanation,
  }));
}

export function unitDataToUnitContent(data: UnitData): UnitContent {
  const grammarBlock = data.topics.length ? data.topics.join(' · ') : data.level;

  const contentParts: string[] = [];
  for (const ex of data.explanation) {
    appendExplanationToContent(contentParts, ex);
  }
  const content = contentParts.join('\n\n') + vocabSection(data.vocabulary);

  const examples: LessonExample[] = data.examples.map((e) => ({
    original: e.es,
    turkish: e.tr,
    verbBold: e.highlight,
  }));

  const conjugation = extractConjugation(data);

  const lesson: LessonItem = {
    lessonTitle: data.title,
    grammarBlock,
    content,
    examples,
    conjugation,
    quiz: toQuizQuestions(data),
  };

  return {
    id: data.id,
    title: data.title,
    estimatedMinutes: data.estimatedMinutes,
    lessons: [lesson],
    xpRewardOnComplete: UNIT_COMPLETE_XP,
  };
}

export function unitDataListToRecord(list: UnitData[]): Record<string, UnitContent> {
  return Object.fromEntries(list.map((u) => [u.id, unitDataToUnitContent(u)]));
}
