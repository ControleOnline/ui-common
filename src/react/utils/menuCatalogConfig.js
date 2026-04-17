const normalizeId = value => String(value || '').replace(/\D+/g, '').trim();

export const MENU_CATALOG_MODEL_CONFIG_KEY = 'menu-catalog-model';

export const normalizeModelReference = value => {
  const normalizedId = normalizeId(value);
  return normalizedId ? `/models/${normalizedId}` : '';
};
