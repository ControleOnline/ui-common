import { api } from '@controleonline/ui-common/src/api';

const normalizeStatusKey = value => String(value || '').trim().toLowerCase();

export const normalizeEntityId = value => {
  if (!value) {
    return '';
  }

  if (typeof value === 'object') {
    return normalizeEntityId(value?.['@id'] || value?.id);
  }

  return String(value).replace(/\D/g, '');
};

export const toEntityIri = (value, resource) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    if (value?.['@id']) {
      return value['@id'];
    }

    const nestedId = normalizeEntityId(value?.id);
    return nestedId ? `/${resource}/${nestedId}` : null;
  }

  const normalizedValue = String(value).trim();
  if (normalizedValue.startsWith('/')) {
    return normalizedValue;
  }

  const normalizedId = normalizeEntityId(normalizedValue);
  return normalizedId ? `/${resource}/${normalizedId}` : null;
};

export const extractCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const buildStatusIriFromId = value => {
  const normalizedId = normalizeEntityId(value);
  return normalizedId ? `/statuses/${normalizedId}` : null;
};

let openOrderStatusIriCache = null;

export const resolveOpenOrderStatusIri = async fallbackStatusId => {
  if (openOrderStatusIriCache) {
    return openOrderStatusIriCache;
  }

  const fallbackIri = buildStatusIriFromId(fallbackStatusId);

  try {
    const response = await api.fetch('statuses', {
      params: {
        context: 'order',
        realStatus: 'open',
        status: 'open',
        itemsPerPage: 10,
      },
    });
    const items = extractCollectionItems(response);
    const matchedStatus =
      items.find(
        item =>
          normalizeStatusKey(item?.realStatus) === 'open' &&
          normalizeStatusKey(item?.status) === 'open',
      ) || items[0];
    const resolvedIri =
      matchedStatus?.['@id'] ||
      buildStatusIriFromId(matchedStatus?.id) ||
      fallbackIri;

    if (resolvedIri) {
      openOrderStatusIriCache = resolvedIri;
    }

    return resolvedIri;
  } catch (error) {
    return fallbackIri;
  }
};

export const isOpenCommercialOrder = order =>
  normalizeStatusKey(order?.status?.realStatus) === 'open' &&
  normalizeStatusKey(order?.status?.status) === 'open';

export const fetchLinkedOrder = async contractRef => {
  if (!contractRef) {
    return null;
  }

  const response = await api.fetch('orders', {
    params: {
      contract: toEntityIri(contractRef, 'contracts'),
      itemsPerPage: 1,
      'order[alterDate]': 'DESC',
    },
  });

  return extractCollectionItems(response)[0] || null;
};

export const fetchOrderProducts = async orderRef => {
  if (!orderRef) {
    return [];
  }

  const response = await api.fetch('order_products', {
    params: {
      order: toEntityIri(orderRef, 'orders'),
      itemsPerPage: 500,
    },
  });

  return extractCollectionItems(response);
};

export const searchCompanyProducts = async ({ companyId, query = '', itemsPerPage = 8 }) => {
  if (!companyId) {
    return [];
  }

  const params = {
    company: toEntityIri(companyId, 'people'),
    active: true,
    itemsPerPage,
    'order[product]': 'ASC',
  };

  if (String(query || '').trim()) {
    params.product = String(query).trim();
  }

  const response = await api.fetch('products', { params });
  return extractCollectionItems(response);
};

export const createLinkedOrder = async ({
  contractRef,
  provider,
  client,
  payer,
  app = 'CRM',
  orderType = 'sale',
  fallbackStatusId = null,
}) => {
  const status = await resolveOpenOrderStatusIri(fallbackStatusId);
  const payload = {
    app,
    orderType,
    contract: toEntityIri(contractRef, 'contracts'),
    provider: toEntityIri(provider, 'people'),
  };

  if (status) {
    payload.status = status;
  }

  const clientIri = toEntityIri(client, 'people');
  if (clientIri) {
    payload.client = clientIri;
  }

  const payerIri = toEntityIri(payer || client, 'people');
  if (payerIri) {
    payload.payer = payerIri;
  }

  return api.fetch('orders', {
    method: 'POST',
    body: payload,
  });
};

export const ensureLinkedOrder = async ({
  contractRef,
  provider,
  client,
  payer,
  app = 'CRM',
  orderType = 'sale',
  fallbackStatusId = null,
}) => {
  const existingOrder = await fetchLinkedOrder(contractRef);
  if (existingOrder) {
    return existingOrder;
  }

  return createLinkedOrder({
    contractRef,
    provider,
    client,
    payer,
    app,
    orderType,
    fallbackStatusId,
  });
};

export const addProductsToOrder = async ({ orderId, products = [] }) => {
  const normalizedOrderId = normalizeEntityId(orderId);
  const normalizedProducts = products
    .map(item => ({
      product: normalizeEntityId(item?.product),
      quantity: Number(item?.quantity || 1),
    }))
    .filter(item => item.product);

  if (!normalizedOrderId || normalizedProducts.length === 0) {
    return null;
  }

  return api.fetch(`orders/${normalizedOrderId}/add-products`, {
    method: 'PUT',
    body: normalizedProducts,
  });
};

export const updateOrderProductQuantity = async ({ orderProductId, quantity }) => {
  const normalizedId = normalizeEntityId(orderProductId);
  if (!normalizedId) {
    return null;
  }

  return api.fetch(`order_products/${normalizedId}`, {
    method: 'PUT',
    body: {
      id: Number(normalizedId),
      quantity: Number(quantity),
    },
  });
};

export const removeOrderProduct = async orderProductId => {
  const normalizedId = normalizeEntityId(orderProductId);
  if (!normalizedId) {
    return null;
  }

  return api.fetch(`order_products/${normalizedId}`, {
    method: 'DELETE',
  });
};

export const fetchLatestProposalForClient = async ({ provider, client }) => {
  const providerIri = toEntityIri(provider, 'people');
  const clientIri = toEntityIri(client, 'people');

  if (!providerIri || !clientIri) {
    return null;
  }

  const response = await api.fetch('contracts', {
    params: {
      provider: providerIri,
      client: clientIri,
      'contractModel.context': 'proposal',
      itemsPerPage: 1,
      'order[alterDate]': 'DESC',
    },
  });

  return extractCollectionItems(response)[0] || null;
};
