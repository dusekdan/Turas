// Thin IndexedDB wrapper. Stores:
//   kv       — key/value (profile, earned badges, misc)
//   drinks   — user drink definitions with baseline schedule
//   events   — consumption events (slips / logged drinks)
//   triggers — craving & slip reflections
//   checkins — daily reviews
//   images   — inspirational images (Blobs or URLs)

const DB_NAME = 'turas';
const DB_VERSION = 1;
export const STORES = ['kv', 'drinks', 'events', 'triggers', 'checkins', 'images'];

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      for (const s of ['drinks', 'events', 'triggers', 'checkins', 'images']) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const result = fn(t.objectStore(store));
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function kvGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('kv').objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function kvSet(key, value) {
  const db = await openDB();
  return tx(db, 'kv', 'readwrite', (s) => s.put(value, key));
}

export async function getAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function put(store, obj) {
  if (!obj.id) obj.id = newId();
  const db = await openDB();
  await tx(db, store, 'readwrite', (s) => s.put(obj));
  return obj;
}

export async function remove(store, id) {
  const db = await openDB();
  return tx(db, store, 'readwrite', (s) => s.delete(id));
}

export async function clearStore(store) {
  const db = await openDB();
  return tx(db, store, 'readwrite', (s) => s.clear());
}

export async function wipeAll() {
  for (const s of STORES) await clearStore(s);
}

export function newId() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ----- App-level helpers ----- */

export async function getProfile() {
  return (await kvGet('profile')) || null;
}

export async function saveProfile(profile) {
  await kvSet('profile', profile);
  return profile;
}

// Ask the browser not to evict our data under storage pressure.
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch { /* best effort */ }
  return false;
}
