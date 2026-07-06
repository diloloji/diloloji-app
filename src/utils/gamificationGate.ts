let enabled = false;

export function setGamificationEnabled(v: boolean): void {
  enabled = v;
}

export function isGamificationEnabled(): boolean {
  return enabled;
}
