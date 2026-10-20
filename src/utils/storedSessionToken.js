// Quasar LocalStorage serializes objects with this marker; plain JSON is also used.
const OBJECT_PREFIX = '__q_objt|';

const readStoredSessionToken = (storage = typeof localStorage === 'undefined' ? null : localStorage) => {
  try {
    const raw = storage?.getItem?.('session');
    if (!raw) return '';
    const json = typeof raw === 'string' && raw.startsWith(OBJECT_PREFIX)
      ? raw.slice(OBJECT_PREFIX.length)
      : raw;
    const session = JSON.parse(json);
    return session?.token || session?.api_key || '';
  } catch {
    return '';
  }
};

module.exports = {readStoredSessionToken};
