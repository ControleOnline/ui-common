/*
 * Regra de negocio: a identidade operacional nao pode inventar codigo de
 * marketplace. O resolvedor usa apenas campos canonicos do pedido.
 */

const normalizeText = value => String(value ?? '').trim();

const normalizeKey = value =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const formatOrderCode = value => {
  const normalized = normalizeText(value);
  return normalized ? `#${normalized}` : '';
};

const isObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const parseJsonObject = value => {
  if (isObject(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') {
      return parseJsonObject(parsed);
    }

    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const getExtraDataList = order => {
  if (Array.isArray(order?.extraData)) {
    return order.extraData;
  }

  if (Array.isArray(order?.extra_data)) {
    return order.extra_data;
  }

  return [];
};

const getExtraDataMap = order =>
  getExtraDataList(order).reduce((currentMap, extraData) => {
    const context = normalizeKey(
      extraData?.extra_fields?.context || extraData?.extraFields?.context,
    );
    const name = normalizeText(
      extraData?.extra_fields?.name || extraData?.extraFields?.name,
    );
    const value = normalizeText(extraData?.value);

    if (!context || !name || !value) {
      return currentMap;
    }

    if (!currentMap[context]) {
      currentMap[context] = {};
    }

    currentMap[context][name] = value;
    return currentMap;
  }, {});

const decodeOrderOtherInformations = order =>
  parseJsonObject(
    order?.otherInformations ??
      order?.other_information ??
      order?.otherInformation ??
      order?.otherInformationsJson ??
      order?.other_information_json,
  );

const getContextFromOtherInformations = (order, context) => {
  const otherInformations = decodeOrderOtherInformations(order);
  const matchedKey = Object.keys(otherInformations).find(
    key => normalizeKey(key) === normalizeKey(context),
  );

  if (!matchedKey) {
    return {};
  }

  const matchedValue = otherInformations?.[matchedKey];
  return isObject(matchedValue) ? matchedValue : parseJsonObject(matchedValue);
};

const findNestedFieldValue = (source, fieldName) => {
  if (Array.isArray(source)) {
    for (const entry of source) {
      const nestedValue = findNestedFieldValue(entry, fieldName);
      if (nestedValue) {
        return nestedValue;
      }
    }

    return '';
  }

  if (!isObject(source)) {
    return '';
  }

  const normalizedFieldName = normalizeKey(fieldName);
  const matchedKey = Object.keys(source).find(
    key => normalizeKey(key) === normalizedFieldName,
  );

  if (matchedKey) {
    const directValue = normalizeText(source?.[matchedKey]);
    if (directValue) {
      return directValue;
    }
  }

  for (const value of Object.values(source)) {
    const nestedValue = findNestedFieldValue(value, fieldName);
    if (nestedValue) {
      return nestedValue;
    }
  }

  return '';
};

const getMarketplaceField = (order, contexts, fieldName) => {
  const extraDataMap = getExtraDataMap(order);

  for (const context of contexts) {
    const value = normalizeText(extraDataMap?.[normalizeKey(context)]?.[fieldName]);
    if (value) {
      return value;
    }
  }

  for (const context of contexts) {
    const value = findNestedFieldValue(
      getContextFromOtherInformations(order, context),
      fieldName,
    );
    if (value) {
      return value;
    }
  }

  return '';
};

const resolveMarketplaceLabel = order => {
  const normalizedApp = normalizeText(order?.app).toLowerCase();

  if (normalizedApp.includes('99')) {
    return '99';
  }

  if (normalizedApp.includes('ifood')) {
    return 'IFOOD';
  }

  return normalizeText(order?.app).toUpperCase();
};

const resolveMarketplaceOrderCodeFromOrder = order => {
  const normalizedApp = normalizeText(order?.app).toLowerCase();

  if (normalizedApp.includes('99')) {
    return getMarketplaceField(order, ['Food99', '99Food', '99food'], 'code');
  }

  if (normalizedApp.includes('ifood')) {
    return getMarketplaceField(order, ['iFood', 'IFood', 'ifood'], 'code');
  }

  return '';
};

const resolveMarketplaceOrderCodeFromSummary = remoteOrderSummary => {
  if (!remoteOrderSummary || typeof remoteOrderSummary !== 'object') {
    return '';
  }

  return normalizeText(
    remoteOrderSummary?.identifiers?.code ||
      remoteOrderSummary?.identifiers?.externalId ||
      remoteOrderSummary?.code ||
      remoteOrderSummary?.externalId ||
      remoteOrderSummary?.external_code,
  );
};

const resolvePosExternalCode = order =>
  normalizeText(
    normalizeText(order?.app).toUpperCase() === 'POS'
      ? order?.externalCode || order?.external_code || order?.externalId
      : '',
  );

const resolvePosExternalLabel = () =>
  global.t?.t('orders', 'title', 'table') || 'Table';

export const resolveMarketplaceAppLabel = order => resolveMarketplaceLabel(order);

export const resolveMarketplaceOrderCode = (
  order,
  remoteOrderSummary = null,
) =>
  resolveMarketplaceOrderCodeFromSummary(remoteOrderSummary) ||
  resolveMarketplaceOrderCodeFromOrder(order);

export const resolveOrderIdentityRemoteSummary = (
  order,
  remoteOrderSummary = null,
) => remoteOrderSummary || null;

export const resolveOrderIdentity = (order, remoteOrderSummary = null) => {
  const effectiveRemoteOrderSummary = resolveOrderIdentityRemoteSummary(
    order,
    remoteOrderSummary,
  );
  const internalId = normalizeText(order?.id);
  const marketplaceLabel = resolveMarketplaceAppLabel(order);
  const marketplaceOrderCode = resolveMarketplaceOrderCode(
    order,
    effectiveRemoteOrderSummary,
  );
  const posExternalCode = resolvePosExternalCode(order);
  const hasMarketplaceReference = !!marketplaceLabel && !!marketplaceOrderCode;

  if (posExternalCode) {
    return {
      internalId,
      externalId: posExternalCode,
      externalLabel: '',
      hasMarketplaceReference: false,
      primaryText: [resolvePosExternalLabel(), formatOrderCode(posExternalCode)]
        .filter(Boolean)
        .join(' '),
      secondaryText:
        normalizeText(posExternalCode) === internalId
          ? ''
          : formatOrderCode(internalId),
    };
  }

  if (hasMarketplaceReference) {
    return {
      internalId,
      externalId: marketplaceOrderCode,
      externalLabel: marketplaceLabel,
      hasMarketplaceReference: true,
      primaryText: formatOrderCode(marketplaceOrderCode),
      secondaryText: formatOrderCode(internalId),
    };
  }

  return {
    internalId,
    externalId: '',
    externalLabel: '',
    hasMarketplaceReference: false,
    primaryText:
      formatOrderCode(internalId) || global.t?.t('orders', 'title', 'order'),
    secondaryText: '',
  };
};
