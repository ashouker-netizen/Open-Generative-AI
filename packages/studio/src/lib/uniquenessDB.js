const STORAGE_KEY = 'etsy_pipeline_history';

export function getAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function hasBeenUsed(subject, theme) {
  const history = getAll();
  return history.some(e => e.subject === subject && e.theme === theme);
}

export function save(entry) {
  const history = getAll();
  // ponytail: strip imageUrl — base64 blows localStorage quota; stored in IndexedDB separately
  const { imageUrl, ...rest } = entry;
  history.push({ ...rest, id: crypto.randomUUID() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function getCount() {
  return getAll().length;
}

export function getRecentConcepts(n = 20) {
  return getAll()
    .slice(-n)
    .map(e => ({ subject: e.subject, theme: e.theme, keyword: e.keyword || '' }));
}
