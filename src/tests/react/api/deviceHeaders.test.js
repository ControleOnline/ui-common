const {afterAll, afterEach, beforeEach, describe, expect, it} = global;
const {jest} = require('@jest/globals');

jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: options => options.web || options.default || options.ios || options.android,
  },
}));

const originalLocalStorage = global.localStorage;

global.localStorage = {
  clear: jest.fn(),
  getItem: jest.fn(() => '{}'),
  removeItem: jest.fn(),
  setItem: jest.fn(),
};

const {api} = require('@controleonline/ui-common/src/api');

describe('device request headers', () => {
  const originalFetch = global.fetch;
  const originalGetToken = api.getToken;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({'hydra:member': []}),
    });
    api.getToken = jest.fn().mockResolvedValue('session-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    api.getToken = originalGetToken;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    global.localStorage = originalLocalStorage;
  });

  it('sends the operational type from the same runtime device as the identifier', async () => {
    global.localStorage.getItem.mockImplementation(key => {
      if (key === 'device') {
        return JSON.stringify({id: 'web-31477', type: 'PDV'});
      }

      return '{}';
    });

    await api.fetch('/product-showcases/catalog', {
      params: {type: ['service', 'product']},
    });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.get('DEVICE')).toBe('web-31477');
    expect(options.headers.get('DEVICE-TYPE')).toBe('PDV');
  });

  it('keeps master device identifier and type paired when it is selected', async () => {
    global.localStorage.getItem.mockImplementation(key => {
      if (key === 'device') {
        return JSON.stringify({id: 'web-31477', type: 'MANAGER'});
      }

      if (key === 'master-device') {
        return JSON.stringify({id: 'terminal-cielo-01', type: 'PDV'});
      }

      return '{}';
    });

    await api.fetch('/product-showcases/catalog');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.get('DEVICE')).toBe('terminal-cielo-01');
    expect(options.headers.get('DEVICE-TYPE')).toBe('PDV');
  });

  it('does not guess a device type when the selected device has none', async () => {
    global.localStorage.getItem.mockImplementation(key =>
      key === 'device' ? JSON.stringify({id: 'legacy-device'}) : '{}',
    );

    await api.fetch('/product-showcases/catalog');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.get('DEVICE')).toBe('legacy-device');
    expect(options.headers.get('DEVICE-TYPE')).toBeNull();
  });
});
