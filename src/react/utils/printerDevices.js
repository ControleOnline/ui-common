import {parseConfigsObject} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  filterDeviceConfigsByCompany,
  normalizeDeviceId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';

export const PRINT_DEVICE_TYPE = 'PRINT';
export const PRINTER_DEVICE_TYPE = 'PRINTER';
export const DISPLAY_DEVICE_TYPE = 'DISPLAY';
export const PDV_DEVICE_TYPE = 'PDV';

export const NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY =
  'print-network-manager-device';
export const NETWORK_PRINTER_PORT_CONFIG_KEY = 'print-network-port';
export const NETWORK_PRINTER_COLUMNS_CONFIG_KEY = 'print-network-columns';
export const NETWORK_PRINTER_TRANSPORT_CONFIG_KEY =
  'print-network-transport';

export const DEFAULT_NETWORK_PRINTER_PORT = '9100';
export const DEFAULT_NETWORK_PRINTER_COLUMNS = '48';
export const DEFAULT_NETWORK_PRINTER_TRANSPORT = 'tcp-raw';
export const DEFAULT_NETWORK_PRINTER_MANUFACTURER = 'Bematech';
export const DEFAULT_NETWORK_PRINTER_MODEL = 'MP-2800 TH';

const safeTrim = value => String(value || '').trim();

const parseMetadataObject = metadata => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  return typeof metadata === 'object' ? {...metadata} : {};
};

const normalizePositiveIntegerString = (value, fallback) => {
  const normalized = safeTrim(value).replace(/\D+/g, '');
  if (!normalized) {
    return fallback;
  }

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) && numericValue > 0
    ? String(numericValue)
    : fallback;
};

export const normalizeDeviceType = value => safeTrim(value).toUpperCase();
export const getDeviceConfigType = deviceConfig =>
  normalizeDeviceType(deviceConfig?.type || deviceConfig?.device?.type);
export const buildDeviceConfigIri = deviceConfig => {
  const directIri = safeTrim(deviceConfig?.['@id']);
  if (directIri) {
    return directIri;
  }

  const configId = safeTrim(deviceConfig?.id);
  return configId ? `/device_configs/${configId}` : '';
};
export const getPrinterOptionValue = printer =>
  safeTrim(printer?.configIri) ||
  safeTrim(printer?.selectionValue) ||
  safeTrim(printer?.device);
export const findPrinterOptionByValue = (printerOptions = [], value = '') => {
  const normalizedValue = safeTrim(value);
  if (!normalizedValue) {
    return null;
  }

  const options = Array.isArray(printerOptions) ? printerOptions : [];

  return (
    options.find(option => getPrinterOptionValue(option) === normalizedValue) ||
    options.find(option => normalizeDeviceId(option?.device) === normalizedValue) ||
    null
  );
};

export const isNetworkPrinterDeviceType = type =>
  [PRINT_DEVICE_TYPE, PRINTER_DEVICE_TYPE].includes(normalizeDeviceType(type));

export const isPrintCapableDeviceType = type =>
  [PRINT_DEVICE_TYPE, PRINTER_DEVICE_TYPE, PDV_DEVICE_TYPE].includes(
    normalizeDeviceType(type),
  );

export const isPrinterDeviceType = isNetworkPrinterDeviceType;

export const getDeviceTypeLabel = type => {
  const normalizedType = normalizeDeviceType(type);

  if (isPrinterDeviceType(normalizedType)) {
    return 'Impressora';
  }

  return normalizedType || 'DEVICE';
};

export const getPrinterLabel = printer =>
  safeTrim(printer?.alias) ||
  safeTrim(printer?.name) ||
  safeTrim(printer?.device) ||
  'Impressora sem nome';

export const normalizePrinterHost = value => safeTrim(value);
export const normalizePrinterPort = value =>
  normalizePositiveIntegerString(value, DEFAULT_NETWORK_PRINTER_PORT);
export const normalizePrinterColumns = value =>
  normalizePositiveIntegerString(value, DEFAULT_NETWORK_PRINTER_COLUMNS);

export const getPrinterHost = printer => {
  const parsedMetadata = getPrinterMetadata(printer?.metadata);
  return (
    normalizePrinterHost(printer?.device) ||
    normalizePrinterHost(parsedMetadata?.printer?.host)
  );
};

export const getPrinterMetadata = metadata => parseMetadataObject(metadata);

export const getPrinterMetadataField = (metadata, field) => {
  const parsedMetadata = getPrinterMetadata(metadata);
  const printerField = safeTrim(parsedMetadata?.printer?.[field]);
  if (printerField) {
    return printerField;
  }

  if (field === 'manufacturer') {
    return safeTrim(parsedMetadata?.system?.manufacturer);
  }

  if (field === 'model') {
    return safeTrim(parsedMetadata?.system?.model);
  }

  if (field === 'version') {
    return safeTrim(parsedMetadata?.system?.version);
  }

  return '';
};

export const buildNetworkPrinterMetadata = ({
  existingMetadata = {},
  host,
  manufacturer,
  model,
  version,
  transport = DEFAULT_NETWORK_PRINTER_TRANSPORT,
}) => {
  const parsedMetadata = getPrinterMetadata(existingMetadata);
  const normalizedManufacturer =
    safeTrim(manufacturer) ||
    getPrinterMetadataField(parsedMetadata, 'manufacturer') ||
    null;
  const normalizedModel =
    safeTrim(model) ||
    getPrinterMetadataField(parsedMetadata, 'model') ||
    null;
  const normalizedVersion =
    safeTrim(version) ||
    getPrinterMetadataField(parsedMetadata, 'version') ||
    null;
  const normalizedHost =
    normalizePrinterHost(host) ||
    safeTrim(parsedMetadata?.printer?.host) ||
    null;
  const normalizedTransport =
    safeTrim(transport) ||
    safeTrim(parsedMetadata?.printer?.transport) ||
    DEFAULT_NETWORK_PRINTER_TRANSPORT;

  return {
    ...parsedMetadata,
    runtime: safeTrim(parsedMetadata?.runtime) || 'network',
    printer: {
      ...(parsedMetadata?.printer || {}),
      host: normalizedHost,
      manufacturer: normalizedManufacturer,
      model: normalizedModel,
      version: normalizedVersion,
      transport: normalizedTransport,
    },
    system: {
      ...(parsedMetadata?.system || {}),
      name: safeTrim(parsedMetadata?.system?.name) || 'network-printer',
      version: normalizedVersion,
      manufacturer: normalizedManufacturer,
      model: normalizedModel,
      hardwareType: 'printer',
    },
  };
};

export const getPrinterManagerDeviceOptions = ({
  deviceConfigs = [],
  companyId,
  excludeDeviceId = null,
}) =>
  filterDeviceConfigsByCompany(deviceConfigs, companyId)
    .filter(deviceConfig => {
      const deviceId = normalizeDeviceId(deviceConfig?.device?.device);
      const deviceType = getDeviceConfigType(deviceConfig);
      return (
        deviceId &&
        deviceId !== normalizeDeviceId(excludeDeviceId) &&
        [PDV_DEVICE_TYPE, DISPLAY_DEVICE_TYPE].includes(deviceType)
      );
    })
    .map(deviceConfig => {
      const deviceId = normalizeDeviceId(deviceConfig?.device?.device);
      const deviceType = getDeviceConfigType(deviceConfig);
      const alias =
        safeTrim(deviceConfig?.device?.alias) ||
        deviceId ||
        `Device #${deviceConfig?.id || '--'}`;

      return {
        alias,
        deviceId,
        deviceType,
        label: `${alias} (${deviceType})`,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));

export const getPrinterOptions = ({
  printers = [],
  deviceConfigs = [],
  companyId = null,
}) => {
  const printerMap = new Map();

  const assignPrinter = (mapKey, printer, currentValue = {}) => {
    const deviceId = normalizeDeviceId(printer?.device || printer?.deviceId);
    if (!deviceId) {
      return;
    }

    const nextMetadata = getPrinterMetadata(printer?.metadata);
    const currentConfigs = parseConfigsObject(currentValue?.configs);
    const nextConfigs = parseConfigsObject(printer?.configs);

    printerMap.set(mapKey, {
      ...currentValue,
      ...printer,
      device: deviceId,
      alias:
        safeTrim(printer?.alias) ||
        safeTrim(currentValue?.alias) ||
        safeTrim(printer?.name) ||
        safeTrim(currentValue?.name) ||
        deviceId,
      type:
        normalizeDeviceType(printer?.type || printer?.deviceType) ||
        normalizeDeviceType(currentValue?.type || currentValue?.deviceType),
      configId: safeTrim(printer?.configId || currentValue?.configId),
      configIri: safeTrim(printer?.configIri || currentValue?.configIri),
      config: printer?.config || currentValue?.config,
      metadata:
        Object.keys(nextMetadata).length > 0
          ? nextMetadata
          : getPrinterMetadata(currentValue?.metadata),
      configs:
        Object.keys(nextConfigs).length > 0 ? nextConfigs : currentConfigs,
    });
  };

  filterDeviceConfigsByCompany(deviceConfigs, companyId)
    .filter(deviceConfig => isPrintCapableDeviceType(getDeviceConfigType(deviceConfig)))
    .forEach(deviceConfig => {
      const deviceId = normalizeDeviceId(
        deviceConfig?.device?.device || deviceConfig?.device?.id,
      );
      const configIri = buildDeviceConfigIri(deviceConfig);
      const mapKey =
        configIri ||
        `${deviceId}::${getDeviceConfigType(deviceConfig) || 'DEVICE'}`;

      assignPrinter(mapKey, {
        ...(deviceConfig?.device || {}),
        type: getDeviceConfigType(deviceConfig),
        configId: safeTrim(deviceConfig?.id),
        configIri,
        config: deviceConfig,
        configs: parseConfigsObject(deviceConfig?.configs),
      });
    });

  (Array.isArray(printers) ? printers : []).forEach(printer => {
    const deviceId = normalizeDeviceId(printer?.device || printer?.deviceId);
    if (!deviceId) {
      return;
    }

    const matchingEntries = Array.from(printerMap.entries()).filter(
      ([, option]) => normalizeDeviceId(option?.device) === deviceId,
    );

    if (matchingEntries.length > 0) {
      matchingEntries.forEach(([mapKey, currentValue]) => {
        assignPrinter(mapKey, printer, currentValue);
      });
      return;
    }

    const fallbackType = normalizeDeviceType(printer?.type || printer?.deviceType);
    const fallbackKey = fallbackType ? `${deviceId}::${fallbackType}` : deviceId;
    assignPrinter(fallbackKey, printer, printerMap.get(fallbackKey) || {});
  });

  return Array.from(printerMap.values()).sort((left, right) =>
    `${getPrinterLabel(left)} ${getDeviceTypeLabel(left?.type)}`.localeCompare(
      `${getPrinterLabel(right)} ${getDeviceTypeLabel(right?.type)}`,
    ),
  );
};

export const getManagedPrinterDevices = ({
  deviceConfigs = [],
  companyId = null,
  managerDeviceId = null,
}) => {
  const scopedDeviceConfigs = filterDeviceConfigsByCompany(
    deviceConfigs,
    companyId,
  );
  const normalizedManagerDeviceId = normalizeDeviceId(managerDeviceId);
  const managedPrinterMap = new Map();

  const assignManagedPrinter = printer => {
    const printerDeviceId = normalizeDeviceId(printer?.device);
    const printerOptionValue =
      getPrinterOptionValue(printer) ||
      (printerDeviceId
        ? `${printerDeviceId}::${normalizeDeviceType(printer?.type) || 'DEVICE'}`
        : '');

    if (!printerDeviceId || !printerOptionValue) {
      return;
    }

    managedPrinterMap.set(printerOptionValue, {
      ...(managedPrinterMap.get(printerOptionValue) || {}),
      ...printer,
      device: printerDeviceId,
      configs: parseConfigsObject(printer?.configs),
    });
  };

  scopedDeviceConfigs
    .filter(deviceConfig => {
      if (!isPrinterDeviceType(getDeviceConfigType(deviceConfig))) {
        return false;
      }

      const configs = parseConfigsObject(deviceConfig?.configs);
      return (
        normalizeDeviceId(configs?.[NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY]) ===
        normalizedManagerDeviceId
      );
    })
    .forEach(deviceConfig => {
      assignManagedPrinter({
        ...(deviceConfig?.device || {}),
        type: getDeviceConfigType(deviceConfig),
        configId: safeTrim(deviceConfig?.id),
        configIri: buildDeviceConfigIri(deviceConfig),
        config: deviceConfig,
        configs: parseConfigsObject(deviceConfig?.configs),
      });
    });

  scopedDeviceConfigs
    .filter(
      deviceConfig =>
        getDeviceConfigType(deviceConfig) === DISPLAY_DEVICE_TYPE &&
        normalizeDeviceId(deviceConfig?.device?.device) === normalizedManagerDeviceId,
    )
    .forEach(displayDeviceConfig => {
      const displayConfigs = parseConfigsObject(displayDeviceConfig?.configs);
      const attachedPrinterReference = normalizeDeviceId(displayConfigs?.printer);

      if (!attachedPrinterReference) {
        return;
      }

      const printerDeviceConfig = scopedDeviceConfigs.find(
        deviceConfig =>
          buildDeviceConfigIri(deviceConfig) === attachedPrinterReference &&
          isPrinterDeviceType(getDeviceConfigType(deviceConfig)),
      ) || scopedDeviceConfigs.find(
        deviceConfig =>
          normalizeDeviceId(deviceConfig?.device?.device) ===
            attachedPrinterReference &&
          isPrinterDeviceType(getDeviceConfigType(deviceConfig)),
      );

      if (!printerDeviceConfig) {
        return;
      }

      assignManagedPrinter({
        ...(printerDeviceConfig?.device || {}),
        type: getDeviceConfigType(printerDeviceConfig),
        configId: safeTrim(printerDeviceConfig?.id),
        configIri: buildDeviceConfigIri(printerDeviceConfig),
        config: printerDeviceConfig,
        configs: parseConfigsObject(printerDeviceConfig?.configs),
      });
    });

  return Array.from(managedPrinterMap.values()).sort((left, right) =>
    getPrinterLabel(left).localeCompare(getPrinterLabel(right)),
  );
};
