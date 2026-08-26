/**
 * Build device + device_config store payloads after a successful alias save.
 * Keeps derived initialAlias in sync so UI does not snap back to the old name.
 */
export function buildDeviceAliasStoreUpdates({
  deviceId,
  nextAlias,
  runtimeDevice,
  runtimeDeviceConfig,
  savedDevice,
  normalizeEntityId,
}) {
  const id = normalizeEntityId(deviceId);
  const alias = String(nextAlias || '').trim();

  const baseDevice =
    runtimeDevice &&
    normalizeEntityId(runtimeDevice?.id || runtimeDevice?.['@id']) === id
      ? runtimeDevice
      : {};

  const mergedDevice = {
    ...baseDevice,
    ...(savedDevice && typeof savedDevice === 'object' ? savedDevice : {}),
    id,
    alias,
  };

  let nextDeviceConfig = null;
  if (runtimeDeviceConfig && typeof runtimeDeviceConfig === 'object') {
    const nestedDevice =
      runtimeDeviceConfig.device && typeof runtimeDeviceConfig.device === 'object'
        ? runtimeDeviceConfig.device
        : {};
    nextDeviceConfig = {
      ...runtimeDeviceConfig,
      device: {
        ...nestedDevice,
        id: nestedDevice.id || id,
        alias,
      },
    };
  }

  return { mergedDevice, nextDeviceConfig };
}
