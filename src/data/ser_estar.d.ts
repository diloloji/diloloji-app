export interface SerEstarExample {
  es: string;
  tr: string;
}

export interface SerEstarRule {
  category: string;
  verb: 'ser' | 'estar';
  rule: string;
  examples: SerEstarExample[];
}

export const serEstarRules: SerEstarRule[];
