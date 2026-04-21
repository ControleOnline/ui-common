import {getPaymentOptionId, getPaymentOptionLabel} from './paymentOptions';

export const REMOTE_PAYMENT_MESSAGE_STORE = 'invoice';
export const REMOTE_PAYMENT_REQUEST_ACTION = 'pay';
export const REMOTE_PAYMENT_RESULT_ACTION = 'pay-result';

const normalizeText = value => String(value || '').trim();

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
  status: normalizeText(status).toLowerCase() === 'success' ? 'success' : 'error',
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
