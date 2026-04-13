import {Platform} from 'react-native';
import {buildScreenMetrics} from '@controleonline/ui-common/src/react/utils/screenMetrics';

const APP_TYPE_DEVICE_MAP = {
  POS: 'PDV',
  PPC: 'DISPLAY',
  DISPLAY: 'DISPLAY',
  KDS: 'KDS',
  PRINT: 'PRINT',
  PRINTER: 'PRINT',
  TOTEM: 'DISPLAY',
};

export const WEB_DEVICE_INSTANCE_STORAGE_KEY = 'web-device-instance-id';

const safeTrim = value => String(value || '').trim();

const safeStringify = value => {
  try {
    return JSON.stringify(value || {});
  } catch (e) {
    return '{}';
  }
};

const createWebDeviceInstanceId = () => {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.crypto &&
      typeof globalThis.crypto.randomUUID === 'function'
    ) {
      return String(globalThis.crypto.randomUUID()).replace(/[^a-zA-Z0-9-]/g, '');
    }
  } catch (e) {
    // continua para o fallback abaixo
  }

  return `web-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const getOrCreateWebDeviceInstanceId = () => {
  if (typeof localStorage === 'undefined') {
    return createWebDeviceInstanceId();
  }

  try {
    const storedId = String(
      localStorage.getItem(WEB_DEVICE_INSTANCE_STORAGE_KEY) || '',
    ).trim();
    if (storedId) {
      return storedId;
    }

    const nextId = createWebDeviceInstanceId();
    localStorage.setItem(WEB_DEVICE_INSTANCE_STORAGE_KEY, nextId);
    return nextId;
  } catch (e) {
    return createWebDeviceInstanceId();
  }
};

export const isWebRuntimeDevice = deviceInfo =>
  deviceInfo?.deviceType === 'web' ||
  deviceInfo?.systemName === 'web' ||
  String(deviceInfo?.id || '').startsWith('web-');

export const resolveOperationalDeviceType = ({appType, deviceInfo}) => {
  const normalizedAppType = safeTrim(appType).toUpperCase();
  if (APP_TYPE_DEVICE_MAP[normalizedAppType]) {
    return APP_TYPE_DEVICE_MAP[normalizedAppType];
  }

  if (normalizedAppType) {
    return normalizedAppType;
  }

  if (safeTrim(deviceInfo?.type)) {
    return safeTrim(deviceInfo.type).toUpperCase();
  }

  if (isWebRuntimeDevice(deviceInfo)) {
    return 'WEB';
  }

  return 'DEVICE';
};

export const buildDeviceAlias = ({deviceInfo, appType}) => {
  const resolvedType = resolveOperationalDeviceType({appType, deviceInfo});
  return (
    safeTrim(deviceInfo?.alias) ||
    safeTrim(deviceInfo?.appName) ||
    safeTrim(deviceInfo?.model) ||
    safeTrim(deviceInfo?.manufacturer) ||
    safeTrim(deviceInfo?.id) ||
    resolvedType
  );
};

export const buildDeviceMetadata = ({deviceInfo, appType}) => {
  const screen = buildScreenMetrics();
  const navigatorData =
    typeof navigator !== 'undefined'
      ? {
          userAgent: navigator.userAgent || null,
          language: navigator.language || null,
        }
      : {};

  return {
    runtime: Platform.OS,
    appType: safeTrim(appType).toUpperCase() || null,
    app: {
      name: safeTrim(deviceInfo?.appName) || null,
      version: safeTrim(deviceInfo?.appVersion) || null,
      buildNumber: safeTrim(deviceInfo?.buildNumber) || null,
    },
    screen: {
      deviceResolution: screen?.deviceResolution || null,
      actualSize: screen?.actualSize || null,
      windosSize: screen?.windosSize || null,
    },
    system: {
      name: safeTrim(deviceInfo?.systemName) || null,
      version: safeTrim(deviceInfo?.systemVersion) || null,
      manufacturer: safeTrim(deviceInfo?.manufacturer) || null,
      model: safeTrim(deviceInfo?.model) || null,
      hardwareType: safeTrim(deviceInfo?.deviceType) || null,
      isEmulator:
        deviceInfo?.isEmulator === undefined ? null : !!deviceInfo.isEmulator,
      batteryLevel:
        deviceInfo?.batteryLevel === undefined ||
        deviceInfo?.batteryLevel === null
          ? null
          : Number(deviceInfo.batteryLevel),
    },
    browser: navigatorData,
  };
};

export const buildLocalRuntimeDevice = ({deviceInfo, appType}) => {
  const metadata = buildDeviceMetadata({deviceInfo, appType});
  return {
    ...deviceInfo,
    type: resolveOperationalDeviceType({appType, deviceInfo}),
    metadata,
  };
};

export const buildDeviceRegistrationPayload = ({
  deviceInfo,
  appType,
  existingDevice = null,
}) => {
  const localDevice = buildLocalRuntimeDevice({deviceInfo, appType});
  return {
    id: existingDevice?.id,
    device: localDevice.id,
    alias: existingDevice?.alias || buildDeviceAlias({deviceInfo: localDevice, appType}),
    type: localDevice.type,
    metadata: localDevice.metadata,
  };
};

export const hasDeviceRecordChanges = ({existingDevice, nextDevice}) => {
  if (!existingDevice) {
    return true;
  }

  return (
    safeTrim(existingDevice.device) !== safeTrim(nextDevice.device) ||
    safeTrim(existingDevice.alias) !== safeTrim(nextDevice.alias) ||
    safeTrim(existingDevice.type) !== safeTrim(nextDevice.type) ||
    safeStringify(existingDevice.metadata) !== safeStringify(nextDevice.metadata)
  );
};
