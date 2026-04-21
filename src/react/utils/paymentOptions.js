const normalizeText = value =>
  String(value || '')
    .trim()
    .toLowerCase();

const normalizeEntityId = value => {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return normalizeEntityId(value?.['@id'] || value?.id);
  }

  return String(value).replace(/\D+/g, '').trim();
};

export const getPaymentOptionId = payment =>
  normalizeEntityId(
    payment?.paymentType?.['@id'] ||
      payment?.paymentType?.id ||
      payment?.paymentType ||
      payment?.id,
  );

export const getPaymentOptionWalletId = payment =>
  normalizeEntityId(
    payment?.wallet?.['@id'] ||
      payment?.wallet?.id ||
      payment?.wallet,
  );

export const getInvoiceDestinationWalletId = invoice =>
  normalizeEntityId(
    invoice?.destinationWallet?.['@id'] ||
      invoice?.destinationWallet?.id ||
      invoice?.destinationWallet,
  );

export const getPaymentOptionLabel = payment =>
  String(
    payment?.paymentType?.paymentType ||
      payment?.paymentType?.name ||
      payment?.paymentCode ||
      'Pagamento',
  ).trim() || 'Pagamento';

export const getPaymentOptionWalletLabel = payment =>
  String(
    payment?.wallet?.wallet ||
      '',
  ).trim();

export const isIntegratedPaymentOption = payment =>
  normalizeText(payment?.paymentCode) !== '';

export const detectPaymentOptionKind = payment => {
  const text = normalizeText(
    `${getPaymentOptionLabel(payment)} ${getPaymentOptionWalletLabel(payment)} ${payment?.paymentCode || ''}`,
  );

  if (text.includes('pix')) return 'pix';

  if (
    text.includes('cart') ||
    text.includes('credito') ||
    text.includes('credit') ||
    text.includes('debito') ||
    text.includes('debit')
  ) {
    return 'card';
  }

  if (
    text.includes('dinh') ||
    text.includes('cash') ||
    text.includes('espec') ||
    text.includes('moeda') ||
    text.includes('papel')
  ) {
    return 'cash';
  }

  return 'other';
};

export const isCashPaymentOption = payment =>
  detectPaymentOptionKind(payment) === 'cash';
