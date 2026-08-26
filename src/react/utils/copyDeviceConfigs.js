/**
 * Copy device_config.configs from a source physical device to a destination
 * physical device without changing destination identity (id/hash/hardware).
 *
 * Copyable keys = free-form keys present in the source `configs` JSON
 * (discovered at runtime). Entity fields (id, device, people, type) are never
 * copied.
 *
 * Known keys observed in the codebase (non-exhaustive; actual copy uses
 * whatever keys exist on the source row):
 * - pos-operation-mode, pos-gateway, printer-enabled, payment-type-ids
 * - pos-product-showcase-id, pos-delivery-enabled, pos-auto-print-enabled
 * - pos-cash-management-mode, check-order-type, check-order-management-mode
 * - android-kiosk-enabled, android-launcher-enabled
 * - order-payment-device, order-payment-devices, order-payment-device-change-allowed
 * - display-id, printer, display-auto-print-product, display-allow-printer-change
 * - display-size, display-side-break, print-mode
 * - print-network-port, print-network-columns, print-network-code-page
 * - camera-network-*, notification-sound-*, pos-order-visibility
 * - device-runtime-debug-info-enabled, device-runtime-footer-text
 */

const normalizeDeviceId = value => String(value || '').trim();

const normalizeEntityId = value =>
  String(value?.id || value || '')
    .replace(/\D/g, '')
    .trim();

const parseConfigsObject = configs => {
  if (!configs) {
    return {};
  }
  if (typeof configs === 'string') {
    try {
      const parsed = JSON.parse(configs);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }
  if (typeof configs === 'object' && !Array.isArray(configs)) {
    return configs;
  }
  return {};
};

export const listCopyableConfigKeys = configs =>
  Object.keys(parseConfigsObject(configs) || {}).sort();

export const getDeviceConfigDeviceString = deviceConfig =>
  normalizeDeviceId(
    deviceConfig?.device?.device ||
      deviceConfig?.device?.id ||
      deviceConfig?.device ||
      '',
  );

export const getDeviceConfigType = deviceConfig =>
  String(deviceConfig?.type || deviceConfig?.device?.type || '')
    .trim()
    .toUpperCase();

export const getDeviceConfigLabel = deviceConfig => {
  const alias = String(
    deviceConfig?.device?.alias ||
      deviceConfig?.alias ||
      getDeviceConfigDeviceString(deviceConfig) ||
      '',
  ).trim();
  const type = getDeviceConfigType(deviceConfig);
  if (alias && type) {
    return `${alias} (${type})`;
  }
  return alias || type || 'Device';
};

const filterByCompany = (deviceConfigs, companyId) => {
  const normalizedCompanyId = normalizeEntityId(companyId);
  return (Array.isArray(deviceConfigs) ? deviceConfigs : []).filter(
    deviceConfig =>
      !normalizedCompanyId ||
      normalizeEntityId(deviceConfig?.people?.id || deviceConfig?.people) ===
        normalizedCompanyId,
  );
};

/**
 * Group company device_config rows by physical device string, excluding the
 * destination device. Used to build the "Copiar de…" picker.
 */
export const buildSourceDeviceOptions = ({
  companyDeviceConfigs = [],
  companyId,
  destinationDeviceString,
} = {}) => {
  const dest = normalizeDeviceId(destinationDeviceString);
  const scoped = filterByCompany(companyDeviceConfigs, companyId);
  const byDevice = new Map();

  scoped.forEach(row => {
    const deviceString = getDeviceConfigDeviceString(row);
    if (!deviceString || (dest && deviceString === dest)) {
      return;
    }
    if (!byDevice.has(deviceString)) {
      byDevice.set(deviceString, {
        deviceString,
        alias: String(row?.device?.alias || deviceString).trim(),
        configs: [],
      });
    }
    byDevice.get(deviceString).configs.push(row);
  });

  return Array.from(byDevice.values()).sort((a, b) =>
    String(a.alias).localeCompare(String(b.alias), 'pt-BR'),
  );
};

/**
 * Build POST payloads for addDeviceConfigs: one per type present on source.
 */
export const buildCopyPayloads = ({
  sourceConfigs = [],
  destinationDeviceString,
  peopleIri,
} = {}) => {
  const dest = normalizeDeviceId(destinationDeviceString);
  const people = String(peopleIri || '').trim();
  if (!dest || !people) {
    return [];
  }

  const byType = new Map();
  (Array.isArray(sourceConfigs) ? sourceConfigs : []).forEach(row => {
    const type = getDeviceConfigType(row);
    if (!type) {
      return;
    }
    const configs = parseConfigsObject(row?.configs);
    byType.set(type, {
      device: dest,
      people,
      type,
      configs: JSON.stringify(configs || {}),
      keys: listCopyableConfigKeys(configs),
    });
  });

  return Array.from(byType.values());
};

/**
 * Execute copy: for each payload, call addDeviceConfigs.
 */
export const executeCopyDeviceConfigs = async ({
  addDeviceConfigs,
  sourceConfigs = [],
  destinationDeviceString,
  peopleIri,
} = {}) => {
  if (typeof addDeviceConfigs !== 'function') {
    throw new Error('addDeviceConfigs is required');
  }

  const payloads = buildCopyPayloads({
    sourceConfigs,
    destinationDeviceString,
    peopleIri,
  });

  if (payloads.length === 0) {
    return {types: [], keys: [], results: []};
  }

  const results = [];
  const allKeys = new Set();

  for (const payload of payloads) {
    (payload.keys || []).forEach(key => allKeys.add(key));
    const result = await addDeviceConfigs({
      device: payload.device,
      people: payload.people,
      type: payload.type,
      configs: payload.configs,
    });
    results.push({type: payload.type, keys: payload.keys, result});
  }

  return {
    types: payloads.map(p => p.type),
    keys: Array.from(allKeys).sort(),
    results,
  };
};
