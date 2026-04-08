import {
  appendScreenMetrics,
  hasScreenMetricsChanges,
} from '@controleonline/ui-common/src/react/utils/screenMetrics';

export const CIELO_DEVICES = ['quantum', 'ingenico', 'positivo'];

export const DEFAULT_DEVICE_CONFIGS = {
  'pos-type': 'full',
  'print-mode': 'order',
  'check-type': 'manual',
  'product-input-type': 'manual',
  'selection-type': 'single',
  sound: '0',
  vibration: '0',
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
