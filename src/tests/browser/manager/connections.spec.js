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

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});

const collection = member => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

const mockConnectionsApi = async page => {
  const company = {
    id: 3,
    name: 'Teste',
    alias: 'TESTE',
    panel_enabled: true,
    enabled: true,
    commercial_enabled: true,
    theme: {colors: {primary: '#0EA5E9', success: '#10b981'}},
  };

  const connections = [
    {
      id: 21,
      name: 'Atendimento',
      phone: {ddd: '11', phone: '988887777'},
      type: 'crm',
      channel: 'whatsapp',
      status: {status: 'connected'},
    },
    {
      id: 22,
      name: 'Suporte',
      phone: {ddd: '21', phone: '977776666'},
      type: 'support',
      channel: 'whatsapp',
      status: {status: 'pending'},
    },
  ];

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');
    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }

    if (pathname === 'companies' || pathname.startsWith('people/')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(company),
      });
    }

    if (pathname === 'connections' || pathname.startsWith('connections')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(connections)),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });

  await page.addInitScript(
    ({appVersion}) => {
      const set = (k, v) => {
        try {
          localStorage.setItem(k, v);
        } catch {}
      };
      set(
        'session',
        JSON.stringify({
          id: 7,
          people: '/people/7',
          api_key: 'test-api-key',
          active: 1,
          mycompany: 3,
          roles: ['ROLE_ADMIN'],
        }),
      );
      set('config', JSON.stringify({language: 'pt-br'}));
      set('app-type', 'ERP');
      set(
        'device',
        JSON.stringify({
          id: 'web-erp',
          device: 'web-erp',
          type: 'WEB',
          appName: 'Browser ERP',
          appVersion,
          buildNumber: appVersion,
          systemName: 'web',
          systemVersion: 'web',
          deviceType: 'web',
          metadata: {},
        }),
      );
    },
    {appVersion: APP_VERSION},
  );
};

test.describe('connections browser smoke', () => {
  test('renders connections page with DefaultTable', async ({page}) => {
    await mockConnectionsApi(page);
    await page.goto('/connections-page');

    await expect(page.getByText(/Conex/i).first()).toBeVisible({timeout: 15000});
    await expect(page.getByText('WhatsApp').first()).toBeVisible();
    await expect(page.getByText('Atendimento')).toBeVisible();
    await expect(page.getByText('Suporte')).toBeVisible();
    await expect(
      page.getByPlaceholder(/Buscar conex/i),
    ).toBeVisible();
  });
});
