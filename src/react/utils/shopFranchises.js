import {api} from '@controleonline/ui-common/src/api';
import {
  extractCollectionItems,
  toEntityIri,
} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders';
import {normalizeShopEntityId} from '@controleonline/ui-common/src/react/utils/shopConfig';

export const SHOP_FRANCHISE_LINK_TYPE = 'franchisee';

const sortByLabel = (left, right) =>
  String(left || '')
    .localeCompare(String(right || ''), 'pt-BR', {
      sensitivity: 'base',
    });

export const resolveFranchiseCompanyLabel = company =>
  String(company?.alias || company?.name || '').trim() ||
  `Franquia #${normalizeShopEntityId(company) || ''}`.trim();

export const fetchShopFranchiseCompanies = async ({
  companyId,
  search = '',
} = {}) => {
  if (!companyId) {
    return [];
  }

  const params = {
    'link.company': toEntityIri(companyId, 'people'),
    'link.linkType': SHOP_FRANCHISE_LINK_TYPE,
  };

  if (String(search || '').trim()) {
    params.search = String(search).trim();
  }

  const response = await api.fetch('people', {params});
  const items = extractCollectionItems(response);

  return items.sort((left, right) =>
    sortByLabel(
      resolveFranchiseCompanyLabel(left),
      resolveFranchiseCompanyLabel(right),
    ),
  );
};

export const fetchShopFranchiseAddresses = async ({
  peopleId,
  search = '',
} = {}) => {
  if (!peopleId) {
    return [];
  }

  const params = {
    people: toEntityIri(peopleId, 'people'),
  };

  if (String(search || '').trim()) {
    params.search = String(search).trim();
  }

  const response = await api.fetch('addresses', {params});
  return extractCollectionItems(response);
};

export const fetchShopFranchiseDirectory = async ({
  companyId,
} = {}) => {
  const companies = await fetchShopFranchiseCompanies({
    companyId,
  });

  return companies.map(company => ({
    ...company,
    shopAddresses: Array.isArray(company?.address) ? company.address : [],
  }));
};
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
