jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: jest.fn(),
  },
}));

const {api} = require('@controleonline/ui-common/src/api');
const {
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

    const directory = await fetchShopFranchiseDirectory({companyId: 10});

    expect(api.fetch).toHaveBeenCalledWith('/shop/franchises', {
      params: {},
    });
    expect(directory).toEqual([
      {
        id: 21,
        alias: 'Centro',
        shopAddresses: [{id: 501, nickname: 'Loja Centro'}],
      },
    ]);
  });
});
