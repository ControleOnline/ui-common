import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {isCashPaymentOption} from './paymentOptions';

export const parseMoneyInputValue = value => {
  const numericValue = String(value || '').replace(/\D/g, '');
  if (!numericValue) {
    return 0;
  }

  return Number(numericValue) / 100;
};

export const formatMoneyInputValue = value => {
  const normalizedValue = Number(value || 0);
  if (normalizedValue <= 0) {
    return '';
  }

  return Formatter.formatMoney(normalizedValue);
};

export const normalizeMoneyInputText = text => {
  const numericValue = String(text || '').replace(/\D/g, '');
  if (!numericValue) {
    return '';
  }

  return Formatter.formatMoney(Number(numericValue) / 100);
};

export const resolveCashPaymentDetails = ({
  allowPartial = false,
  receivedAmount = 0,
  totalAmount = 0,
}) => {
  const normalizedReceivedAmount = Math.max(Number(receivedAmount || 0), 0);
  const normalizedTotalAmount = Math.max(Number(totalAmount || 0), 0);
  const appliedAmount = allowPartial
    ? Math.min(normalizedReceivedAmount, normalizedTotalAmount)
    : normalizedTotalAmount;
  const changeAmount = Math.max(normalizedReceivedAmount - appliedAmount, 0);
  const missingAmount = Math.max(normalizedTotalAmount - normalizedReceivedAmount, 0);

  return {
    appliedAmount,
    changeAmount,
    missingAmount,
    needsChange: changeAmount > 0.009,
    receivedAmount: normalizedReceivedAmount,
  };
};

const normalizePaymentCode = value => String(value || '').trim();

export const hasIntegratedPaymentCode = payment =>
  normalizePaymentCode(payment?.paymentCode) !== '';

export const isGatewayFreePayment = payment =>
  !!payment?.wallet && !!payment?.paymentType && !hasIntegratedPaymentCode(payment);

export const isCashPaymentWithoutGateway = payment =>
  isCashPaymentOption(payment) && isGatewayFreePayment(payment);

export const createInvoiceForGatewayFreePayment = async ({
  payment,
  total = 0,
  createInvoice,
}) => {
  if (!isGatewayFreePayment(payment) || typeof createInvoice !== 'function') {
    return false;
  }

  await createInvoice(payment, Number(total || 0));
  return true;
};
