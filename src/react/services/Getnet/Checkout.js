import GetnetService from './Getnet';

/**
 * Map wallet paymentCode / paymentType label to Getnet deeplink paymentType.
 */
export const resolveGetnetPaymentType = payment => {
  const raw = String(
    payment?.paymentCode ||
      payment?.paymentType?.paymentType ||
      payment?.paymentType?.name ||
      payment?.type ||
      '',
  )
    .trim()
    .toLowerCase();

  if (!raw) return 'credit';

  if (raw.includes('pix')) return 'pix';
  if (raw.includes('debit') || raw.includes('debito') || raw.includes('débito')) {
    return 'debit';
  }
  if (raw.includes('voucher') || raw.includes('vr') || raw.includes('va')) {
    return 'voucher';
  }
  if (raw.includes('credit') || raw.includes('credito') || raw.includes('crédito')) {
    return 'credit';
  }

  return 'credit';
};

export const runGetnetCheckoutPayment = async ({
  installments = null,
  order = null,
  payment = null,
  total = 0,
}) => {
  const resolvedTotal = Number(total || 0);

  if (resolvedTotal <= 0) {
    throw new Error('Informe um valor de pagamento valido.');
  }

  const orderId =
    order?.id ||
    String(order?.['@id'] || '')
      .split('/')
      .pop() ||
    '';

  const callerId = `getnet-${orderId || 'order'}-${Date.now()}`;
  const paymentType = resolveGetnetPaymentType(payment);
  const resolvedInstallments =
    Number(installments || payment?.installments || 1) || 1;

  const response = await new GetnetService().payment({
    amount: resolvedTotal,
    paymentType,
    callerId,
    installments: resolvedInstallments,
    orderId: orderId ? String(orderId) : undefined,
    allowPrintCurrentTransaction: true,
  });

  if (!response?.success) {
    const detail =
      response?.result?.resultDetails ||
      response?.result?.result ||
      response?.code ||
      'Pagamento Getnet nao aprovado.';
    throw new Error(
      typeof detail === 'string' ? detail : JSON.stringify(detail),
    );
  }

  return {
    paidAmount: resolvedTotal,
    response,
  };
};
