import {runCieloCheckoutPayment} from '@controleonline/ui-orders/src/react/services/Cielo/Checkout';
import {runInfinitePayCheckoutPayment} from '@controleonline/ui-orders/src/react/services/InfinitePay/Checkout';

import {
  PAYMENT_GATEWAY_CIELO,
  PAYMENT_GATEWAY_INFINITE_PAY,
} from './paymentDevices';

export const normalizeGatewayPaymentError = (
  error,
  fallback = 'Nao foi possivel concluir o pagamento.',
) => {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  if (typeof error?.result === 'string' && error.result.trim()) {
    return error.result;
  }

  if (typeof error?.error === 'string' && error.error.trim()) {
    return error.error;
  }

  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== '{}' ? serialized : fallback;
  } catch {
    return fallback;
  }
};

export const runConfiguredGatewayPayment = async ({
  gateway = '',
  installments = null,
  order = null,
  orderProducts = [],
  payment = null,
  total = 0,
}) => {
  const resolvedTotal = Number(total || 0);

  if (!payment?.paymentCode) {
    throw new Error('Meio de pagamento sem codigo de gateway.');
  }

  if (resolvedTotal <= 0) {
    throw new Error('Informe um valor de pagamento valido.');
  }

  if (gateway === PAYMENT_GATEWAY_CIELO) {
    const {response, paidAmount} = await runCieloCheckoutPayment({
      orderProducts,
      payment,
      total: resolvedTotal,
    });

    if (!response?.success) {
      throw new Error(normalizeGatewayPaymentError(response?.result));
    }

    return {
      paidAmount,
      response,
    };
  }

  if (gateway === PAYMENT_GATEWAY_INFINITE_PAY) {
    const {response, paidAmount} = await runInfinitePayCheckoutPayment({
      installments,
      order,
      payment,
      total: resolvedTotal,
    });

    if (!response?.success || response?.code === 1 || response?.code === 2) {
      throw response;
    }

    return {
      paidAmount,
      response,
    };
  }

  throw new Error('Gateway de pagamento indisponivel neste device.');
};
