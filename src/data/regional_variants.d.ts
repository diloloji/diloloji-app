export interface RegionalUsage {
  usage: string;
  meaning: string;
  example: string;
}

export interface RegionalVariantEntry {
  spain: RegionalUsage;
  latam: RegionalUsage;
  warning: string | null;
  level: 'critical' | 'info';
}

export const regionalVariants: Record<string, RegionalVariantEntry>;
