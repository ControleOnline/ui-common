import {api} from '@controleonline/ui-common/src/api';
import {
  extractCollectionItems,
  toEntityIri,
} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders';
import {normalizeShopEntityId} from '@controleonline/ui-common/src/react/utils/shopConfig';

export const SHOP_FRANCHISE_LINK_TYPE = 'franchisee';
export const SHOP_FRANCHISE_PAGE_SIZE = 50;

/** people.enable must be 1/true for franchise to appear in settings Maps list (#815). */
export const isPeopleEnabled = people => {
  if (!people || typeof people !== 'object') {
    return false;
  }
  // API may expose enable or enabled (GeneralTab uses both).
  const value = people.enable ?? people.enabled;
  if (value === true || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 0 || value === '0') {
    return false;
  }
  return false;
};

/** Load people.enable from API so people_links embeds without enable are accurate (#815). */
const hydratePeopleEnableFlags = async companies => {
  const list = Array.isArray(companies) ? companies : [];
  const hydrated = await Promise.all(
    list.map(async company => {
      const peopleId = normalizeShopEntityId(company);
      if (!peopleId) {
        return company;
      }
      const existing = company?.enable ?? company?.enabled;
      if (
        existing === true ||
        existing === false ||
        existing === 0 ||
        existing === 1 ||
        existing === '0' ||
        existing === '1'
      ) {
        return company;
      }
      try {
        const person = await api.fetch(`people/${peopleId}`);
        if (person && typeof person === 'object') {
          return {
            ...company,
            enable: person.enable ?? person.enabled ?? company.enable,
            enabled: person.enabled ?? person.enable ?? company.enabled,
          };
        }
      } catch (_) {}
      return company;
    }),
  );
  return hydrated;
};


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
  if (!viewerId || link?.linkType !== SHOP_FRANCHISE_LINK_TYPE) {
    return null;
  }

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

  // Never trust an API response that does not prove the current company is
  // one side of the link. This prevents a broad/ignored people_links filter
  // from leaking another tenant's franchise or its addresses.
  return null;
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
    // linkType must be array — API rejects string
    // Do NOT filter enable=true: many franchisee rows omit/null enable and would vanish (staging company=1 had 4 franchisees, 0 with enable=true).
    linkType: [String(SHOP_FRANCHISE_LINK_TYPE)],
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

  // Primary path matches FranchiseLinksTab: company=<id>&linkType[]=franchisee
  // Fallback dual-side only if no authorized company-side link is returned
  // (inverted associations). The API response is filtered again below because
  // authorization cannot depend on a query parameter being honored remotely.
  const sidesToTry = ['company', 'people'];

  for (const side of sidesToTry) {
    let page = 1;
    let gotAuthorizedAny = false;
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
        gotAuthorizedAny = true;
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

    // If company-side returned an authorized franchise, skip people-side
    // (avoids duplicate requests while preserving the inverted-link fallback).
    if (side === 'company' && gotAuthorizedAny) {
      break;
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

  const linkedCompanies = await fetchFranchiseCompaniesFromLinks({
    companyId,
    search,
    itemsPerPage,
  });
  // Hydrate enable from /people/{id} when people_links embed omits the flag (#815)
  const companies = (await hydratePeopleEnableFlags(linkedCompanies)).filter(
    isPeopleEnabled,
  );

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
