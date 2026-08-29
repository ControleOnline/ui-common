/**
 * Pure helpers for print spool routing / queue handling.
 * Kept small so PrintService stays under the 500-line absolute limit.
 */

export const SOCKET_PRINT_POLL_INTERVAL_DISCONNECTED = 10000;
export const SOCKET_PRINT_POLL_DELAY_CONNECTED = 60000;
export const SPOOL_ACK_RETRY_DELAY_MS = 10000;

export const normalizeDeviceType = value =>
  String(value || '').trim().toUpperCase();

export const extractCollectionMembers = data => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.member)) {
    return data.member;
  }

  if (Array.isArray(data?.['hydra:member'])) {
    return data['hydra:member'];
  }

  return [];
};

export const resolveSpoolId = value => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numericValue = value.replace(/\D/g, '');
    return numericValue ? Number(numericValue) : null;
  }

  return (
    resolveSpoolId(value?.id) ||
    resolveSpoolId(value?.spoolId) ||
    resolveSpoolId(value?.spool) ||
    resolveSpoolId(value?.['@id'])
  );
};

/**
 * Merge open-spool collections from multiple devices, dedupe by id, sort ascending.
 */
export const mergeOpenSpoolCollections = spoolCollections => {
  const mergedSpools = [];
  const spoolIds = new Set();

  (Array.isArray(spoolCollections) ? spoolCollections : [])
    .flat()
    .forEach(item => {
      const spoolId = resolveSpoolId(item);
      const spoolKey = spoolId ? String(spoolId) : JSON.stringify(item);

      if (!spoolIds.has(spoolKey)) {
        spoolIds.add(spoolKey);
        mergedSpools.push(item);
      }
    });

  mergedSpools.sort((left, right) => {
    const leftId = resolveSpoolId(left) || 0;
    const rightId = resolveSpoolId(right) || 0;
    return leftId - rightId;
  });

  return mergedSpools;
};

/**
 * Fetch open spools for a list of device ids (parallel).
 * Returns merged, deduped, sorted list. Caller handles store updates / errors.
 */
export const fetchOpenSpoolsForDevices = async (api, deviceIds) => {
  const ids = Array.from(
    new Set((Array.isArray(deviceIds) ? deviceIds : []).filter(Boolean)),
  );

  if (ids.length === 0) {
    return [];
  }

  const spoolCollections = await Promise.all(
    ids.map(deviceId =>
      api
        .fetch('spools', {
          params: {
            'device.device': deviceId,
            'status.realStatus': 'open',
          },
        })
        .then(extractCollectionMembers)
        .catch(() => []),
    ),
  );

  return mergeOpenSpoolCollections(spoolCollections);
};

export const resolveRequestedTargetDeviceId = (printJob, fallbackDeviceId) => {
  const raw =
    printJob?.targetDeviceId ||
    printJob?.deviceId ||
    printJob?.device?.device ||
    printJob?.device ||
    fallbackDeviceId;
  return String(raw || '').trim();
};

export const resolveRequestedTargetDeviceTypeValue = printJob =>
  normalizeDeviceType(
    printJob?.targetDeviceType ||
      printJob?.deviceType ||
      printJob?.device?.type ||
      '',
  );
