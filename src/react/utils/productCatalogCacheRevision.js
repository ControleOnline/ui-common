import eventBus from '../components/EventBus';

const key = 'product-catalog-cache-revision';
let revision = '0';
let sequence = 0;
export const getProductCatalogCacheRevision = () => {
  try { return localStorage.getItem(key) || revision; } catch { return revision; }
};
export const invalidateProductCatalogCache = () => {
  revision = `${Date.now()}:${++sequence}`;
  try { localStorage.setItem(key, revision); } catch { /* In-memory invalidation still applies. */ }
  eventBus.emit('product-catalog-cache:cleared');
};
