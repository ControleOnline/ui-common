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

  it('loads franchises from people_links on both company and people sides', async () => {
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

    expect(api.fetch).toHaveBeenCalledWith('people_links', {
      params: {
        company: '/people/10',
        linkType: 'franchisee',
        itemsPerPage: 50,
        page: 1,
      },
    });
    expect(api.fetch).toHaveBeenCalledWith('people_links', {
      params: {
        people: '/people/10',
        linkType: 'franchisee',
        itemsPerPage: 50,
        page: 1,
      },
    });
    expect(directory[0].id).toBe(22);
    expect(directory[0].alias).toBe('Norte');
    expect(directory[0].shopAddresses).toEqual([
      {id: 601, nickname: 'Loja Norte'},
    ]);
  });

    it('loads every page when building the full franchise directory', async () => {
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

    expect(api.fetch.mock.calls[0][0]).toBe('people_links');
    expect(directory.map(item => item.id).sort()).toEqual([21, 22, 23]);
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
