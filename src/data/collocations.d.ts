export type CollocationLevel = 'A1' | 'A2' | 'B1';

export interface CollocationItem {
  noun: string;
  full: string;
  tr: string;
  level: CollocationLevel;
}

export const collocations: Record<string, CollocationItem[]>;
