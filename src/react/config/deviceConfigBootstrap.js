import {
  appendScreenMetrics,
  hasScreenMetricsChanges,
} from '@controleonline/ui-common/src/react/utils/screenMetrics';

export const CIELO_DEVICES = ['quantum', 'ingenico', 'positivo'];
export const DEVICE_ALERT_SOUND_ENABLED_KEY = 'notification-sound-enabled';
export const DEVICE_ALERT_SOUND_URL_KEY = 'notification-sound-url';
export const DEVICE_ORDER_VISIBILITY_KEY = 'pos-order-visibility';
export const DEVICE_ORDER_VISIBILITY_DEVICE = 'device';
export const DEVICE_ORDER_VISIBILITY_COMPANY = 'company';
export const DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY =
  'device-runtime-debug-info-enabled';
export const DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY =
  'display-auto-print-product';
export const DISPLAY_ALLOW_PRINTER_CHANGE_CONFIG_KEY =
  'display-allow-printer-change';
export const POS_OPERATION_MODE_CONFIG_KEY = 'pos-operation-mode';
export const POS_AUTO_PRINT_ENABLED_CONFIG_KEY = 'pos-auto-print-enabled';
export const POS_CASH_MANAGEMENT_MODE_CONFIG_KEY =
  'pos-cash-management-mode';
export const POS_OPERATION_MODE_COUNTER = 'counter';
export const POS_OPERATION_MODE_WAITER = 'waiter';
export const POS_OPERATION_MODE_KIOSK = 'kiosk';
export const POS_OPERATION_MODE_CASHIER = 'cashier';
export const POS_OPERATION_MODE_DEFAULT = POS_OPERATION_MODE_CASHIER;
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
    value: POS_OPERATION_MODE_KIOSK,
    translationKey: 'selfServiceKiosk',
    descriptionKey: 'selfServiceKioskDescription',
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
  [DEVICE_ALERT_SOUND_ENABLED_KEY]: '0',
  [DEVICE_ALERT_SOUND_URL_KEY]: '',
  [DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY]: '0',
  [DISPLAY_ALLOW_PRINTER_CHANGE_CONFIG_KEY]: '0',
  [POS_OPERATION_MODE_CONFIG_KEY]: POS_OPERATION_MODE_DEFAULT,
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
      POS_OPERATION_MODE_KIOSK,
      'totem',
      'self-service',
      'self-service-kiosk',
    ].includes(normalizedValue)
  ) {
    return POS_OPERATION_MODE_KIOSK;
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

  return POS_OPERATION_MODE_DEFAULT;
};

export const resolvePosOperationMode = configs =>
  normalizePosOperationMode(
    parseConfigsObject(configs)?.[POS_OPERATION_MODE_CONFIG_KEY],
  );

export const isPosKioskMode = configs =>
  resolvePosOperationMode(configs) === POS_OPERATION_MODE_KIOSK;

export const isPosCounterMode = configs =>
  resolvePosOperationMode(configs) === POS_OPERATION_MODE_COUNTER;

export const isPosSelfServiceMode = configs =>
  isPosKioskMode(configs) || isPosCounterMode(configs);

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
    [
      POS_CASH_MANAGEMENT_MODE_DAILY,
      'diario',
      'daily-close',
      'daily-closing',
    ].includes(normalizedValue)
  ) {
    return POS_CASH_MANAGEMENT_MODE_DAILY;
  }

  if (
    [
      POS_CASH_MANAGEMENT_MODE_CASH_REGISTER,
      'abertura-fechamento',
      'open-close',
      'open-close-cash-register',
    ].includes(normalizedValue)
  ) {
    return POS_CASH_MANAGEMENT_MODE_CASH_REGISTER;
  }

  return POS_CASH_MANAGEMENT_MODE_DEFAULT;
};

export const shouldUsePosCashRegisterLifecycle = configs => {
  if (isPosKioskMode(configs)) {
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

  const closedValue =
    parseConfigsObject(configs)?.['cash-wallet-closed-id'];

  return closedValue === 0 || closedValue === '0';
};

export const isPosCashRegisterClosed = configs =>
  !isPosCashRegisterOpen(configs);

export const getPosOperationModeOption = mode => {
  const normalizedMode = normalizePosOperationMode(mode);

  return (
    POS_OPERATION_MODE_OPTIONS.find(option => option.value === normalizedMode) ||
    POS_OPERATION_MODE_OPTIONS.find(
      option => option.value === POS_OPERATION_MODE_DEFAULT,
    )
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

  const nextGateway = resolveDefaultGateway(deviceInfo);
  if (nextGateway && nextConfigs['pos-gateway'] !== nextGateway) {
    nextConfigs['pos-gateway'] = nextGateway;
    needsUpdate = true;
  }

  return {nextConfigs, needsUpdate};
};
