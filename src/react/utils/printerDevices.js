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

export const isPrinterDeviceType = type =>
  [PRINT_DEVICE_TYPE, PRINTER_DEVICE_TYPE].includes(normalizeDeviceType(type));

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
      const deviceType = normalizeDeviceType(deviceConfig?.device?.type);
      return (
        deviceId &&
        deviceId !== normalizeDeviceId(excludeDeviceId) &&
        [PDV_DEVICE_TYPE, DISPLAY_DEVICE_TYPE].includes(deviceType)
      );
    })
    .map(deviceConfig => {
      const deviceId = normalizeDeviceId(deviceConfig?.device?.device);
      const deviceType = normalizeDeviceType(deviceConfig?.device?.type);
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

  const assignPrinter = printer => {
    const deviceId = normalizeDeviceId(printer?.device || printer?.deviceId);
    if (!deviceId) {
      return;
    }

    const currentValue = printerMap.get(deviceId) || {};
    const nextMetadata = getPrinterMetadata(printer?.metadata);

    printerMap.set(deviceId, {
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
      metadata:
        Object.keys(nextMetadata).length > 0
          ? nextMetadata
          : getPrinterMetadata(currentValue?.metadata),
      configs: parseConfigsObject(printer?.configs || currentValue?.configs),
    });
  };

  (Array.isArray(printers) ? printers : []).forEach(assignPrinter);

  filterDeviceConfigsByCompany(deviceConfigs, companyId)
    .filter(deviceConfig => isPrinterDeviceType(deviceConfig?.device?.type))
    .forEach(deviceConfig => {
      assignPrinter({
        ...(deviceConfig?.device || {}),
        configs: parseConfigsObject(deviceConfig?.configs),
      });
    });

  return Array.from(printerMap.values()).sort((left, right) =>
    getPrinterLabel(left).localeCompare(getPrinterLabel(right)),
  );
};

export const getManagedPrinterDevices = ({
  deviceConfigs = [],
  companyId = null,
  managerDeviceId = null,
}) =>
  filterDeviceConfigsByCompany(deviceConfigs, companyId)
    .filter(deviceConfig => {
      if (!isPrinterDeviceType(deviceConfig?.device?.type)) {
        return false;
      }

      const configs = parseConfigsObject(deviceConfig?.configs);
      return (
        normalizeDeviceId(configs?.[NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY]) ===
        normalizeDeviceId(managerDeviceId)
      );
    })
    .map(deviceConfig => ({
      ...(deviceConfig?.device || {}),
      configs: parseConfigsObject(deviceConfig?.configs),
    }))
    .sort((left, right) =>
      getPrinterLabel(left).localeCompare(getPrinterLabel(right)),
    );
