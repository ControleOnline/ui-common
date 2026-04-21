import CieloService from '@controleonline/ui-orders/src/react/services/Cielo/Cielo';
import InfinitePayService from '@controleonline/ui-orders/src/react/services/InfinitePay/InfinitePay';

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

export const formatGatewayOrderProducts = orderProducts =>
  (Array.isArray(orderProducts) ? orderProducts : []).map(orderProduct => ({
    name: orderProduct?.product?.product,
    quantity: orderProduct?.quantity,
    sku:
      orderProduct?.product?.sku ||
      String(orderProduct?.product?.['@id'] || '').replace(/\D/g, ''),
    unitOfMeasure: 'unidade',
    unitPrice: Math.round(Number(orderProduct?.price || 0) * 100).toString(),
  }));

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
    const response = await new CieloService().payment(
      payment.paymentCode,
      formatGatewayOrderProducts(orderProducts),
      Math.round(resolvedTotal * 100).toString(),
    );

    if (!response?.success) {
      throw new Error(normalizeGatewayPaymentError(response?.result));
    }

    return {
      paidAmount: resolvedTotal,
      response,
    };
  }

  if (gateway === PAYMENT_GATEWAY_INFINITE_PAY) {
    const response = await new InfinitePayService().payment(
      payment.paymentCode,
      installments || payment.installments || 1,
      order?.['@id'] || order?.id || '',
      Math.round(resolvedTotal * 100).toString(),
    );

    if (!response?.success || response?.code === 1 || response?.code === 2) {
      throw response;
    }

    return {
      paidAmount:
        Number(response?.result?.paidAmount || 0) > 0
          ? Number(response.result.paidAmount) / 100
          : resolvedTotal,
      response,
    };
  }

  throw new Error('Gateway de pagamento indisponivel neste device.');
};
