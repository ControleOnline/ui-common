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

const parseCoordValue = value => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Coords may live on the address root or under address.map (API / DefaultAddress). */
export const resolveFranchiseAddressCoords = address => {
  if (!address || typeof address !== 'object') {
    return {latitude: null, longitude: null};
  }
  const latitude = parseCoordValue(
    address.latitude ??
      address.lat ??
      address?.map?.latitude ??
      address?.map?.lat ??
      address?.geo?.latitude,
  );
  const longitude = parseCoordValue(
    address.longitude ??
      address.lng ??
      address.lon ??
      address?.map?.longitude ??
      address?.map?.lng ??
      address?.map?.lon ??
      address?.geo?.longitude,
  );
  return {latitude, longitude};
};

const normalizeFranchiseAddress = address => {
  if (!address || typeof address !== 'object') {
    return address;
  }
  const {latitude, longitude} = resolveFranchiseAddressCoords(address);
  return {
    ...address,
    latitude,
    longitude,
  };
};

const normalizeFranchiseDirectoryItem = company => {
  const rawAddresses = Array.isArray(company?.shopAddresses)
    ? company.shopAddresses
    : Array.isArray(company?.address)
      ? company.address
      : [];

  return {
    ...company,
    shopAddresses: rawAddresses.map(normalizeFranchiseAddress),
  };
};

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

/**
 * Resolve the franchise company entity from a people_link relative to the
 * viewed franchisor/company id. DB rows may store the viewed company as
 * `company` or as `people` (inverted association).
 */
export const extractFranchiseCompanyFromLink = (link, viewerCompanyId) => {
  const viewerId = normalizeShopEntityId(viewerCompanyId);
  const companySide = link?.company;
  const peopleSide = link?.people;
  const companyId = normalizeShopEntityId(companySide);
  const peopleId = normalizeShopEntityId(peopleSide);

  if (viewerId && companyId === viewerId) {
    return peopleSide;
  }
  if (viewerId && peopleId === viewerId) {
    return companySide;
  }
  // Fallback: franchisee is typically the `people` side of linkType=franchisee.
  return peopleSide || companySide || null;
};

const fetchFranchiseLinksPage = async ({
  companyId,
  side,
  page = 1,
  itemsPerPage = SHOP_FRANCHISE_PAGE_SIZE,
  search = '',
}) => {
  const id = normalizeShopEntityId(companyId);
  if (!id) {
    return [];
  }

  // Align with FranchiseLinksTab (ui-customers): numeric company/people id + enable.
  const params = {
    page: Math.max(1, Number(page) || 1),
    itemsPerPage: normalizeItemsPerPage(itemsPerPage),
    linkType: [SHOP_FRANCHISE_LINK_TYPE],
    enable: true,
  };

  if (side === 'company') {
    params.company = id;
  } else if (side === 'people') {
    params.people = id;
  } else {
    params[side] = toEntityIri(id, 'people');
  }

  if (String(search || '').trim()) {
    params.search = String(search).trim();
  }

  const response = await api.fetch('people_links', {params});
  return extractCollectionItems(response);
};

/**
 * Authenticated franchise directory via people_links (both sides).
 * GET /people?link.company=… does not reliably return franchisee PJs.
 */
const fetchFranchiseCompaniesFromLinks = async ({
  companyId,
  search = '',
  itemsPerPage = SHOP_FRANCHISE_PAGE_SIZE,
} = {}) => {
  const viewerId = normalizeShopEntityId(companyId);
  if (!viewerId) {
    return [];
  }

  const pageSize = normalizeItemsPerPage(itemsPerPage);
  const byId = new Map();

  for (const side of ['company', 'people']) {
    let page = 1;
    while (true) {
      const links = await fetchFranchiseLinksPage({
        companyId: viewerId,
        side,
        page,
        itemsPerPage: pageSize,
        search,
      });
      const pageLinks = Array.isArray(links) ? links : [];

      pageLinks.forEach(link => {
        const franchise = extractFranchiseCompanyFromLink(link, viewerId);
        const franchiseId = normalizeShopEntityId(franchise);
        if (!franchiseId || franchiseId === viewerId) {
          return;
        }
        if (!byId.has(franchiseId)) {
          byId.set(
            franchiseId,
            typeof franchise === 'object' && franchise
              ? franchise
              : {id: franchiseId},
          );
        }
      });

      if (pageLinks.length < pageSize) {
        break;
      }
      page += 1;
    }
  }

  return Array.from(byId.values())
    .map(normalizeFranchiseDirectoryItem)
    .sort((left, right) =>
      sortByLabel(
        resolveFranchiseCompanyLabel(left),
        resolveFranchiseCompanyLabel(right),
      ),
    );
};

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

  if (publicDirectory) {
    const response = await api.fetch('/shop/franchises', {params});
    const items = extractCollectionItems(response);
    return items
      .map(normalizeFranchiseDirectoryItem)
      .sort((left, right) =>
        sortByLabel(
          resolveFranchiseCompanyLabel(left),
          resolveFranchiseCompanyLabel(right),
        ),
      );
  }

  // Management path: people_links dual-side (company + people).
  // Page param is ignored for dual aggregation; callers that need full list
  // should use fetchAllShopFranchiseDirectory.
  const all = await fetchFranchiseCompaniesFromLinks({
    companyId,
    search,
    itemsPerPage,
  });
  const start = (Math.max(1, Number(page) || 1) - 1) * normalizeItemsPerPage(itemsPerPage);
  return all.slice(start, start + normalizeItemsPerPage(itemsPerPage));
};

export const fetchAllShopFranchiseDirectory = async ({
  companyId,
  publicDirectory = false,
  search = '',
  itemsPerPage = SHOP_FRANCHISE_PAGE_SIZE,
} = {}) => {
  if (publicDirectory) {
    const normalizedItemsPerPage = normalizeItemsPerPage(itemsPerPage);
    const items = [];
    let page = 1;

    while (true) {
      const pageItems = await fetchShopFranchiseCompanies({
        companyId,
        publicDirectory: true,
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
  }

  const companies = await fetchFranchiseCompaniesFromLinks({
    companyId,
    search,
    itemsPerPage,
  });

  // Always load addresses from /addresses so lat/long (and map.*) are present.
  // people_link embeds are often stubs without coordinates.
  const enriched = await Promise.all(
    companies.map(async company => {
      const peopleId = normalizeShopEntityId(company);
      if (!peopleId) {
        return normalizeFranchiseDirectoryItem(company);
      }
      try {
        const addresses = await fetchShopFranchiseAddresses({peopleId});
        if (Array.isArray(addresses) && addresses.length > 0) {
          return normalizeFranchiseDirectoryItem({
            ...company,
            shopAddresses: addresses,
          });
        }
      } catch {
        // fall through to embedded addresses
      }
      return normalizeFranchiseDirectoryItem(company);
    }),
  );

  return enriched.sort((left, right) =>
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
