const {expect, test} = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');

const APP_VERSION = packageJson?.version || '1.0.0';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});

const textHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'text/css; charset=utf-8',
});

const company = {
  id: 1,
  '@id': '/people/1',
  name: 'Jagunços',
  alias: 'JAGUNCOS',
  panel_enabled: true,
  enabled: true,
  commercial_enabled: true,
  theme: {
    colors: {
      primary: '#6B3924',
      secondary: '#D9A441',
    },
  },
};

const detail = {
  integration: {
    id: 12,
    connected: true,
    user_id: 222,
  },
  oauth: {
    client_configured: true,
  },
  webhook: {
    url: 'https://api.controleonline.com/oauth/mercadolivre/notifications',
  },
  showcases: [
    {
      id: 91,
      name: 'Loja Jagunços',
      domain: 'loja.jaguncos.com.br',
      integration_key: 'shop',
    },
    {
      id: 92,
      name: 'Cardápio Jagunços',
      domain: 'cardapio.jaguncos.com.br',
      integration_key: 'menu',
    },
  ],
};

const setupMercadoLivreApi = async page => {
  const requests = [];
  const errors = [];

  page.on('pageerror', error => {
    errors.push(error);
  });

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');
    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: CORS_HEADERS,
        body: '',
      });
    }

    if (method !== 'OPTIONS') {
      requests.push({
        pathname,
        method,
        body: method === 'POST' ? request.postDataJSON() : null,
      });
    }

    if (pathname === 'themes-colors.css') {
      return route.fulfill({
        status: 200,
        headers: textHeaders(),
        body: ':root { --primary: #6b3924; --secondary: #d9a441; }',
      });
    }

    if (pathname === 'runtime/ip') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({ip: '127.0.0.1'}),
      });
    }

    if (pathname === 'menus-people') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({modules: {}}),
      });
    }

    if (pathname === 'people/companies/my') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([company])),
      });
    }

    if (pathname === 'people/company/default') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(company),
      });
    }

    if (pathname === 'configs/discovery-configs') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({configs: {}}),
      });
    }

    if (pathname === 'marketplace/integrations/mercadolivre/detail') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(detail),
      });
    }

    if (pathname === 'marketplace/integrations/mercadolivre/authorization-page') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({
          authorization_url: 'https://auth.mercadolivre.com.br/authorization',
        }),
      });
    }

    if (pathname === 'marketplace/integrations/mercadolivre/products/import') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({integration_id: 77}),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify({}),
    });
  });

  await page.addInitScript(
    ({appVersion}) => {
      localStorage.setItem(
        'session',
        JSON.stringify({
          id: 7,
          people: '/people/7',
          api_key: 'test-api-key',
          active: 1,
          mycompany: 1,
          name: 'Test User',
          realname: 'Test User',
          username: 'tester',
          roles: ['ROLE_SUPER'],
        }),
      );
      localStorage.setItem('config', JSON.stringify({language: 'pt-br'}));
      localStorage.setItem('app-type', 'MANAGER');
      localStorage.setItem(
        'device',
        JSON.stringify({
          id: 'web-mercadolivre',
          device: 'web-mercadolivre',
          type: 'MANAGER',
          appName: 'ControleOnline',
          appVersion,
          buildNumber: appVersion,
          systemName: 'web',
          systemVersion: 'web',
          deviceType: 'MANAGER',
          metadata: {},
        }),
      );
    },
    {appVersion: APP_VERSION},
  );

  return {requests, errors};
};

test.describe('Mercado Livre browser smoke', () => {
  test('loads the integration page and queues product import for the selected showcase', async ({
    page,
  }) => {
    const {requests, errors} = await setupMercadoLivreApi(page);

    await page.goto('/marketplace-integration-page?providerKey=mercadolivre');

    await expect(page.getByRole('heading', {name: 'Mercado Livre'})).toBeVisible();
    await expect(page.getByText('Webhook')).toBeVisible();
    await expect(page.getByText('Loja Jagunços')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Queue Product Import'})).toBeVisible();

    const importRequestPromise = page.waitForRequest(request => {
      if (request.method().toUpperCase() !== 'POST') return false;
      return request.url().includes('/marketplace/integrations/mercadolivre/products/import');
    });

    await page.getByRole('button', {name: 'Queue Product Import'}).click();
    const importRequest = await importRequestPromise;
    const payload = importRequest.postDataJSON();

    expect(payload).toMatchObject({
      provider_id: 1,
      showcase_id: 91,
      limit: 50,
    });

    const importCall = requests.find(
      entry =>
        entry.pathname === 'marketplace/integrations/mercadolivre/products/import' &&
        entry.method === 'POST',
    );
    expect(importCall).toBeTruthy();
    expect(importCall.body).toMatchObject({
      provider_id: 1,
      showcase_id: 91,
      limit: 50,
    });
    expect(errors.map(error => error.message)).toEqual([]);
  });
});
