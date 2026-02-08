const DB_NAME = "fit-db";
const DB_VERSION = 2;
const EXERCISES_STORE = "exercises";
const META_STORE = "meta";
const GIFS_STORE = "gifs";

let dbPromise;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(EXERCISES_STORE)) {
        db.createObjectStore(EXERCISES_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(GIFS_STORE)) {
        db.createObjectStore(GIFS_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function withStore(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function setMeta(key, value) {
  return withStore(META_STORE, "readwrite", (store) =>
    store.put({ key, value })
  );
}

export async function getMeta(key) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDb();
      const tx = db.transaction(META_STORE, "readonly");
      const store = tx.objectStore(META_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function upsertExercises(list) {
  return withStore(EXERCISES_STORE, "readwrite", (store) => {
    list.forEach((item) => store.put(item));
  });
}

export async function getAllExercises() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDb();
      const tx = db.transaction(EXERCISES_STORE, "readonly");
      const store = tx.objectStore(EXERCISES_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function countExercises() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDb();
      const tx = db.transaction(EXERCISES_STORE, "readonly");
      const store = tx.objectStore(EXERCISES_STORE);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function getGif(id) {
  if (!id) return null;
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDb();
      const tx = db.transaction(GIFS_STORE, "readonly");
      const store = tx.objectStore(GIFS_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function upsertGif(id, blob) {
  if (!id || !blob) return;
  return withStore(GIFS_STORE, "readwrite", (store) =>
    store.put({ id, blob, updatedAt: Date.now() })
  );
}

export async function countGifs() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDb();
      const tx = db.transaction(GIFS_STORE, "readonly");
      const store = tx.objectStore(GIFS_STORE);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function getAllGifs() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDb();
      const tx = db.transaction(GIFS_STORE, "readonly");
      const store = tx.objectStore(GIFS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}
