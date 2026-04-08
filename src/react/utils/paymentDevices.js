import {Platform} from 'react-native';

export const PAYMENT_GATEWAYS = ['cielo', 'infinite-pay'];
export const ORDER_PAYMENT_DEVICES_CONFIG_KEY = 'order-payment-devices';
export const ORDER_PAYMENT_DEVICE_CONFIG_KEY = 'order-payment-device';

const parseJsonValue = (value, fallback) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }

  return value;
};

export const normalizeDeviceId = value => String(value || '').trim();

export const normalizeDeviceIds = value => {
  const parsed = parseJsonValue(value, []);

  if (Array.isArray(parsed)) {
    return parsed.map(normalizeDeviceId).filter(Boolean);
  }

  const singleId = normalizeDeviceId(parsed);
  return singleId ? [singleId] : [];
};

export const getPaymentGateway = deviceConfig =>
  String(deviceConfig?.configs?.['pos-gateway'] || '')
    .trim()
    .toLowerCase();

export const isPaymentGateway = gateway => PAYMENT_GATEWAYS.includes(gateway);

export const isPaymentCapableDeviceConfig = deviceConfig =>
  isPaymentGateway(getPaymentGateway(deviceConfig));

export const getPaymentDeviceLabel = deviceConfig =>
  deviceConfig?.device?.alias ||
  deviceConfig?.device?.name ||
  deviceConfig?.device?.device ||
  'Device sem nome';

export const getPaymentGatewayLabel = gateway => {
  if (gateway === 'cielo') return 'Cielo';
  if (gateway === 'infinite-pay') return 'Infinite Pay';
  return 'Gateway nao configurado';
};

export const getCompanyPaymentDeviceOptions = deviceConfigs =>
  (Array.isArray(deviceConfigs) ? deviceConfigs : [])
    .filter(isPaymentCapableDeviceConfig)
    .map(deviceConfig => ({
      alias: getPaymentDeviceLabel(deviceConfig),
      deviceId: normalizeDeviceId(deviceConfig?.device?.device),
      gateway: getPaymentGateway(deviceConfig),
      gatewayLabel: getPaymentGatewayLabel(getPaymentGateway(deviceConfig)),
      config: deviceConfig,
    }))
    .filter(option => option.deviceId);

export const resolveConfiguredRemotePaymentDeviceIds = ({
  deviceConfig,
  companyConfigs,
}) => {
  const preferredDeviceId = normalizeDeviceId(
    deviceConfig?.configs?.[ORDER_PAYMENT_DEVICE_CONFIG_KEY],
  );

  if (preferredDeviceId) {
    return [preferredDeviceId];
  }

  return normalizeDeviceIds(
    companyConfigs?.[ORDER_PAYMENT_DEVICES_CONFIG_KEY],
  );
};

export const resolveRemotePaymentDeviceOptions = ({
  deviceConfig,
  deviceConfigs,
  companyConfigs,
}) => {
  const availableOptions = getCompanyPaymentDeviceOptions(deviceConfigs);
  const configuredDeviceIds = resolveConfiguredRemotePaymentDeviceIds({
    deviceConfig,
    companyConfigs,
  });

  if (!configuredDeviceIds.length) {
    return [];
  }

  const availableOptionsMap = new Map(
    availableOptions.map(option => [option.deviceId, option]),
  );

  return configuredDeviceIds
    .map(deviceId => availableOptionsMap.get(deviceId))
    .filter(Boolean);
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
