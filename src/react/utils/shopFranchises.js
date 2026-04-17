import {api} from '@controleonline/ui-common/src/api';
import {
  extractCollectionItems,
  toEntityIri,
} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders';
import {normalizeShopEntityId} from '@controleonline/ui-common/src/react/utils/shopConfig';

export const SHOP_FRANCHISE_LINK_TYPES = ['franchisee', 'franchise'];

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
  itemsPerPage = 200,
  search = '',
} = {}) => {
  if (!companyId) {
    return [];
  }

  const params = {
    'link.company': toEntityIri(companyId, 'people'),
    'link.linkType': SHOP_FRANCHISE_LINK_TYPES,
    itemsPerPage,
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
  itemsPerPage = 100,
  search = '',
} = {}) => {
  if (!peopleId) {
    return [];
  }

  const params = {
    people: toEntityIri(peopleId, 'people'),
    itemsPerPage,
  };

  if (String(search || '').trim()) {
    params.search = String(search).trim();
  }

  const response = await api.fetch('addresses', {params});
  return extractCollectionItems(response);
};

export const fetchShopFranchiseDirectory = async ({
  companyId,
  companyItemsPerPage = 200,
  addressItemsPerPage = 100,
} = {}) => {
  const companies = await fetchShopFranchiseCompanies({
    companyId,
    itemsPerPage: companyItemsPerPage,
  });

  const directory = await Promise.all(
    companies.map(async company => {
      try {
        const addresses = await fetchShopFranchiseAddresses({
          peopleId: company?.id,
          itemsPerPage: addressItemsPerPage,
        });

        return {
          ...company,
          shopAddresses: Array.isArray(addresses) ? addresses : [],
        };
      } catch {
        return {
          ...company,
          shopAddresses: [],
        };
      }
    }),
  );

  return directory;
};
