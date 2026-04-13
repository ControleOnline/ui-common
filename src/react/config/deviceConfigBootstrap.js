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
    } catch (e) {
      return {};
    }
  }

  return typeof configs === 'object' ? {...configs} : {};
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
