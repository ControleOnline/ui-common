import {api} from '@controleonline/ui-common/src/api';
import {
  extractCollectionItems,
  toEntityIri,
} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders';
import {normalizeShopEntityId} from '@controleonline/ui-common/src/react/utils/shopConfig';

export const SHOP_FRANCHISE_LINK_TYPE = 'franchisee';
export const SHOP_FRANCHISE_PAGE_SIZE = 50;

const normalizeItemsPerPage = value =>
  Math.max(1, Math.min(SHOP_FRANCHISE_PAGE_SIZE, Number(value) || SHOP_FRANCHISE_PAGE_SIZE));

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
  page = 1,
  itemsPerPage = SHOP_FRANCHISE_PAGE_SIZE,
  publicDirectory = false,
} = {}) => {
  const params = {
    page: Math.max(1, Number(page) || 1),
    itemsPerPage: normalizeItemsPerPage(itemsPerPage),
  };

  if (String(search || '').trim()) {
    params.search = String(search).trim();
  }

  const response = publicDirectory
    ? await api.fetch('/shop/franchises', {params})
    : await api.fetch('people', {
        params: {
          ...params,
          'link.company': toEntityIri(companyId, 'people'),
          'link.linkType': SHOP_FRANCHISE_LINK_TYPE,
        },
      });
  const items = extractCollectionItems(response);

  return items
    .map(company => ({
      ...company,
      shopAddresses: Array.isArray(company?.shopAddresses)
        ? company.shopAddresses
        : Array.isArray(company?.address)
          ? company.address
          : [],
    }))
    .sort((left, right) =>
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
    itemsPerPage: SHOP_FRANCHISE_PAGE_SIZE,
    page: 1,
  };

  if (String(search || '').trim()) {
    params.search = String(search).trim();
  }

  const response = await api.fetch('addresses', {params});
  return extractCollectionItems(response);
};

export const fetchShopFranchiseDirectory = async ({
  companyId,
  publicDirectory = false,
  search = '',
  page = 1,
  itemsPerPage = SHOP_FRANCHISE_PAGE_SIZE,
} = {}) => {
  const companies = await fetchShopFranchiseCompanies({
    companyId,
    publicDirectory,
    search,
    page,
    itemsPerPage,
  });

  return companies.map(company => ({
    ...company,
    shopAddresses: Array.isArray(company?.shopAddresses)
      ? company.shopAddresses
      : Array.isArray(company?.address)
        ? company.address
        : [],
  }));
};
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
