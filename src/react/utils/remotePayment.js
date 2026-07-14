import {getPaymentOptionId, getPaymentOptionLabel} from './paymentOptions';

export const REMOTE_PAYMENT_MESSAGE_STORE = 'invoice';
export const REMOTE_PAYMENT_REQUEST_ACTION = 'pay';
export const REMOTE_PAYMENT_RESULT_ACTION = 'pay-result';
export const REMOTE_PAYMENT_STATUS_SUCCESS = 'success';
export const REMOTE_PAYMENT_STATUS_ERROR = 'error';
export const REMOTE_PAYMENT_STATUS_CANCELED = 'canceled';

const normalizeText = value => String(value || '').trim();

const normalizeSearchText = value =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const EXPLICIT_CANCELLATION_STATUSES = new Set([
  'cancel',
  'canceled',
  'cancelled',
]);

const isCancellationErrorText = value => {
  const text = normalizeSearchText(value);

  if (!text || /(?:nao|not) (?:foi )?(?:possivel )?cancel/.test(text)) {
    return false;
  }

  return (
    /\bcancelad[ao]s?\b/.test(text) ||
    /\bcancell?ed\b/.test(text) ||
    /\bcancelamento\b.*\b(?:usuario|cliente)\b/.test(text)
  );
};

/*
 * @agents A customer cancellation is a neutral terminal outcome. Older remote
 * devices reported it as status=error, so keep the text fallback until every
 * deployed device sends the canonical canceled status.
 */
export const normalizeRemotePaymentResultStatus = ({status, error} = {}) => {
  const normalizedStatus = normalizeText(status).toLowerCase();

  if (normalizedStatus === REMOTE_PAYMENT_STATUS_SUCCESS) {
    return REMOTE_PAYMENT_STATUS_SUCCESS;
  }

  if (
    EXPLICIT_CANCELLATION_STATUSES.has(normalizedStatus) ||
    isCancellationErrorText(error)
  ) {
    return REMOTE_PAYMENT_STATUS_CANCELED;
  }

  return REMOTE_PAYMENT_STATUS_ERROR;
};

export const isRemotePaymentCancellation = result =>
  normalizeRemotePaymentResultStatus(result) === REMOTE_PAYMENT_STATUS_CANCELED;

const normalizeOrderId = value => normalizeText(value).replace(/\D/g, '');

export const normalizeRemotePaymentRequestKey = value => normalizeText(value);

export const buildRemotePaymentRequestKey = ({
  orderId,
  payment,
  targetDeviceId,
}) =>
  [
    normalizeOrderId(orderId) || 'order',
    normalizeText(targetDeviceId) || 'device',
    getPaymentOptionId(payment) || 'payment',
    Date.now().toString(),
  ].join(':');

export const isRemotePaymentRequestMessage = message =>
  normalizeText(message?.action).toLowerCase() ===
  REMOTE_PAYMENT_REQUEST_ACTION;

export const isRemotePaymentResultMessage = message =>
  normalizeText(message?.action).toLowerCase() ===
  REMOTE_PAYMENT_RESULT_ACTION;

export const buildRemotePaymentResultMessage = ({
  destinationDeviceId,
  error = '',
  invoice = null,
  orderId,
  paidAmount = 0,
  payment = null,
  requestKey,
  status = 'error',
  targetDeviceId,
  targetDeviceLabel = '',
  targetGateway = '',
  total = 0,
}) => ({
  destination: normalizeText(destinationDeviceId),
  store: REMOTE_PAYMENT_MESSAGE_STORE,
  action: REMOTE_PAYMENT_RESULT_ACTION,
  requestKey: normalizeRemotePaymentRequestKey(requestKey),
  status: normalizeRemotePaymentResultStatus({status, error}),
  order: normalizeOrderId(orderId),
  total: Number(total || 0),
  paidAmount: Number(paidAmount || 0),
  paymentLabel: getPaymentOptionLabel(payment),
  targetDeviceId: normalizeText(targetDeviceId),
  targetDeviceLabel: normalizeText(targetDeviceLabel),
  targetGateway: normalizeText(targetGateway),
  ...(invoice ? {invoice} : {}),
  ...(error ? {error: normalizeText(error)} : {}),
});
