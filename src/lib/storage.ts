// localStorage wrapper. SSR-safe (alle calls werken alleen client-side).
//
// Tijdelijk voor M1. In M2 vervangen door Supabase-backed storage zodat
// audits gekoppeld zijn aan accounts ipv per-browser bewaard.

const STORAGE_PREFIX = 'conversielek:';

type StorageResult<T> = T & { shared?: boolean };

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export const storage = {
  async get(key: string, shared = false): Promise<StorageResult<{ key: string; value: string }>> {
    if (!isBrowser()) throw new Error('Storage onbeschikbaar (SSR)');
    const fullKey = STORAGE_PREFIX + key;
    const value = window.localStorage.getItem(fullKey);
    if (value === null) throw new Error('Key not found');
    return { key, value, shared };
  },

  async set(
    key: string,
    value: string,
    shared = false
  ): Promise<StorageResult<{ key: string; value: string }> | null> {
    if (!isBrowser()) return null;
    const fullKey = STORAGE_PREFIX + key;
    try {
      window.localStorage.setItem(fullKey, value);
      return { key, value, shared };
    } catch (e) {
      console.error('Storage error:', e);
      return null;
    }
  },

  async delete(
    key: string,
    shared = false
  ): Promise<StorageResult<{ key: string; deleted: boolean }>> {
    if (!isBrowser()) return { key, deleted: false, shared };
    const fullKey = STORAGE_PREFIX + key;
    window.localStorage.removeItem(fullKey);
    return { key, deleted: true, shared };
  },

  async list(
    prefix = '',
    shared = false
  ): Promise<StorageResult<{ keys: string[]; prefix: string }>> {
    if (!isBrowser()) return { keys: [], prefix, shared };
    const fullPrefix = STORAGE_PREFIX + prefix;
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        keys.push(k.substring(STORAGE_PREFIX.length));
      }
    }
    return { keys, prefix, shared };
  },
};
