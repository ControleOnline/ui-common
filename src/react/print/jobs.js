import {normalizeDeviceId} from '@controleonline/ui-common/src/react/utils/paymentDevices';

export const PRINT_JOB_TYPE_ORDER = 'order';
export const PRINT_JOB_TYPE_ORDER_PRODUCT = 'order-product';
export const PRINT_JOB_TYPE_CASH_REGISTER = 'cash-register';
export const PRINT_JOB_TYPE_PURCHASING_SUGGESTION = 'purchasing-suggestion';
export const PRINT_JOB_TYPE_INVENTORY = 'inventory';
export const PRINT_JOB_TYPE_SPOOL = 'spool';

export const PRINT_CONTEXT_DEVICE = 'device';
export const PRINT_CONTEXT_DISPLAY = 'display';
export const PRINT_CONTEXT_SPOOL = 'spool';

const normalizeEntityId = value =>
  String(value || '')
    .replace(/\D+/g, '')
    .trim();

const normalizeIds = value =>
  (Array.isArray(value) ? value : [value])
    .map(item => normalizeEntityId(item))
    .filter(Boolean);

export const buildPrintSelectionKey = ({
  companyId = '',
  contextType = PRINT_CONTEXT_DEVICE,
  deviceId = '',
  displayId = '',
} = {}) =>
  [
    String(contextType || PRINT_CONTEXT_DEVICE).trim().toLowerCase(),
    normalizeEntityId(companyId),
    normalizeDeviceId(deviceId),
    normalizeEntityId(displayId),
  ]
    .filter(Boolean)
    .join(':');

export const buildPrintRequestKey = ({
  type = '',
  id = '',
  orderId = '',
  orderProductId = '',
  spoolId = '',
  selectionKey = '',
} = {}) =>
  [
    String(type || '').trim().toLowerCase(),
    normalizeEntityId(id),
    normalizeEntityId(orderId),
    normalizeEntityId(orderProductId),
    normalizeEntityId(spoolId),
    String(selectionKey || '').trim(),
  ]
    .filter(Boolean)
    .join(':');

export const normalizePrintJob = ({
  job = {},
  fallbackType = '',
  fallbackId = '',
} = {}) => {
  const type = String(job?.type || fallbackType || '')
    .trim()
    .toLowerCase();

  if (!type) {
    return null;
  }

  if (type === PRINT_JOB_TYPE_SPOOL) {
    const spoolId = normalizeEntityId(job?.spoolId || job?.id || fallbackId);
    return spoolId ? {type, spoolId} : null;
  }

  if (type === PRINT_JOB_TYPE_ORDER_PRODUCT) {
    const orderProductId = normalizeEntityId(
      job?.orderProductId || job?.id || fallbackId,
    );
    if (!orderProductId) {
      return null;
    }

    return {
      type,
      orderProductId,
      orderProductQueueIds: normalizeIds(job?.orderProductQueueIds),
    };
  }

  if (type === PRINT_JOB_TYPE_ORDER) {
    const orderId = normalizeEntityId(job?.orderId || job?.id || fallbackId);
    if (!orderId) {
      return null;
    }

    return {
      type,
      orderId,
      queueIds: normalizeIds(job?.queueIds),
      orderProductQueueIds: normalizeIds(job?.orderProductQueueIds),
    };
  }

  if (
    [
      PRINT_JOB_TYPE_CASH_REGISTER,
      PRINT_JOB_TYPE_PURCHASING_SUGGESTION,
      PRINT_JOB_TYPE_INVENTORY,
    ].includes(type)
  ) {
    return {type};
  }

  return null;
};
