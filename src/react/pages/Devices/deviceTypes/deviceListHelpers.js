import {
  getPosOperationModeOption,
  isPosCashRegisterOpen,
  parseConfigsObject,
  resolvePosOperationMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  DEFAULT_NETWORK_PRINTER_PORT,
  DISPLAY_DEVICE_TYPE,
  getDeviceConfigType,
  getDeviceTypeLabel,
  getPrinterHost,
  IP_CAMERA_DEVICE_TYPE,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  PDV_DEVICE_TYPE,
  isManagedNetworkDeviceType,
  isPrinterDeviceType,
  normalizeDeviceType,
  normalizePrinterPort,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  getPaymentGateway,
  getPaymentGatewayLabel,
  isPdvPrinterEnabled,
  normalizeDeviceId,
  normalizeEntityId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {getRuntimeFooterDebugInfo} from '@controleonline/ui-common/src/react/utils/runtimeFooter';

export const PAGE_SIZE = 20;
export const API_PAGE_SIZE = 200;

export const tt = (type, key) => global.t?.t('configs', type, key);

export const hex = {
  primary: '#0EA5E9',
  success: '#10b981',
  danger: '#c10015',
  warning: '#e67e22',
};

export const mergeDeviceConfigs = (currentItems = [], nextItems = []) => {
  const currentList = Array.isArray(currentItems) ? currentItems : [];
  const nextList = Array.isArray(nextItems) ? nextItems : [];
  const seenIds = new Set(currentList.map(item => String(item?.id || '')));

  return [
    ...currentList,
    ...nextList.filter(item => {
      const itemId = String(item?.id || '');
      if (!itemId || seenIds.has(itemId)) {
        return false;
      }
      seenIds.add(itemId);
      return true;
    }),
  ];
};

export const isPosDeviceOpen = deviceConfig => {
  const configs = parseConfigsObject(deviceConfig?.configs);
  return isPosCashRegisterOpen(configs);
};

export const getPrinterConnectivityMeta = status => {
  if (status === 'online') {
    return {label: tt('device_status', 'online') || 'Online', tone: 'success'};
  }
  if (status === 'checking') {
    return {label: tt('device_status', 'checking') || 'Verificando...', tone: 'warning'};
  }
  if (status === 'unsupported') {
    return {
      label: tt('device_status', 'unsupported') || 'Sem suporte runtime',
      tone: 'warning',
    };
  }
  return {label: tt('device_status', 'offline') || 'Offline', tone: 'danger'};
};

export const getDeviceIconName = type => {
  const normalizedType = normalizeDeviceType(type);
  if (normalizedType === PDV_DEVICE_TYPE) return 'smartphone';
  if (normalizedType === DISPLAY_DEVICE_TYPE) return 'monitor';
  if (isPrinterDeviceType(normalizedType)) return 'printer';
  if (normalizedType === IP_CAMERA_DEVICE_TYPE) return 'camera';
  return 'cpu';
};

export const getDeviceItemTypeLabel = type => {
  const normalizedType = normalizeDeviceType(type);
  return getDeviceTypeLabel(normalizedType) || normalizedType || 'Device';
};

export const getDeviceBadgeLabel = (type, deviceConfig) => {
  const normalizedType = normalizeDeviceType(type);
  if (normalizedType === PDV_DEVICE_TYPE) {
    const gateway = getPaymentGateway(parseConfigsObject(deviceConfig?.configs));
    return getPaymentGatewayLabel(gateway) || 'PDV';
  }
  return getDeviceItemTypeLabel(normalizedType);
};

export const getDeviceTypeAccent = type => {
  const normalizedType = normalizeDeviceType(type);
  if (normalizedType === PDV_DEVICE_TYPE) return hex.primary;
  if (normalizedType === DISPLAY_DEVICE_TYPE) return hex.success;
  if (isPrinterDeviceType(normalizedType)) return hex.warning;
  if (normalizedType === IP_CAMERA_DEVICE_TYPE) return hex.danger;
  return hex.primary;
};

export const getPosStatusLabel = deviceConfig =>
  isPosDeviceOpen(deviceConfig)
    ? tt('device_status', 'open') || 'Aberto'
    : tt('device_status', 'closed') || 'Fechado';

export const getPosOperationModeLabel = configs => {
  const mode = resolvePosOperationMode(configs);
  const option = getPosOperationModeOption(mode);
  return option?.label || mode || '';
};

export const getDeviceDetailRoute = type => {
  const normalizedType = normalizeDeviceType(type);
  if (normalizedType === IP_CAMERA_DEVICE_TYPE) {
    return 'IpCameraDetail';
  }
  if (isPrinterDeviceType(normalizedType)) {
    return 'PrinterDeviceDetail';
  }
  return 'DeviceDetail';
};

export const getDeviceListIdentifier = deviceConfig =>
  getRuntimeFooterDebugInfo({
    device: deviceConfig?.device || {},
    deviceConfig,
  }).runtimeDetail || String(deviceConfig?.device?.device || '').trim();

/**
 * Build list params for device_configs collection.
 * Always send a single scalar `type` when filtering (API SearchFilter exact).
 * Callers with multiple queryTypes must request each type separately and merge.
 * Empty queryTypes = no type filter (All).
 */
export const buildDeviceListParams = ({
  companyId,
  page,
  pageSize = PAGE_SIZE,
  queryTypes = [],
}) => {
  const params = {
    people: `/people/${companyId}`,
    page,
    itemsPerPage: pageSize,
    'order[id]': 'DESC',
  };

  const types = Array.isArray(queryTypes)
    ? queryTypes.map(t => String(t || '').trim()).filter(Boolean)
    : [];

  if (types.length === 1) {
    params.type = types[0];
  }

  // Multi-type: do NOT set params.type as array — API exact filter is unreliable
  // with type[]= on some platforms; callers must fetch each type and merge.

  return params;
};

/**
 * Expand queryTypes into one or more single-type param sets for sequential fetch.
 * Empty → one set without type (All). Single → one set. Multiple → one set per type.
 */
export const expandDeviceListParamSets = ({
  companyId,
  page,
  pageSize = PAGE_SIZE,
  queryTypes = [],
}) => {
  const types = Array.isArray(queryTypes)
    ? queryTypes.map(t => String(t || '').trim()).filter(Boolean)
    : [];

  if (types.length === 0) {
    return [buildDeviceListParams({companyId, page, pageSize, queryTypes: []})];
  }

  return types.map(type =>
    buildDeviceListParams({companyId, page, pageSize, queryTypes: [type]}),
  );
};

export {
  parseConfigsObject,
  getDeviceConfigType,
  isManagedNetworkDeviceType,
  isPrinterDeviceType,
  normalizeDeviceType,
  normalizeDeviceId,
  normalizeEntityId,
  getPrinterHost,
  normalizePrinterPort,
  DEFAULT_NETWORK_PRINTER_PORT,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  isPdvPrinterEnabled,
};
