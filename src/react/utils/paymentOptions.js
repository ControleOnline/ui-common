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
      payment?.wallet ||
      payment?.destinationWallet?.['@id'] ||
      payment?.destinationWallet?.id ||
      payment?.destinationWallet ||
      payment?.sourceWallet?.['@id'] ||
      payment?.sourceWallet?.id ||
      payment?.sourceWallet,
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
      payment?.wallet?.name ||
      payment?.wallet?.alias ||
      payment?.destinationWallet?.wallet ||
      payment?.destinationWallet?.name ||
      payment?.destinationWallet?.alias ||
      payment?.sourceWallet?.wallet ||
      payment?.sourceWallet?.name ||
      payment?.sourceWallet?.alias ||
      '',
  ).trim();

export const isIntegratedPaymentOption = payment =>
  normalizeText(payment?.paymentCode) !== '';

export const detectPaymentOptionKind = payment => {
  const text = normalizeText(
    `${getPaymentOptionLabel(payment)} ${payment?.paymentCode || ''}`,
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

  if (text.includes('dinh') || text.includes('cash')) {
    return 'cash';
  }

  return 'other';
};

export const isCashPaymentOption = payment =>
  detectPaymentOptionKind(payment) === 'cash';
