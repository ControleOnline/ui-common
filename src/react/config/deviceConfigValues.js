import {
  normalizeBooleanConfig,
  SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/shopConfig.js';

export const CIELO_DEVICES = ['quantum', 'ingenico', 'positivo'];
export const SUPPORTED_POS_GATEWAYS = ['cielo', 'infinite-pay'];
export const DEVICE_ALERT_SOUND_ENABLED_KEY = 'notification-sound-enabled';
export const DEVICE_ALERT_SOUND_URL_KEY = 'notification-sound-url';
export const DEVICE_ORDER_VISIBILITY_KEY = 'pos-order-visibility';
export const DEVICE_ORDER_VISIBILITY_DEVICE = 'device';
export const DEVICE_ORDER_VISIBILITY_COMPANY = 'company';
export const POS_DELIVERY_ENABLED_CONFIG_KEY = 'pos-delivery-enabled';
export const DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY =
  'device-runtime-debug-info-enabled';
export const DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY =
  'display-auto-print-product';
export const DISPLAY_ALLOW_PRINTER_CHANGE_CONFIG_KEY =
  'display-allow-printer-change';
export const DISPLAY_SIZE_CONFIG_KEY = 'display-size';
export const DISPLAY_SIDE_BREAK_CONFIG_KEY = 'display-side-break';
export const DISPLAY_SIZE_MIN = 1;
export const DISPLAY_SIZE_MAX = 10;
export const DISPLAY_SIZE_DEFAULT = 5;
export const POS_OPERATION_MODE_CONFIG_KEY = 'pos-operation-mode';
/** Independent of operation mode: whether this device may run local charge/payment. */
export const POS_LOCAL_CHARGE_ENABLED_CONFIG_KEY = 'pos-local-charge-enabled';
// Canonical financial permission already enforced by the API.
export const ORDER_CHARGE_ENABLED_CONFIG_KEY = 'order-charge-enabled';
export const isOrderChargeEnabled = configs => {
  const value = parseConfigsObject(configs)?.[ORDER_CHARGE_ENABLED_CONFIG_KEY];
  return value === true || value === 1 ||
    ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
};
export const POS_PRODUCT_SHOWCASE_CONFIG_KEY = 'pos-product-showcase-id';
export const DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY =
  'android-kiosk-enabled';
export const DEVICE_ANDROID_LAUNCHER_ENABLED_CONFIG_KEY =
  'android-launcher-enabled';
export const POS_AUTO_PRINT_ENABLED_CONFIG_KEY = 'pos-auto-print-enabled';
export const POS_CASH_MANAGEMENT_MODE_CONFIG_KEY =
  'pos-cash-management-mode';
export const POS_CHECK_ORDER_TYPE_CONFIG_KEY = 'check-order-type';
export const POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY =
  'check-order-management-mode';
export const POS_OPERATION_MODE_COUNTER = 'counter';
export const POS_OPERATION_MODE_WAITER = 'waiter';
export const POS_OPERATION_MODE_TOTEM = 'totem';
export const POS_OPERATION_MODE_SINGLE_ITEM = 'single-item';
export const POS_OPERATION_MODE_CASHIER = 'cashier';
export const POS_CHECK_ORDER_TYPE_NONE = 'none';
export const POS_CHECK_ORDER_TYPE_TAB = 'tab';
export const POS_CHECK_ORDER_TYPE_TABLE = 'table';
export const POS_CHECK_ORDER_TYPE_TABLE_TAB = 'table-tab';
export const POS_CHECK_ORDER_TYPE_STAMP = 'stamp';
export const POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE = 'manage';
export const POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY = 'existing-only';
export const POS_OPERATION_MODE_DEFAULT = POS_OPERATION_MODE_COUNTER;
export const POS_PRINT_MODE_ORDER = 'order';
export const POS_PRINT_MODE_FORM = 'form';
export const POS_PRINT_MODE_DEFAULT = POS_PRINT_MODE_ORDER;
export const POS_CASH_MANAGEMENT_MODE_CASH_REGISTER = 'cash-register';
export const POS_CASH_MANAGEMENT_MODE_DAILY = 'daily';
export const POS_CASH_MANAGEMENT_MODE_DEFAULT =
  POS_CASH_MANAGEMENT_MODE_CASH_REGISTER;
export const POS_OPERATION_MODE_OPTIONS = [
  {
    value: POS_OPERATION_MODE_COUNTER,
    translationKey: 'counterService',
    descriptionKey: 'counterServiceDescription',
  },
  {
    value: POS_OPERATION_MODE_WAITER,
    translationKey: 'waiterService',
    descriptionKey: 'waiterServiceDescription',
  },
  {
    value: POS_OPERATION_MODE_TOTEM,
    translationKey: 'selfServiceKiosk',
    descriptionKey: 'selfServiceKioskDescription',
  },
  {
    value: POS_OPERATION_MODE_SINGLE_ITEM,
    translationKey: 'singleItemSale',
    descriptionKey: 'singleItemSaleDescription',
  },
  {
    value: POS_OPERATION_MODE_CASHIER,
    translationKey: 'cashierPOS',
    descriptionKey: 'cashierPOSDescription',
  },
];

export const DEFAULT_DEVICE_CONFIGS = {
  'pos-type': 'full',
  'print-mode': 'order',
  'check-type': 'manual',
  'product-input-type': 'manual',
  'selection-type': 'single',
  sound: '0',
  vibration: '0',
  [DEVICE_ORDER_VISIBILITY_KEY]: DEVICE_ORDER_VISIBILITY_DEVICE,
  [POS_DELIVERY_ENABLED_CONFIG_KEY]: '1',
  [DEVICE_ALERT_SOUND_ENABLED_KEY]: '0',
  [DEVICE_ALERT_SOUND_URL_KEY]: '',
  [DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY]: '0',
  [DEVICE_ANDROID_LAUNCHER_ENABLED_CONFIG_KEY]: '0',
  [DISPLAY_ALLOW_PRINTER_CHANGE_CONFIG_KEY]: '0',
  [DISPLAY_SIZE_CONFIG_KEY]: String(DISPLAY_SIZE_DEFAULT),
  [DISPLAY_SIDE_BREAK_CONFIG_KEY]: '0',
  [POS_CHECK_ORDER_TYPE_CONFIG_KEY]: POS_CHECK_ORDER_TYPE_NONE,
  [POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY]:
    POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
  [POS_OPERATION_MODE_CONFIG_KEY]: POS_OPERATION_MODE_DEFAULT,
  [POS_PRODUCT_SHOWCASE_CONFIG_KEY]: '',
  [POS_AUTO_PRINT_ENABLED_CONFIG_KEY]: '0',
  [POS_CASH_MANAGEMENT_MODE_CONFIG_KEY]: POS_CASH_MANAGEMENT_MODE_DEFAULT,
};

export const isTruthyValue = value =>
  value === true || value === '1' || value === 1 || value === 'true';

export const isMissingConfigValue = value =>
  value === undefined || value === null || value === '';

export const parseConfigsObject = configs => {
  if (!configs) return {};

  if (typeof configs === 'string') {
    try {
      const parsed = JSON.parse(configs);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof configs === 'object' ? {...configs} : {};
};

export const normalizeDisplaySize = value => {
  const normalizedValue = String(value ?? '').trim();

  if (normalizedValue === '') {
    return DISPLAY_SIZE_DEFAULT;
  }

  const numericValue = Number(normalizedValue);

  if (!Number.isFinite(numericValue)) {
    return DISPLAY_SIZE_DEFAULT;
  }

  return Math.min(
    DISPLAY_SIZE_MAX,
    Math.max(DISPLAY_SIZE_MIN, Math.round(numericValue)),
  );
};

export const resolveDisplaySize = configs =>
  normalizeDisplaySize(
    parseConfigsObject(configs)?.[DISPLAY_SIZE_CONFIG_KEY],
  );

export const isDisplaySideBreakEnabled = configs =>
  isTruthyValue(
    parseConfigsObject(configs)?.[DISPLAY_SIDE_BREAK_CONFIG_KEY],
  );

export const normalizePosOperationMode = value => {
  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]/g, '-');

  if (
    [
      POS_OPERATION_MODE_COUNTER,
      'balcao',
      'counter-service',
      'front-counter',
    ].includes(normalizedValue)
  ) {
    return POS_OPERATION_MODE_COUNTER;
  }

  if (
    [
      POS_OPERATION_MODE_WAITER,
      'garcon',
      'garcom',
      'table-service',
    ].includes(normalizedValue)
  ) {
    return POS_OPERATION_MODE_WAITER;
  }

  if (
    [
      POS_OPERATION_MODE_TOTEM,
    ].includes(normalizedValue)
  ) {
    return POS_OPERATION_MODE_TOTEM;
  }

  if (
    [
      POS_OPERATION_MODE_SINGLE_ITEM,
      'single-sale',
      'single-item-sale',
      'sale-unit',
      'sale-single',
      'venda-unitaria',
      'venda-unica',
      'item-unico',
      'unit-sale',
      'unitary-sale',
    ].includes(normalizedValue)
  ) {
    return POS_OPERATION_MODE_SINGLE_ITEM;
  }

  if (
    [
      POS_OPERATION_MODE_CASHIER,
      'pdv',
      'pos',
      'checkout',
      'cashier-pos',
    ].includes(normalizedValue)
  ) {
    return POS_OPERATION_MODE_CASHIER;
  }

  return '';
};
