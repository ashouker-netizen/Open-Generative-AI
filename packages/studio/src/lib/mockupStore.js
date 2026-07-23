const DB_NAME = 'tinydream';
const STORE = 'mockups';
const IMAGES = 'images';
const VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(IMAGES)) db.createObjectStore(IMAGES);
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function put(store, key, value) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  }));
}

function get(store, key) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).get(key);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  }));
}

export async function saveMockups(entryId, mockups) { return put(STORE, entryId, mockups); }
export async function loadMockups(entryId) { return (await get(STORE, entryId)) || []; }
export async function saveImage(entryId, dataUrl) { return put(IMAGES, entryId, dataUrl); }
export async function loadImage(entryId) { return (await get(IMAGES, entryId)) || ''; }
