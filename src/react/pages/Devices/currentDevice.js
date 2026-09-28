import {PDV_DEVICE_TYPE, normalizeDeviceType} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  normalizeDeviceId,
  normalizeEntityId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';

export const readStoredRuntimeDevice = (storage = globalThis?.localStorage) => {
  if (!storage || typeof storage.getItem !== 'function') {
    return {};
  }

  try {
    const storedDevice = JSON.parse(storage.getItem('device') || '{}');
    return storedDevice && typeof storedDevice === 'object'
      ? storedDevice
      : {};
  } catch {
    return {};
  }
};

export const getRuntimeDeviceIdentifier = runtimeDevice =>
  normalizeDeviceId(runtimeDevice?.id || runtimeDevice?.device);

export const getDeviceConfigIdentifier = deviceConfig =>
  normalizeDeviceId(deviceConfig?.device?.device);

export const isCurrentDeviceConfig = ({
  deviceConfig,
  runtimeDeviceIdentifier,
}) =>
  Boolean(
    runtimeDeviceIdentifier &&
      getDeviceConfigIdentifier(deviceConfig) ===
        normalizeDeviceId(runtimeDeviceIdentifier),
  );

export const prioritizeCurrentDeviceConfigs = (
  deviceConfigs = [],
  runtimeDeviceIdentifier = '',
) => {
  const current = [];
  const remaining = [];

  (Array.isArray(deviceConfigs) ? deviceConfigs : []).forEach(deviceConfig => {
    if (isCurrentDeviceConfig({deviceConfig, runtimeDeviceIdentifier})) {
      current.push(deviceConfig);
      return;
    }

    remaining.push(deviceConfig);
  });

  return [...current, ...remaining];
};

export const filterDeviceConfigsByTypes = (
  deviceConfigs = [],
  queryTypes = [],
) => {
  const normalizedTypes = (Array.isArray(queryTypes) ? queryTypes : [])
    .map(normalizeDeviceType)
    .filter(Boolean);

  if (normalizedTypes.length === 0) {
    return Array.isArray(deviceConfigs) ? deviceConfigs : [];
  }

  return (Array.isArray(deviceConfigs) ? deviceConfigs : []).filter(
    deviceConfig =>
      normalizedTypes.includes(normalizeDeviceType(deviceConfig?.type)),
  );
};

export const hasCurrentPdvConfig = (
  deviceConfigs = [],
  runtimeDeviceIdentifier = '',
) =>
  (Array.isArray(deviceConfigs) ? deviceConfigs : []).some(
    deviceConfig =>
      isCurrentDeviceConfig({deviceConfig, runtimeDeviceIdentifier}) &&
      normalizeDeviceType(deviceConfig?.type) === PDV_DEVICE_TYPE,
  );

export const getDeviceGroupKey = device => {
  const entityId = normalizeEntityId(
    device?.id || device?.['@id'] || device?.entityId || device?.entityIri,
  );

  if (entityId) {
    return `device:${entityId}`;
  }

  const identifier = normalizeDeviceId(device?.device || device?.id);
  return identifier ? `identifier:${identifier}` : '';
};

const createRuntimeDevice = runtimeDevice => ({
  id:
    runtimeDevice?.entityId ||
    runtimeDevice?.entityIri ||
    runtimeDevice?.databaseId ||
    null,
  device: getRuntimeDeviceIdentifier(runtimeDevice),
  alias:
    runtimeDevice?.alias ||
    runtimeDevice?.deviceName ||
    runtimeDevice?.modelName ||
    runtimeDevice?.model ||
    'Este dispositivo',
  metadata: runtimeDevice?.metadata || {},
});

export const groupDeviceConfigs = (
  deviceConfigs = [],
  {includeRuntimeDevice = false, runtimeDevice = {}} = {},
) => {
  const groupsByKey = new Map();

  (Array.isArray(deviceConfigs) ? deviceConfigs : []).forEach(deviceConfig => {
    const device = deviceConfig?.device || {};
    const key =
      getDeviceGroupKey(device) ||
      `config:${normalizeEntityId(deviceConfig?.id || deviceConfig?.['@id'])}`;

    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        key,
        device,
        deviceConfigs: [],
      });
    }

    groupsByKey.get(key).deviceConfigs.push(deviceConfig);
  });

  if (includeRuntimeDevice) {
    const runtimeIdentifier = getRuntimeDeviceIdentifier(runtimeDevice);
    const matchingGroup = [...groupsByKey.values()].find(
      group =>
        normalizeDeviceId(group?.device?.device) === runtimeIdentifier,
    );

    if (!matchingGroup && runtimeIdentifier) {
      const device = createRuntimeDevice(runtimeDevice);
      const key = getDeviceGroupKey(device) || `identifier:${runtimeIdentifier}`;
      groupsByKey.set(key, {
        key,
        device,
        deviceConfigs: [],
      });
    }
  }

  return [...groupsByKey.values()];
};

export const isCurrentDeviceGroup = ({
  deviceGroup,
  runtimeDeviceIdentifier,
}) =>
  Boolean(
    runtimeDeviceIdentifier &&
      normalizeDeviceId(deviceGroup?.device?.device) ===
        normalizeDeviceId(runtimeDeviceIdentifier),
  );

export const prioritizeCurrentDeviceGroups = (
  deviceGroups = [],
  runtimeDeviceIdentifier = '',
) => {
  const current = [];
  const remaining = [];

  (Array.isArray(deviceGroups) ? deviceGroups : []).forEach(deviceGroup => {
    if (isCurrentDeviceGroup({deviceGroup, runtimeDeviceIdentifier})) {
      current.push(deviceGroup);
      return;
    }

    remaining.push(deviceGroup);
  });

  return [...current, ...remaining];
};

export const findDeviceConfigByType = (deviceGroup, type) => {
  const normalizedType = normalizeDeviceType(type);

  return (deviceGroup?.deviceConfigs || []).find(
    deviceConfig =>
      normalizeDeviceType(deviceConfig?.type) === normalizedType,
  );
};

export const resolveDeviceListType = device => {
  const directType = normalizeDeviceType(device?.type);
  if (directType && directType !== 'ANDROID' && directType !== 'IOS') {
    return directType;
  }

  const metadata =
    device?.metadata && typeof device.metadata === 'object'
      ? device.metadata
      : {};
  const appType = normalizeDeviceType(metadata?.appType || metadata?.app_type);
  if (appType === 'POS') {
    return PDV_DEVICE_TYPE;
  }
  if (appType === 'PPC' || appType === 'DISPLAY' || appType === 'TOTEM') {
    return 'DISPLAY';
  }
  if (appType === 'PRINT' || appType === 'PRINTER') {
    return 'PRINT';
  }

  // Platform-only labels (ANDROID/IOS) are not operational device_config types.
  if (directType === 'ANDROID' || directType === 'IOS') {
    return PDV_DEVICE_TYPE;
  }

  return directType || 'DEVICE';
};

/**
 * Devices without a persisted device_config (common on Android POS after #821
 * stopped auto-creating configs) would otherwise be invisible on devices-index.
 * Promote them to synthetic config rows so Manager can still list them.
 */
export const mergeOrphanDevicesIntoConfigs = (
  deviceConfigs = [],
  devices = [],
  {companyId = '', queryTypes = []} = {},
) => {
  const configs = Array.isArray(deviceConfigs) ? [...deviceConfigs] : [];
  const covered = new Set(
    configs
      .map(config => normalizeDeviceId(config?.device?.device || config?.device?.id))
      .filter(Boolean),
  );
  const normalizedQueryTypes = (Array.isArray(queryTypes) ? queryTypes : [])
    .map(normalizeDeviceType)
    .filter(Boolean);
  const peopleIri = companyId ? `/people/${companyId}` : '';

  (Array.isArray(devices) ? devices : []).forEach(device => {
    const identifier = normalizeDeviceId(device?.device || device?.id);
    if (!identifier || covered.has(identifier)) {
      return;
    }

    const resolvedType = resolveDeviceListType(device);
    if (
      normalizedQueryTypes.length > 0 &&
      !normalizedQueryTypes.includes(resolvedType)
    ) {
      return;
    }

    covered.add(identifier);
    configs.push({
      id: null,
      '@id': null,
      device,
      type: resolvedType,
      configs: {},
      people: device?.people || peopleIri,
      _orphanDevice: true,
    });
  });

  return configs;
};

