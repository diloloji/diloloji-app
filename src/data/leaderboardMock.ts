/**
 * Liderlik tablosu — sanal rakipler (mock). Gerçek backend gelene kadar kullanılır.
 */

export type LeaderboardEntry = {
  id: string;
  name: string;
  initials: string;
  xp: number;
  isCurrentUser: boolean;
};

const MOCK_NAMES = [
  'Alex Rivera', 'Sofia Chen', 'Marco Rossi', 'Emma Lindberg', 'Lucas Dubois',
  'Zeynep Kaya', 'James O\'Brien', 'Léa Martin', 'Diego Santos', 'Anna Kowalski',
  'Noah Schmidt', 'Mia Nakamura', 'Elias Berg', 'Olivia Fernández', 'Liam Walsh',
  'Isabella Costa', 'Oliver Jensen', 'Ava Müller', 'Finn Andersen', 'Chloe Kim',
];

function stableXPFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return 500 + (h % 2500);
}

/** 20 sanal kullanıcı + mevcut kullanıcı; XP'ye göre sıralanmış. Mock XP isimden türetilir (sayfa yenilenene kadar sabit). */
export function buildLeaderboardList(currentUserXP: number): LeaderboardEntry[] {
  const list: LeaderboardEntry[] = MOCK_NAMES.map((name, i) => {
    const parts = name.trim().split(/\s+/);
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
    return {
      id: `mock-${i}`,
      name,
      initials,
      xp: stableXPFromName(name),
      isCurrentUser: false,
    };
  });

  list.push({
    id: 'current-user',
    name: 'Sen',
    initials: 'S',
    xp: currentUserXP,
    isCurrentUser: true,
  });

  list.sort((a, b) => b.xp - a.xp);
  return list;
}
