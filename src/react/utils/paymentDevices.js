import {Platform} from 'react-native';

export const PAYMENT_GATEWAY_CIELO = 'cielo';
export const PAYMENT_GATEWAY_INFINITE_PAY = 'infinite-pay';
export const PAYMENT_GATEWAYS = [
  PAYMENT_GATEWAY_CIELO,
  PAYMENT_GATEWAY_INFINITE_PAY,
];
export const POS_GATEWAY_CONFIG_KEY = 'pos-gateway';
export const PDV_PRINTER_ENABLED_CONFIG_KEY = 'printer-enabled';
export const ORDER_PAYMENT_DEVICES_CONFIG_KEY = 'order-payment-devices';
export const ORDER_PAYMENT_DEVICE_CONFIG_KEY = 'order-payment-device';
export const ORDER_PAYMENT_DEVICE_CHANGE_ALLOWED_CONFIG_KEY =
  'order-payment-device-change-allowed';
export const ORDER_CHARGE_ON_DELIVERY_ENABLED_CONFIG_KEY =
  'order-charge-on-delivery-enabled';
export const PAYMENT_TYPE_IDS_CONFIG_KEY = 'payment-type-ids';

const parseJsonValue = (value, fallback) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return value;
};

export const normalizeDeviceId = value => String(value || '').trim();
export const normalizeEntityId = value =>
  String(value?.id || value || '')
    .replace(/\D/g, '')
    .trim();

export const normalizeDeviceIds = value => {
  const parsed = parseJsonValue(value, []);

  if (Array.isArray(parsed)) {
    return parsed.map(normalizeDeviceId).filter(Boolean);
  }

  const singleId = normalizeDeviceId(parsed);
  return singleId ? [singleId] : [];
};

const normalizeDevicePaymentIds = value => {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  let parsed = value;

  if (typeof parsed === 'string') {
    const trimmed = parsed.trim();

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = trimmed;
      }
    } else {
      parsed = trimmed;
    }
  }

  const rawValues = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'string'
      ? parsed.split(/[,\n;]/)
      : [parsed];

  return [...new Set(
    rawValues
      .map(walletValue =>
        normalizeEntityId(
          walletValue?.['@id'] || walletValue?.id || walletValue,
        ),
      )
      .filter(Boolean),
  )];
};

export const normalizePaymentTypeIds = normalizeDevicePaymentIds;

const resolveWalletPaymentTypeWalletId = walletPaymentType =>
  normalizeEntityId(
    walletPaymentType?.wallet?.['@id'] ||
      walletPaymentType?.wallet?.id ||
      walletPaymentType?.wallet ||
      walletPaymentType?.walletId ||
      walletPaymentType?.wallet_id,
  );

const resolveWalletPaymentTypeId = walletPaymentType =>
  normalizeEntityId(
    walletPaymentType?.['@id'] || walletPaymentType?.id,
  );

const parseConfigsObject = value => {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof value === 'object' ? value : {};
};

const resolveConfigsSource = value => {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, 'configs')
  ) {
    return value.configs;
  }

  return value;
};

export const normalizePaymentGateway = value => {
  const rawGateway = String(value || '')
    .trim()
    .toLowerCase();

  if (!rawGateway) {
    return '';
  }

  const compactGateway = rawGateway.replace(/[\s_]/g, '-');
  if (compactGateway === 'infinitepay') {
    return PAYMENT_GATEWAY_INFINITE_PAY;
  }
  if (compactGateway === PAYMENT_GATEWAY_INFINITE_PAY) {
    return PAYMENT_GATEWAY_INFINITE_PAY;
  }
  if (compactGateway === PAYMENT_GATEWAY_CIELO) {
    return PAYMENT_GATEWAY_CIELO;
  }

  return compactGateway;
};

const normalizeDeviceType = value =>
  String(value || '')
    .trim()
    .toUpperCase();

const isTruthyValue = value =>
  value === true || value === '1' || value === 1 || value === 'true';

const resolveDeviceConfigDevice = deviceConfig => {
  const nestedDevice = deviceConfig?.device;
  if (nestedDevice && typeof nestedDevice === 'object') {
    return nestedDevice;
  }
  if (typeof nestedDevice === 'string') {
    return {device: nestedDevice};
  }
  return {};
};

const getDeviceConfigDeviceId = deviceConfig => {
  const device = resolveDeviceConfigDevice(deviceConfig);
  return normalizeDeviceId(
    device?.device || deviceConfig?.deviceId || deviceConfig?.device_id || '',
  );
};

const getDeviceConfigType = deviceConfig =>
  normalizeDeviceType(deviceConfig?.type || deviceConfig?.device?.type);

export const filterDeviceConfigsByCompany = (deviceConfigs, companyId) => {
  const normalizedCompanyId = normalizeEntityId(companyId);

  return (Array.isArray(deviceConfigs) ? deviceConfigs : []).filter(
    deviceConfig =>
      !normalizedCompanyId ||
      normalizeEntityId(deviceConfig?.people?.id || deviceConfig?.people) ===
        normalizedCompanyId,
  );
};

export const getPaymentGatewayFromConfigs = configs =>
  normalizePaymentGateway(
    parseConfigsObject(resolveConfigsSource(configs))?.[POS_GATEWAY_CONFIG_KEY],
  );

export const getPaymentGateway = deviceConfig =>
  getPaymentGatewayFromConfigs(deviceConfig);

export const isLocalCieloPrintCapableDeviceConfig = deviceConfig =>
  getDeviceConfigType(deviceConfig) === 'PDV' &&
  getPaymentGateway(deviceConfig) === PAYMENT_GATEWAY_CIELO;

export const isPdvPrinterEnabled = configs => {
  const parsedConfigs = parseConfigsObject(resolveConfigsSource(configs));
  const printerEnabled = parsedConfigs?.[PDV_PRINTER_ENABLED_CONFIG_KEY];

  if (
    printerEnabled === undefined ||
    printerEnabled === null ||
    printerEnabled === ''
  ) {
    return true;
  }

  return isTruthyValue(printerEnabled);
};

export const isOrderChargeOnDeliveryEnabled = configs =>
  isTruthyValue(
    parseConfigsObject(resolveConfigsSource(configs))?.[
      ORDER_CHARGE_ON_DELIVERY_ENABLED_CONFIG_KEY
    ],
  );

export const isOrderPaymentDeviceChangeAllowed = configs =>
  isTruthyValue(
    parseConfigsObject(resolveConfigsSource(configs))?.[
      ORDER_PAYMENT_DEVICE_CHANGE_ALLOWED_CONFIG_KEY
    ],
  );

export const resolveConfiguredPaymentTypeIds = configs => {
  const parsedConfigs = parseConfigsObject(resolveConfigsSource(configs));
  const configuredPaymentTypeIds = normalizePaymentTypeIds(
    parsedConfigs?.[PAYMENT_TYPE_IDS_CONFIG_KEY],
  );

  return configuredPaymentTypeIds;
};

export const resolveDevicePaymentTypeIds = resolveConfiguredPaymentTypeIds;

export const filterWalletPaymentTypesByAllowedIds = (
  walletPaymentTypes,
  allowedPaymentTypeIds,
) => {
  const allowedPaymentTypeIdSet = new Set(
    normalizePaymentTypeIds(allowedPaymentTypeIds),
  );

  if (allowedPaymentTypeIdSet.size === 0) {
    return [];
  }

  return (Array.isArray(walletPaymentTypes) ? walletPaymentTypes : []).filter(
    walletPaymentType =>
      allowedPaymentTypeIdSet.has(
        resolveWalletPaymentTypeId(walletPaymentType),
      ),
  );
};

export const groupWalletPaymentTypesByWalletId = walletPaymentTypes =>
  (Array.isArray(walletPaymentTypes) ? walletPaymentTypes : []).reduce(
    (grouped, walletPaymentType) => {
      const walletId = resolveWalletPaymentTypeWalletId(walletPaymentType);

      if (!walletId) {
        grouped.__unassigned = grouped.__unassigned || [];
        grouped.__unassigned.push(walletPaymentType);
        return grouped;
      }

      if (!grouped[walletId]) {
        grouped[walletId] = [];
      }

      grouped[walletId].push(walletPaymentType);
      return grouped;
    },
    {},
  );

export const isPaymentGateway = gateway => PAYMENT_GATEWAYS.includes(gateway);

export const isPaymentCapableDeviceConfig = deviceConfig =>
  isPaymentGateway(getPaymentGateway(deviceConfig));

export const isRemotePaymentCapableDeviceConfig = deviceConfig =>
  getDeviceConfigType(deviceConfig) === 'PDV' &&
  isPaymentCapableDeviceConfig(deviceConfig);

export const getPaymentDeviceLabel = deviceConfig =>
  resolveDeviceConfigDevice(deviceConfig)?.alias ||
  resolveDeviceConfigDevice(deviceConfig)?.name ||
  resolveDeviceConfigDevice(deviceConfig)?.device ||
  'Device sem nome';

export const getPaymentGatewayLabel = gateway => {
  if (gateway === PAYMENT_GATEWAY_CIELO) return 'Cielo';
  if (gateway === PAYMENT_GATEWAY_INFINITE_PAY) return 'Infinite Pay';
  return 'Gateway nao configurado';
};

export const getCompanyPaymentDeviceOptions = deviceConfigs =>
  (Array.isArray(deviceConfigs) ? deviceConfigs : [])
    .filter(isRemotePaymentCapableDeviceConfig)
    .map(deviceConfig => ({
      alias: getPaymentDeviceLabel(deviceConfig),
      deviceId: getDeviceConfigDeviceId(deviceConfig),
      gateway: getPaymentGateway(deviceConfig),
      gatewayLabel: getPaymentGatewayLabel(getPaymentGateway(deviceConfig)),
      config: deviceConfig,
    }))
    .filter(option => option.deviceId);

export const resolveConfiguredRemotePaymentDeviceIds = ({
  deviceConfig,
  companyConfigs,
}) => {
  const configuredCompanyDeviceIds = normalizeDeviceIds(
    companyConfigs?.[ORDER_PAYMENT_DEVICES_CONFIG_KEY],
  );

  if (configuredCompanyDeviceIds.length > 0) {
    return configuredCompanyDeviceIds;
  }

  const configs = parseConfigsObject(deviceConfig?.configs);
  const preferredDeviceId = normalizeDeviceId(
    configs?.[ORDER_PAYMENT_DEVICE_CONFIG_KEY],
  );

  return preferredDeviceId ? [preferredDeviceId] : [];
};

export const resolveRemotePaymentDeviceOptions = ({
  deviceConfig,
  deviceConfigs,
  companyConfigs,
}) => {
  const currentDeviceId = getDeviceConfigDeviceId(deviceConfig);
  const availableOptions = getCompanyPaymentDeviceOptions(deviceConfigs).filter(
    option => option.deviceId !== currentDeviceId,
  );
  const configuredDeviceIds = resolveConfiguredRemotePaymentDeviceIds({
    deviceConfig,
    companyConfigs,
  });

  if (!configuredDeviceIds.length) {
    return availableOptions;
  }

  const availableOptionsMap = new Map(
    availableOptions.map(option => [option.deviceId, option]),
  );

  const configuredOptions = configuredDeviceIds
    .map(deviceId => availableOptionsMap.get(deviceId))
    .filter(Boolean);

  return configuredOptions.length > 0 ? configuredOptions : availableOptions;
};

export const supportsLocalCardPayment = ({deviceConfig, platform = Platform.OS}) =>
  platform !== 'web' && isPaymentCapableDeviceConfig(deviceConfig);

export const buildWalletIdsForGateway = ({
  gateway,
  companyConfigs,
  includeCashWallet = true,
}) => {
  const walletIds = [];
  const gatewayWallet = companyConfigs?.[`pos-${gateway}-wallet`];
  const cashWallet = companyConfigs?.['pos-cash-wallet'];

  if (gatewayWallet) {
    walletIds.push(gatewayWallet);
  }

  if (includeCashWallet && cashWallet) {
    walletIds.push(cashWallet);
  }

  return walletIds;
};
