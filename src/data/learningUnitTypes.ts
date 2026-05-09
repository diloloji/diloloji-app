/**
 * Öğrenme Yolu — paylaşılan ünite/ders tipleri (döngüsel import önlemek için ayrı dosya).
 */

export type LessonExample = {
  original: string;
  verbBold?: string;
  phonetic?: string;
  turkish: string;
};

export type LessonConjugationRow = {
  subject: string;
  verb: string;
  phonetic?: string;
  meaning: string;
};

export type QuizQuestionType = 'multiple_choice' | 'fill_blank' | 'true_false';

export type QuizQuestion = {
  type: QuizQuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
};

export type LessonItem = {
  lessonTitle: string;
  grammarBlock: string;
  content: string;
  examples?: LessonExample[];
  conjugation?: LessonConjugationRow[];
  quiz?: QuizQuestion[];
};

export type UnitContent = {
  id: string;
  title: string;
  estimatedMinutes?: number;
  xpRewardOnComplete?: number;
  lessons: LessonItem[];
};
