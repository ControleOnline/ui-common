jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: jest.fn(),
  },
}));

const {api} = require('@controleonline/ui-common/src/api');
const {
  extractAddressCategoryIds,
  filterShopFranchiseDirectory,
  fetchAllShopFranchiseDirectory,
  fetchShopFranchiseDirectory,
  extractFranchiseCompanyFromLink,
} = require('../../../react/utils/shopFranchises');

const {beforeEach, describe, expect, it} = global;

describe('shopFranchises', () => {
  beforeEach(() => {
    api.fetch.mockReset();
  });

  it('uses the public shop franchises endpoint and preserves shop addresses', async () => {
    api.fetch.mockResolvedValueOnce({
      member: [
        {
          id: 21,
          alias: 'Centro',
          shopAddresses: [{id: 501, nickname: 'Loja Centro'}],
        },
      ],
      'hydra:member': [
        {
          id: 21,
          alias: 'Centro',
          shopAddresses: [{id: 501, nickname: 'Loja Centro'}],
        },
      ],
    });

    const directory = await fetchShopFranchiseDirectory({
      companyId: 10,
      publicDirectory: true,
    });

    expect(api.fetch).toHaveBeenCalledWith('/shop/franchises', {
      params: {
        itemsPerPage: 50,
        page: 1,
      },
    });
    expect(directory).toEqual([
      {
        id: 21,
        alias: 'Centro',
        shopAddresses: [{id: 501, nickname: 'Loja Centro', latitude: null, longitude: null}],
      },
    ]);
  });

  it('uses an authorized company-side link without duplicate fallback requests', async () => {
    api.fetch.mockResolvedValueOnce({id: 10, '@type': 'Company'});
    api.fetch
      .mockResolvedValueOnce({
        member: [
          {
            id: 51,
            linkType: 'franchisee',
            company: {id: 10, alias: 'Franchisor'},
            people: {
              id: 22,
              alias: 'Norte',
              address: [{id: 601, nickname: 'Loja Norte'}],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        member: [],
      });

    const directory = await fetchShopFranchiseDirectory({companyId: 10});

    expect(api.fetch).toHaveBeenCalledTimes(2);
    expect(api.fetch).toHaveBeenNthCalledWith(1, 'people/10');
    expect(api.fetch).toHaveBeenCalledWith('people_links', {
      params: {
        company: '10',
        linkType: ['franchisee'],
        itemsPerPage: 50,
        page: 1,
      },
    });
    expect(directory[0].id).toBe(22);
    expect(directory[0].alias).toBe('Norte');
    expect(directory[0].shopAddresses).toEqual([
      {id: 601, nickname: 'Loja Norte', latitude: null, longitude: null},
    ]);
  });

  it('rejects unrelated or non-franchise links before loading addresses', async () => {
    api.fetch.mockResolvedValueOnce({id: 10, '@type': 'Company'});
    api.fetch.mockResolvedValueOnce({
      member: [
        {
          id: 1,
          linkType: 'franchisee',
          company: {id: 999},
          people: {id: 22, alias: 'Other tenant'},
        },
        {
          id: 2,
          linkType: 'supplier',
          company: {id: 10},
          people: {id: 23, alias: 'Wrong relation'},
        },
      ],
    });
    api.fetch.mockResolvedValueOnce({member: []});

    const directory = await fetchAllShopFranchiseDirectory({companyId: 10});

    expect(directory).toEqual([]);
    expect(api.fetch).toHaveBeenCalledTimes(3);
    expect(api.fetch).not.toHaveBeenCalledWith('addresses', expect.anything());
  });

    it('loads every page when building the full franchise directory', async () => {
    api.fetch.mockResolvedValueOnce({id: 10, '@type': 'Company'});
    // Dual-side people_links: company side page1 (full), page2 empty break;
    // people side empty.
    api.fetch
      .mockResolvedValueOnce({
        member: [
          {
            id: 1,
            linkType: 'franchisee',
            company: {id: 10},
            people: {
              id: 21,
              alias: 'Centro',
              shopAddresses: [{id: 501, nickname: 'Loja Centro'}],
            },
          },
          {
            id: 2,
            linkType: 'franchisee',
            company: {id: 10},
            people: {
              id: 22,
              alias: 'Norte',
              shopAddresses: [{id: 601, nickname: 'Loja Norte'}],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        member: [
          {
            id: 3,
            linkType: 'franchisee',
            company: {id: 10},
            people: {
              id: 23,
              alias: 'Sul',
              shopAddresses: [{id: 701, nickname: 'Loja Sul'}],
            },
          },
        ],
      })
      .mockResolvedValueOnce({member: []});

    const directory = await fetchAllShopFranchiseDirectory({
      companyId: 10,
      itemsPerPage: 2,
    });

    expect(api.fetch.mock.calls[1][0]).toBe('people_links');
    expect(directory.map(item => item.id).sort()).toEqual([21, 22, 23]);
  });

  it('rejects a viewer id not confirmed by the authenticated API', async () => {
    api.fetch.mockResolvedValueOnce({id: 999, '@type': 'User'});
    await expect(fetchAllShopFranchiseDirectory({companyId: 10})).resolves.toEqual([]);
    expect(api.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects a viewer side with a non-company entity type', () => {
    expect(extractFranchiseCompanyFromLink({linkType: 'franchisee', company: {id: 10, '@type': 'User'}, people: {id: 22, '@type': 'Company'}}, 10)).toBeNull();
  });

    it('extracts category ids from address category payload variants', () => {
    expect(
      extractAddressCategoryIds({
        categories: [{id: 10}, '/categories/11'],
        addressCategories: [{category: {id: 12}}],
      }),
    ).toEqual(['10', '11', '12']);
  });

  it('filters franchise addresses by selected categories and visible companies', () => {
    const directory = filterShopFranchiseDirectory({
      visibleCompanyIds: [21],
      addressCategoryIds: [12],
      directory: [
        {
          id: 21,
          alias: 'Centro',
          shopAddresses: [
            {id: 501, nickname: 'Loja Centro', categories: [{id: 12}]},
            {id: 502, nickname: 'Loja Oculta', categories: [{id: 13}]},
          ],
        },
        {
          id: 22,
          alias: 'Norte',
          shopAddresses: [{id: 601, categories: [{id: 12}]}],
        },
      ],
    });

    expect(directory).toEqual([
      {
        id: 21,
        alias: 'Centro',
        shopAddresses: [
          {id: 501, nickname: 'Loja Centro', categories: [{id: 12}]},
        ],
      },
    ]);
  });
});
