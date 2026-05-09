/**
 * Öğrenme Yolu — İspanyolca ünite şeması (Türkçe açıklama, İspanyolca örnekler).
 */

export type UnitLevel = 'A1' | 'A2' | 'B1' | 'B2';

export type UnitExerciseType = 'fill' | 'multiple' | 'translate' | 'match';

export type UnitData = {
  id: string;
  title: string;
  description: string;
  level: UnitLevel;
  estimatedMinutes: number;
  topics: string[];
  explanation: {
    title: string;
    content: string;
    rules?: { rule: string; example_es: string; example_tr: string }[];
    table?: { headers: string[]; rows: string[][] };
  }[];
  examples: {
    es: string;
    tr: string;
    highlight?: string;
  }[];
  exercises: {
    id: string;
    type: UnitExerciseType;
    question: string;
    options?: string[];
    answer: string;
    explanation: string;
  }[];
  vocabulary?: {
    word: string;
    meaning: string;
    example: string;
  }[];
};
