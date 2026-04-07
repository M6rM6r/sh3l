// ================================================================
// IndexedDB wrapper — structured local persistence
// ================================================================

const DB_NAME    = 'ygy_db';
const DB_VERSION = 2;

type StoreDefinition = {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: { name: string; keyPath: string; unique?: boolean }[];
};

const STORE_DEFS: StoreDefinition[] = [
  {
    name: 'game_sessions',
    keyPath: 'id',
    indexes: [
      { name: 'by_date',      keyPath: 'timestamp' },
      { name: 'by_game_type', keyPath: 'game_type'  },
    ],
  },
  { name: 'sync_queue',  keyPath: 'id' },
  { name: 'user_prefs',  keyPath: 'key' },
  { name: 'leaderboard', keyPath: 'id' },
];

class IDBWrapper {
  private _db: IDBDatabase | null = null;

  private _open(): Promise<IDBDatabase> {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        for (const def of STORE_DEFS) {
          if (!db.objectStoreNames.contains(def.name)) {
            const os = db.createObjectStore(def.name, {
              keyPath: def.keyPath,
              autoIncrement: def.autoIncrement ?? false,
            });
            def.indexes?.forEach(idx =>
              os.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false })
            );
          }
        }
      };
      req.onsuccess = (e) => {
        this._db = (e.target as IDBOpenDBRequest).result;
        resolve(this._db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async put<T extends Record<string, unknown>>(store: string, item: T): Promise<void> {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  async get<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror   = () => reject(req.error);
    });
  }

  async getAll<T>(
    store: string,
    options?: { index?: string; range?: IDBKeyRange }
  ): Promise<T[]> {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const os = db.transaction(store, 'readonly').objectStore(store);
      const src = options?.index ? os.index(options.index) : os;
      const req = src.getAll(options?.range);
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror   = () => reject(req.error);
    });
  }

  async delete(store: string, key: IDBValidKey): Promise<void> {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  async count(store: string): Promise<number> {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async clear(store: string): Promise<void> {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }
}

export const idb = new IDBWrapper();
