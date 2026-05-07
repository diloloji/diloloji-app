export type TimeMarkerColor = 'teal' | 'blue' | 'purple' | 'green' | 'amber' | 'pink' | 'coral';

export interface TimeMarkerEntry {
  markers: string[];
  color: TimeMarkerColor;
}

export const timeMarkers: Record<string, TimeMarkerEntry>;
