import {api} from '@controleonline/ui-common/src/api';

const extractCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const extractItem = response => {
  if (response?.response?.data && typeof response.response.data === 'object') {
    return response.response.data;
  }

  return response && typeof response === 'object' && !Array.isArray(response)
    ? response
    : null;
};

const normalizeEntityIri = entityIri =>
  typeof entityIri === 'string' ? entityIri.trim() : '';

// Mantemos o acesso ao backend do historico concentrado nesta store.
export const getTimeline = ({getters}, params = {}) => {
  const itemsPerPage = Number(params?.itemsPerPage) || 100;
  const query = {
    itemsPerPage,
    type: 'entity',
    'order[createdAt]': 'desc',
    ...(params || {}),
  };

  return api.fetch(getters.resourceEndpoint, {params: query}).then(response => {
    const items = extractCollectionItems(response);

    return {
      items,
      summary: response?.summary || {},
      totalItems: Number(
        response?.totalItems || response?.['hydra:totalItems'] || items.length || 0,
      ),
    };
  });
};

export const getEntityDetail = (_context, entityIri = '') => {
  const normalizedEntityIri = normalizeEntityIri(entityIri);
  if (!normalizedEntityIri) {
    throw new Error('Entidade sem identificador para consulta.');
  }

  return api.fetch(normalizedEntityIri).then(response => {
    const item = extractItem(response);
    if (!item) {
      throw new Error('Resposta vazia para a entidade.');
    }

    return item;
  });
};
