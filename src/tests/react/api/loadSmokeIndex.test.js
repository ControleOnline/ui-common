const {afterEach, beforeEach, describe, expect, it, jest} = global;

const {api} = require('@controleonline/ui-common/src/api');

describe('smoke api helper', () => {
  const originalFetch = global.fetch;
  const originalGetToken = api.getToken;

  beforeEach(() => {
    global.fetch = jest.fn();
    api.getToken = jest.fn().mockResolvedValue('session-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    api.getToken = originalGetToken;
    jest.restoreAllMocks();
  });

  it('loads the smoke index from the canonical /tests endpoint and sends the app-domain', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () =>
        JSON.stringify({
          status: 'idle',
          summary: {
            types: {total: 0, passed: 0, failed: 0},
            suites: {total: 0, passed: 0, failed: 0},
            tests: {total: 0, passed: 0, failed: 0},
          },
          types: [],
          suites: [],
        }),
    });

    const response = await api.loadSmokeIndex({
      apiBaseUrl: 'https://smoke.example.test',
      domain: 'https://admin.controleonline.com/tests-playground',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://smoke.example.test/tests');
    expect(options.headers.get('App-Domain')).toBe('admin.controleonline.com');
    expect(options.headers.get('API-TOKEN')).toBe('session-token');
    expect(options.headers.get('X-API-KEY')).toBeNull();
    expect(options.headers.get('Accept')).toBe('application/ld+json');
    expect(options.headers.get('Content-Type')).toBe('application/ld+json');
    expect(response.status).toBe('idle');
  });
});
