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

const normalizeFranchiseDirectoryItem = company => ({
  ...company,
  shopAddresses: Array.isArray(company?.shopAddresses)
    ? company.shopAddresses
    : Array.isArray(company?.address)
      ? company.address
      : [],
});

const sortByLabel = (left, right) =>
  String(left || '')
    .localeCompare(String(right || ''), 'pt-BR', {
      sensitivity: 'base',
    });

const normalizeCategoryCandidate = value => {
  const normalizedId = normalizeShopEntityId(value);

  if (normalizedId) {
    return normalizedId;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value || '').trim();
  }

  return '';
};

export const extractAddressCategoryIds = address => {
  const candidates = [
    address?.categories,
    address?.category,
    address?.addressCategories,
    address?.address_categories,
    address?.categoryAddresses,
    address?.category_addresses,
  ];
  const result = new Set();

  const collect = value => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (typeof value === 'object') {
      [
        value.category,
        value.category_id,
        value.categoryId,
        value.id,
        value['@id'],
      ].forEach(collect);
      return;
    }

    String(value)
      .split(/\r?\n|,/)
      .map(normalizeCategoryCandidate)
      .filter(Boolean)
      .forEach(id => result.add(id));
  };

  candidates.forEach(collect);

  return Array.from(result);
};

export const addressMatchesFranchiseCategoryIds = (
  address,
  categoryIds = [],
) => {
  const selectedCategoryIds = new Set(
    (Array.isArray(categoryIds) ? categoryIds : [])
      .map(normalizeCategoryCandidate)
      .filter(Boolean),
  );

  if (selectedCategoryIds.size === 0) {
    return true;
  }

  return extractAddressCategoryIds(address).some(categoryId =>
    selectedCategoryIds.has(categoryId),
  );
};

export const filterShopFranchiseDirectory = ({
  directory = [],
  visibleCompanyIds = [],
  addressCategoryIds = [],
  legacyVisibleAddressIds = [],
} = {}) => {
  const visibleCompanyIdSet = new Set(
    (Array.isArray(visibleCompanyIds) ? visibleCompanyIds : [])
      .map(normalizeShopEntityId)
      .filter(Boolean),
  );
  const legacyVisibleAddressIdSet = new Set(
    (Array.isArray(legacyVisibleAddressIds) ? legacyVisibleAddressIds : [])
      .map(normalizeShopEntityId)
      .filter(Boolean),
  );

  if (visibleCompanyIdSet.size === 0) {
    return [];
  }

  return (Array.isArray(directory) ? directory : [])
    .map(company => {
      const companyId = normalizeShopEntityId(company);

      if (!visibleCompanyIdSet.has(companyId)) {
        return null;
      }

      const shopAddresses = (company?.shopAddresses || []).filter(address => {
        if (!addressMatchesFranchiseCategoryIds(address, addressCategoryIds)) {
          return false;
        }

        return (
          legacyVisibleAddressIdSet.size === 0 ||
          legacyVisibleAddressIdSet.has(normalizeShopEntityId(address))
        );
      });

      return {
        ...company,
        shopAddresses,
      };
    })
    .filter(Boolean);
};

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
    .map(normalizeFranchiseDirectoryItem)
    .sort((left, right) =>
      sortByLabel(
        resolveFranchiseCompanyLabel(left),
        resolveFranchiseCompanyLabel(right),
      ),
    );
};

export const fetchAllShopFranchiseDirectory = async ({
  companyId,
  publicDirectory = false,
  search = '',
  itemsPerPage = SHOP_FRANCHISE_PAGE_SIZE,
} = {}) => {
  const normalizedItemsPerPage = normalizeItemsPerPage(itemsPerPage);
  const items = [];
  let page = 1;

  while (true) {
    const pageItems = await fetchShopFranchiseCompanies({
      companyId,
      publicDirectory,
      search,
      page,
      itemsPerPage: normalizedItemsPerPage,
    });
    const normalizedPageItems = Array.isArray(pageItems) ? pageItems : [];

    items.push(...normalizedPageItems);

    if (normalizedPageItems.length < normalizedItemsPerPage) {
      break;
    }

    page += 1;
  }

  return items
    .map(normalizeFranchiseDirectoryItem)
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

  return companies.map(normalizeFranchiseDirectoryItem);
};
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
