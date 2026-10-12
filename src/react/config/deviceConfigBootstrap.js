import {appendScreenMetrics, hasScreenMetricsChanges} from '@controleonline/ui-common/src/react/utils/screenMetrics.js';
import {normalizeBooleanConfig, SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY} from '@controleonline/ui-common/src/react/utils/shopConfig.js';
import {
  CIELO_DEVICES,
  SUPPORTED_POS_GATEWAYS,
  DEVICE_ORDER_VISIBILITY_KEY,
  DEVICE_ORDER_VISIBILITY_DEVICE,
  DEVICE_ORDER_VISIBILITY_COMPANY,
  POS_DELIVERY_ENABLED_CONFIG_KEY,
  DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY,
  DISPLAY_ALLOW_PRINTER_CHANGE_CONFIG_KEY,
  POS_OPERATION_MODE_CONFIG_KEY,
  POS_LOCAL_CHARGE_ENABLED_CONFIG_KEY,
  ORDER_CHARGE_ENABLED_CONFIG_KEY,
  isOrderChargeEnabled,
  DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY,
  DEVICE_ANDROID_LAUNCHER_ENABLED_CONFIG_KEY,
  POS_AUTO_PRINT_ENABLED_CONFIG_KEY,
  POS_CASH_MANAGEMENT_MODE_CONFIG_KEY,
  POS_CHECK_ORDER_TYPE_CONFIG_KEY,
  POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY,
  POS_OPERATION_MODE_COUNTER,
  POS_OPERATION_MODE_WAITER,
  POS_OPERATION_MODE_TOTEM,
  POS_OPERATION_MODE_SINGLE_ITEM,
  POS_CHECK_ORDER_TYPE_NONE,
  POS_CHECK_ORDER_TYPE_TAB,
  POS_CHECK_ORDER_TYPE_TABLE,
  POS_CHECK_ORDER_TYPE_TABLE_TAB,
  POS_CHECK_ORDER_TYPE_STAMP,
  POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
  POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY,
  POS_PRINT_MODE_FORM,
  POS_PRINT_MODE_DEFAULT,
  POS_CASH_MANAGEMENT_MODE_CASH_REGISTER,
  POS_CASH_MANAGEMENT_MODE_DAILY,
  POS_CASH_MANAGEMENT_MODE_DEFAULT,
  POS_OPERATION_MODE_OPTIONS,
  DEFAULT_DEVICE_CONFIGS,
  isTruthyValue,
  isMissingConfigValue,
  parseConfigsObject,
  normalizePosOperationMode,
} from './deviceConfigValues';
export * from './deviceConfigValues';

export const resolvePosOperationMode = configs =>
  normalizePosOperationMode(
    parseConfigsObject(configs)?.[POS_OPERATION_MODE_CONFIG_KEY],
  );

export const normalizePosCheckOrderType = value => {
  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]/g, '-');

  if (
    [
      POS_CHECK_ORDER_TYPE_TAB,
      'tab',
    ].includes(normalizedValue)
  ) {
    return POS_CHECK_ORDER_TYPE_TAB;
  }

  if (
    [
      POS_CHECK_ORDER_TYPE_TABLE,
      'table',
    ].includes(normalizedValue)
  ) {
    return POS_CHECK_ORDER_TYPE_TABLE;
  }

  if (normalizedValue === POS_CHECK_ORDER_TYPE_TABLE_TAB) {
    return POS_CHECK_ORDER_TYPE_TABLE_TAB;
  }

  if (
    [
      POS_CHECK_ORDER_TYPE_STAMP,
      'stamp',
      'carimbo',
    ].includes(normalizedValue)
  ) {
    return POS_CHECK_ORDER_TYPE_STAMP;
  }

  return POS_CHECK_ORDER_TYPE_NONE;
};

export const resolvePosCheckOrderType = configs =>
  normalizePosCheckOrderType(
    parseConfigsObject(configs)?.[POS_CHECK_ORDER_TYPE_CONFIG_KEY],
  );

export const resolvePosCheckOrderTypeForShop = (
  deviceConfigs,
  shopConfigs,
) => {
  const resolvedType = resolvePosCheckOrderType(deviceConfigs);
  const parsedShopConfigs = parseConfigsObject(shopConfigs);
  const hasLoyaltyCouponsEnabledKey = Object.prototype.hasOwnProperty.call(
    parsedShopConfigs,
    SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
  );

  if (
    hasLoyaltyCouponsEnabledKey &&
    resolvedType === POS_CHECK_ORDER_TYPE_STAMP &&
    !normalizeBooleanConfig(
      parsedShopConfigs?.[SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY],
    )
  ) {
    return POS_CHECK_ORDER_TYPE_NONE;
  }

  return resolvedType;
};

// A device mode is not an Order.orderType. The current entry starts at the
// table; the waiter navigation can then resolve a concrete tab under that table.
export const resolvePosCheckOrderEntryTypeForShop = (deviceConfigs, shopConfigs) => {
  const type = resolvePosCheckOrderTypeForShop(deviceConfigs, shopConfigs);
  return type === POS_CHECK_ORDER_TYPE_TABLE_TAB ? POS_CHECK_ORDER_TYPE_TABLE : type;
};

export const resolvePosCheckOrderTypesForShop = (deviceConfigs, shopConfigs) => {
  const type = resolvePosCheckOrderTypeForShop(deviceConfigs, shopConfigs);
  if (type === POS_CHECK_ORDER_TYPE_TABLE_TAB) {
    return [POS_CHECK_ORDER_TYPE_TABLE, POS_CHECK_ORDER_TYPE_TAB];
  }
  return type === POS_CHECK_ORDER_TYPE_NONE ? [] : [type];
};

export const normalizePosCheckOrderManagementMode = value => {
  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]/g, '-');

  if (
    [
      POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY,
      'existing',
      'existing-open',
      'opened-only',
      'already-open',
      'use-open-only',
      'use-existing-only',
    ].includes(normalizedValue)
  ) {
    return POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY;
  }

  if (
    [
      POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
      'open-close',
      'open-and-close',
      'full',
      'manage-open-close',
    ].includes(normalizedValue)
  ) {
    return POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE;
  }

  return POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE;
};

export const resolvePosCheckOrderManagementMode = configs =>
  normalizePosCheckOrderManagementMode(
    parseConfigsObject(configs)?.[POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY],
  );

export const canManagePosCheckOrders = configs =>
  resolvePosCheckOrderManagementMode(configs) ===
  POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE;

export const usesPosCheckLinkedOrder = configs =>
  resolvePosCheckOrderType(configs) !== POS_CHECK_ORDER_TYPE_NONE;

export const isPosTotemMode = configs =>
  resolvePosOperationMode(configs) === POS_OPERATION_MODE_TOTEM;

export const isPosKioskMode = isPosTotemMode;

export const isAndroidKioskEnabled = configs => {
  const parsedConfigs = parseConfigsObject(configs);
  const storedValue = parsedConfigs?.[DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY];

  return isTruthyValue(storedValue);
};

export const isAndroidLauncherEnabled = configs => {
  const parsedConfigs = parseConfigsObject(configs);
  const storedValue =
    parsedConfigs?.[DEVICE_ANDROID_LAUNCHER_ENABLED_CONFIG_KEY];

  return isTruthyValue(storedValue);
};

export const isPosSingleItemMode = configs =>
  resolvePosOperationMode(configs) === POS_OPERATION_MODE_SINGLE_ITEM;

export const shouldEnableAndroidKioskMode = ({
  appType,
  configs,
  platform,
}) =>
  String(appType || '').trim().toUpperCase() === 'POS' &&
  platform === 'android' &&
  isAndroidKioskEnabled(configs);

export const shouldEnableAndroidLauncherMode = ({
  appType,
  configs,
  platform,
}) =>
  String(appType || '').trim().toUpperCase() === 'POS' &&
  platform === 'android' &&
  isAndroidLauncherEnabled(configs);

export const isPosCounterMode = configs =>
  resolvePosOperationMode(configs) === POS_OPERATION_MODE_COUNTER;

export const isPosSelfServiceMode = configs =>
  isPosTotemMode(configs) || isPosCounterMode(configs);

export const resolvePosPrintMode = configs => {
  const value = String(parseConfigsObject(configs)?.['print-mode'] || '')
    .trim()
    .toLowerCase();

  return value === POS_PRINT_MODE_FORM
    ? POS_PRINT_MODE_FORM
    : POS_PRINT_MODE_DEFAULT;
};

export const isPosAutoPrintEnabled = configs => {
  const parsedConfigs = parseConfigsObject(configs);
  const storedValue = parsedConfigs?.[POS_AUTO_PRINT_ENABLED_CONFIG_KEY];

  if (
    storedValue === undefined ||
    storedValue === null ||
    String(storedValue).trim() === ''
  ) {
    return !isPosCounterMode(parsedConfigs);
  }

  return isTruthyValue(storedValue);
};

export const resolvePosCashManagementMode = configs => {
  const normalizedValue = String(
    parseConfigsObject(configs)?.[POS_CASH_MANAGEMENT_MODE_CONFIG_KEY] || '',
  )
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]/g, '-');

  if (
    normalizedValue === POS_CASH_MANAGEMENT_MODE_DAILY
  ) {
    return POS_CASH_MANAGEMENT_MODE_DAILY;
  }

  if (
    normalizedValue === POS_CASH_MANAGEMENT_MODE_CASH_REGISTER
  ) {
    return POS_CASH_MANAGEMENT_MODE_CASH_REGISTER;
  }

  return POS_CASH_MANAGEMENT_MODE_DEFAULT;
};

export const shouldUsePosCashRegisterLifecycle = configs => {
  if (isPosTotemMode(configs)) {
    return false;
  }

  if (isPosCounterMode(configs)) {
    return (
      resolvePosCashManagementMode(configs) ===
      POS_CASH_MANAGEMENT_MODE_CASH_REGISTER
    );
  }

  return true;
};

export const isPosCashRegisterOpen = configs => {
  if (!shouldUsePosCashRegisterLifecycle(configs)) {
    return true;
  }

  const parsedConfigs = parseConfigsObject(configs);

  if (Object.keys(parsedConfigs).length === 0) {
    return true;
  }

  const closedValue = parsedConfigs?.['cash-wallet-closed-id'];

  if (closedValue === undefined || closedValue === null || closedValue === '') {
    return true;
  }

  return closedValue === 0 || closedValue === '0';
};

export const isPosCashRegisterClosed = configs =>
  !isPosCashRegisterOpen(configs);

export const normalizePosLocalChargeEnabled = (value, operationMode) => {
  if (!isMissingConfigValue(value)) {
    return isTruthyValue(value);
  }

  const mode = normalizePosOperationMode(operationMode);
  // Waiter defaults to no local charge; all other modes keep legacy charge capability.
  return mode !== POS_OPERATION_MODE_WAITER;
};

/**
 * Whether the device is allowed to execute local payment/charge.
 * Independent of pos-operation-mode and pay_before_production.
 * Missing config preserves legacy: waiter=false, other modes=true.
 */
export const isPosLocalChargeEnabled = configs => {
  const parsed = parseConfigsObject(configs);
  return normalizePosLocalChargeEnabled(
    parsed?.[POS_LOCAL_CHARGE_ENABLED_CONFIG_KEY],
    parsed?.[POS_OPERATION_MODE_CONFIG_KEY],
  );
};

// Entry-point visibility only. The consultation and invoice API enforce capability.
export const isPosChargeEntryEnabled = configs => {
  const parsed = parseConfigsObject(configs);
  return Object.prototype.hasOwnProperty.call(parsed, ORDER_CHARGE_ENABLED_CONFIG_KEY)
    ? isOrderChargeEnabled(parsed)
    : isPosLocalChargeEnabled(parsed);
};

export const getPosOperationModeOption = mode => {

  const normalizedMode = normalizePosOperationMode(mode);

  return POS_OPERATION_MODE_OPTIONS.find(
    option => option.value === normalizedMode,
  );
};

export const resolveDeviceOrderVisibility = configs => {
  const parsedConfigs = parseConfigsObject(configs);
  const value = String(parsedConfigs?.[DEVICE_ORDER_VISIBILITY_KEY] || '')
    .trim()
    .toLowerCase();

  return value === DEVICE_ORDER_VISIBILITY_COMPANY
    ? DEVICE_ORDER_VISIBILITY_COMPANY
    : DEVICE_ORDER_VISIBILITY_DEVICE;
};

export const canDeviceViewCompanyOrders = configs =>
  resolveDeviceOrderVisibility(configs) === DEVICE_ORDER_VISIBILITY_COMPANY;

export const isPosDeliveryEnabled = configs => {
  const parsedConfigs = parseConfigsObject(configs);
  const storedValue = parsedConfigs?.[POS_DELIVERY_ENABLED_CONFIG_KEY];

  if (isMissingConfigValue(storedValue)) {
    return true;
  }

  return isTruthyValue(storedValue);
};

export const isDeviceRuntimeDebugInfoEnabled = configs =>
  isTruthyValue(
    parseConfigsObject(configs)?.[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY],
  );

export const canDisplayChangePrinter = configs =>
  isTruthyValue(
    parseConfigsObject(configs)?.[DISPLAY_ALLOW_PRINTER_CHANGE_CONFIG_KEY],
  );

export const resolveDefaultGateway = deviceInfo => {
  const manufacturer = String(deviceInfo?.manufacturer || '').toLowerCase();
  const isEmulator = isTruthyValue(deviceInfo?.isEmulator);

  return CIELO_DEVICES.includes(manufacturer) && !isEmulator
    ? 'cielo'
    : 'infinite-pay';
};

export const normalizePersistedGateway = value => {
  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]/g, '-');

  return SUPPORTED_POS_GATEWAYS.includes(normalizedValue)
    ? normalizedValue
    : '';
};

export const buildDefaultDeviceConfigs = ({configs, appVersion, deviceInfo}) => {
  let nextConfigs = parseConfigsObject(configs);
  let needsUpdate = false;

  const metricsConfigs = appendScreenMetrics(nextConfigs);
  if (hasScreenMetricsChanges(nextConfigs, metricsConfigs)) {
    nextConfigs = metricsConfigs;
    needsUpdate = true;
  }

  Object.entries(DEFAULT_DEVICE_CONFIGS).forEach(([key, defaultValue]) => {
    if (isMissingConfigValue(nextConfigs[key])) {
      nextConfigs[key] = defaultValue;
      needsUpdate = true;
    }
  });

  if (isMissingConfigValue(nextConfigs['config-version'])) {
    nextConfigs['config-version'] = appVersion || deviceInfo?.appVersion || '1.0.0';
    needsUpdate = true;
  }

  if (isMissingConfigValue(nextConfigs['pos-gateway'])) {
    nextConfigs['pos-gateway'] = resolveDefaultGateway(deviceInfo);
    needsUpdate = true;
  }

  return {nextConfigs, needsUpdate};
};

export const buildProviderManagedDeviceConfigs = ({
  configs,
  appVersion,
  deviceInfo,
}) => {
  let nextConfigs = parseConfigsObject(configs);
  let needsUpdate = false;

  const metricsConfigs = appendScreenMetrics(nextConfigs);
  if (hasScreenMetricsChanges(nextConfigs, metricsConfigs)) {
    nextConfigs = metricsConfigs;
    needsUpdate = true;
  }

  const nextVersion = appVersion || deviceInfo?.appVersion || '1.0.0';
  if (nextVersion && nextConfigs['config-version'] !== nextVersion) {
    nextConfigs['config-version'] = nextVersion;
    needsUpdate = true;
  }

  const persistedGateway = normalizePersistedGateway(nextConfigs['pos-gateway']);
  const nextGateway = persistedGateway || resolveDefaultGateway(deviceInfo);
  if (nextGateway && nextConfigs['pos-gateway'] !== nextGateway) {
    nextConfigs['pos-gateway'] = nextGateway;
    needsUpdate = true;
  }

  return {nextConfigs, needsUpdate};
};
