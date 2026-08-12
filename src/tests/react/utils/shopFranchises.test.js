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
        shopAddresses: [{id: 501, nickname: 'Loja Centro'}],
      },
    ]);
  });

  it('keeps authenticated management lookup scoped by company', async () => {
    api.fetch.mockResolvedValueOnce({
      member: [
        {
          id: 22,
          alias: 'Norte',
          address: [{id: 601, nickname: 'Loja Norte'}],
        },
      ],
    });

    const directory = await fetchShopFranchiseDirectory({companyId: 10});

    expect(api.fetch).toHaveBeenCalledWith('people', {
      params: {
        'link.company': '/people/10',
        'link.linkType': 'franchisee',
        itemsPerPage: 50,
        page: 1,
      },
    });
    expect(directory[0].shopAddresses).toEqual([
      {id: 601, nickname: 'Loja Norte'},
    ]);
  });

  it('loads every page when building the full franchise directory', async () => {
    api.fetch
      .mockResolvedValueOnce({
        member: [
          {
            id: 21,
            alias: 'Centro',
            shopAddresses: [{id: 501, nickname: 'Loja Centro'}],
          },
          {
            id: 22,
            alias: 'Norte',
            shopAddresses: [{id: 601, nickname: 'Loja Norte'}],
          },
        ],
      })
      .mockResolvedValueOnce({
        member: [
          {
            id: 23,
            alias: 'Sul',
            shopAddresses: [{id: 701, nickname: 'Loja Sul'}],
          },
        ],
      });

    const directory = await fetchAllShopFranchiseDirectory({
      companyId: 10,
      itemsPerPage: 2,
    });

    expect(api.fetch).toHaveBeenNthCalledWith(1, 'people', {
      params: {
        'link.company': '/people/10',
        'link.linkType': 'franchisee',
        itemsPerPage: 2,
        page: 1,
      },
    });
    expect(api.fetch).toHaveBeenNthCalledWith(2, 'people', {
      params: {
        'link.company': '/people/10',
        'link.linkType': 'franchisee',
        itemsPerPage: 2,
        page: 2,
      },
    });
    expect(directory).toEqual([
      {
        id: 21,
        alias: 'Centro',
        shopAddresses: [{id: 501, nickname: 'Loja Centro'}],
      },
      {
        id: 22,
        alias: 'Norte',
        shopAddresses: [{id: 601, nickname: 'Loja Norte'}],
      },
      {
        id: 23,
        alias: 'Sul',
        shopAddresses: [{id: 701, nickname: 'Loja Sul'}],
      },
    ]);
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
