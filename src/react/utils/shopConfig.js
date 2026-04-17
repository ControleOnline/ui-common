const parseJsonValue = (value, fallback) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return value;
};

export const SHOP_HOME_OPTION_SALES = 'sales';
export const SHOP_HOME_OPTION_FRANCHISE_LOCATOR = 'franchise-locator';

export const SHOP_SALES_PAGE_ENABLED_CONFIG_KEY = 'shop-sales-page-enabled';
export const SHOP_FRANCHISE_LOCATOR_ENABLED_CONFIG_KEY =
  'shop-franchise-locator-enabled';
export const SHOP_PRIMARY_ENTRY_CONFIG_KEY = 'shop-primary-entry';
export const SHOP_BOTTOM_BAR_ENABLED_CONFIG_KEY = 'shop-bottom-bar-enabled';

export const SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY =
  'shop-loyalty-coupons-enabled';
export const SHOP_LOYALTY_PRODUCT_IDS_CONFIG_KEY = 'shop-loyalty-product-ids';
export const SHOP_LOYALTY_REQUIRED_SALES_CONFIG_KEY =
  'shop-loyalty-required-sales';
export const SHOP_LOYALTY_GIFT_PRODUCT_ID_CONFIG_KEY =
  'shop-loyalty-gift-product-id';

export const normalizeShopProductId = value => {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return normalizeShopProductId(value?.['@id'] || value?.id);
  }

  return String(value).replace(/\D+/g, '').trim();
};

export const normalizeBooleanConfig = (value, fallback = false) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const parsed = parseJsonValue(value, value);
  if (typeof parsed === 'boolean') {
    return parsed;
  }
  if (typeof parsed === 'number') {
    return parsed !== 0;
  }
  if (typeof parsed === 'string') {
    const normalizedValue = parsed.trim().toLowerCase();
    if (
      ['1', 'true', 'yes', 'sim', 'on', 'enabled', 'ativo'].includes(
        normalizedValue,
      )
    ) {
      return true;
    }
    if (
      ['0', 'false', 'no', 'nao', 'off', 'disabled', 'inativo'].includes(
        normalizedValue,
      )
    ) {
      return false;
    }
  }

  return fallback;
};

export const normalizeShopProductIds = value => {
  const parsed = parseJsonValue(value, []);
  const source = Array.isArray(parsed)
    ? parsed
    : String(value || '').split(/\r?\n|,/);

  return Array.from(
    new Set(source.map(normalizeShopProductId).filter(Boolean)),
  );
};

export const normalizeShopLoyaltyRequiredSales = (value, fallback = 0) => {
  const parsed = parseJsonValue(value, fallback);
  const normalizedNumber = Number(parsed);

  if (!Number.isFinite(normalizedNumber)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(normalizedNumber));
};

export const getEnabledShopHomeOptions = ({
  salesPageEnabled,
  franchiseLocatorEnabled,
}) => {
  const enabledOptions = [];

  if (salesPageEnabled) {
    enabledOptions.push(SHOP_HOME_OPTION_SALES);
  }

  if (franchiseLocatorEnabled) {
    enabledOptions.push(SHOP_HOME_OPTION_FRANCHISE_LOCATOR);
  }

  return enabledOptions;
};

export const normalizeShopPrimaryEntry = (
  value,
  availability = {},
) => {
  const parsed = parseJsonValue(value, value);
  const normalizedValue = String(parsed || '').trim().toLowerCase();
  const enabledOptions = getEnabledShopHomeOptions(availability);

  if (enabledOptions.includes(normalizedValue)) {
    return normalizedValue;
  }

  return enabledOptions[0] || '';
};
