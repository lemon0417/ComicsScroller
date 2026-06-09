import {
  CHAPTERS_STORE,
  HISTORY_STORE,
  LIBRARY_DB_NAME,
  LIBRARY_DB_VERSION,
  META_STORE,
  READS_STORE,
  SERIES_STORE,
  SUBSCRIPTIONS_STORE,
  UPDATES_STORE,
} from "./schema";

export type LibraryMetaRow = {
  key: string;
  value: {
    initialized?: boolean;
    version?: string;
    schemaVersion?: number;
    dbSchemaVersion?: number;
    updatedAt?: number;
  };
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

function ensureIndexedDb() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this context.");
  }
}

function ensureStoreIndex(
  store: IDBObjectStore | undefined,
  indexName: string,
  keyPath: string | string[],
) {
  if (!store || store.indexNames.contains(indexName)) {
    return;
  }
  store.createIndex(indexName, keyPath, { unique: false });
}

export function openLibraryDb() {
  if (!dbPromise) {
    ensureIndexedDb();
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(LIBRARY_DB_NAME, LIBRARY_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(SERIES_STORE)) {
          db.createObjectStore(SERIES_STORE, { keyPath: "seriesKey" });
        }
        if (!db.objectStoreNames.contains(CHAPTERS_STORE)) {
          const chapters = db.createObjectStore(CHAPTERS_STORE, {
            keyPath: ["seriesKey", "chapterID"],
          });
          chapters.createIndex("seriesKey", "seriesKey", { unique: false });
        }
        if (!db.objectStoreNames.contains(READS_STORE)) {
          const reads = db.createObjectStore(READS_STORE, {
            keyPath: ["seriesKey", "chapterID"],
          });
          reads.createIndex("seriesKey", "seriesKey", { unique: false });
        }
        if (!db.objectStoreNames.contains(SUBSCRIPTIONS_STORE)) {
          const subscriptions = db.createObjectStore(SUBSCRIPTIONS_STORE, {
            keyPath: "seriesKey",
          });
          subscriptions.createIndex("position", "position", { unique: false });
          subscriptions.createIndex("checkedAtPosition", ["checkedAt", "position"], {
            unique: false,
          });
        } else {
          const subscriptions =
            request.transaction?.objectStore(SUBSCRIPTIONS_STORE);
          ensureStoreIndex(subscriptions, "position", "position");
          ensureStoreIndex(subscriptions, "checkedAtPosition", ["checkedAt", "position"]);
        }
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          const history = db.createObjectStore(HISTORY_STORE, {
            keyPath: "seriesKey",
          });
          history.createIndex("position", "position", { unique: false });
        } else {
          const history = request.transaction?.objectStore(HISTORY_STORE);
          ensureStoreIndex(history, "position", "position");
        }
        if (!db.objectStoreNames.contains(UPDATES_STORE)) {
          const updates = db.createObjectStore(UPDATES_STORE, {
            keyPath: ["seriesKey", "chapterID"],
          });
          updates.createIndex("position", "position", { unique: false });
        } else {
          const updates = request.transaction?.objectStore(UPDATES_STORE);
          ensureStoreIndex(updates, "position", "position");
          if (updates?.indexNames.contains("createdAt")) {
            updates.deleteIndex("createdAt");
          }
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("Library IndexedDB upgrade was blocked."));
    });
  }
  return dbPromise;
}

export async function readLibraryMeta(key: string) {
  const db = await openLibraryDb();
  const transaction = db.transaction([META_STORE], "readonly");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(META_STORE);
  const row = await requestToPromise<LibraryMetaRow | undefined>(store.get(key));
  await done;
  return row;
}
