/** AuthProvider tarafından güncellenir; mastery/starred gibi modüller import döngüsü olmadan kullanır. */
let cachedUserId: string | null = null;

export function setCachedAuthUserId(id: string | null) {
  cachedUserId = id;
}

export function getCachedAuthUserId(): string | null {
  return cachedUserId;
}
