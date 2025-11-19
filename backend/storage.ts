const storage = new Map<string, string>();

export const kv = {
  async get(key: string): Promise<string | null> {
    console.log(`[Storage] GET ${key}`);
    return storage.get(key) || null;
  },

  async set(key: string, value: string): Promise<void> {
    console.log(`[Storage] SET ${key}`);
    storage.set(key, value);
  },

  async delete(key: string): Promise<void> {
    console.log(`[Storage] DELETE ${key}`);
    storage.delete(key);
  },

  async has(key: string): Promise<boolean> {
    const exists = storage.has(key);
    console.log(`[Storage] HAS ${key}: ${exists}`);
    return exists;
  },

  async keys(): Promise<string[]> {
    const allKeys = Array.from(storage.keys());
    console.log(`[Storage] KEYS: ${allKeys.length} keys`);
    return allKeys;
  },

  async clear(): Promise<void> {
    console.log(`[Storage] CLEAR - removing ${storage.size} keys`);
    storage.clear();
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[Storage] Error parsing JSON for key ${key}:`, error);
      return null;
    }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  },
};
