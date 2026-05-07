export interface ExampleSentenceItem {
  es: string;
  tr: string;
  person?: string;
}

export type ExampleSentencesMap = Record<string, Record<string, ExampleSentenceItem | null>>;

export const exampleSentences: ExampleSentencesMap;
