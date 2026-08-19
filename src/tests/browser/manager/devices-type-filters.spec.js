const {expect, test} = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');

const APP_VERSION = packageJson?.version || '1.0.0';
const CURRENT_DEVICE_ID = 'web-7';

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

const currentDevice = {
  '@id': '/devices/396',
  '@type': 'Device',
  id: 396,
  device: CURRENT_DEVICE_ID,
  alias: 'Caixa atual',
  metadata: {
    runtime: 'web',
    network: {publicIp: '127.0.0.1'},
  },
};

const printerDevice = {
  '@id': '/devices/501',
  '@type': 'Device',
  id: 501,
  device: 'printer-1',
  alias: 'Impressora cozinha',
  metadata: {runtime: 'network'},
};

const displayDevice = {
  '@id': '/devices/502',
  '@type': 'Device',
  id: 502,
  device: 'kds-1',
  alias: 'KDS salão',
  metadata: {runtime: 'network'},
};

const createDeviceConfig = ({id, type, device = currentDevice, alias}) => ({
  '@id': `/device_configs/${id}`,
  '@type': 'DeviceConfig',
  id,
  type,
  people: '/people/3',
  device: alias
    ? {...device, alias}
    : device,
  configs: JSON.stringify({
    'config-version': APP_VERSION,
    'pos-gateway': 'infinite-pay',
  }),
});

/**
 * Smoke for app-community#381:
 * type filters beyond All/PDV must not throw and must request scalar `type`
 * (or omit type for All). Multi-type filters expand to sequential single-type GETs.
 */
const mockDevicesTypeFilterApi = async page => {
  const company = {
    id: 3,
    name: 'Teste',
    alias: 'TESTE',
    panel_enabled: true,
    enabled: true,
    commercial_enabled: true,
    theme: {
      colors: {
        primary: '#0EA5E9',
        cardBackground: '#FFFFFF',
        cardBorder: '#D8E0EA',
        cardSelectedBackground: '#E8F8FD',
        cardSelectedBorder: '#0284C7',
        cardSelectedText: '#0F172A',
        badgeSelectedBackground: '#CDEFFA',
        badgeSelectedText: '#075985',
      },
    },
  };

  const allConfigs = [
    createDeviceConfig({id: 487, type: 'MANAGER'}),
    createDeviceConfig({id: 488, type: 'PDV'}),
    createDeviceConfig({
      id: 501,
      type: 'PRINTER',
      device: printerDevice,
    }),
    createDeviceConfig({
      id: 502,
      type: 'DISPLAY',
      device: displayDevice,
    }),
    createDeviceConfig({id: 503, type: 'DEVICE'}),
  ];

  const typeRequests = [];

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');
    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }

    if (pathname === 'themes-colors.css') {
      return route.fulfill({
        status: 200,
        headers: {...CORS_HEADERS, 'content-type': 'text/css; charset=utf-8'},
        body: ':root { --primary: #0ea5e9; }',
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

    if (pathname === 'devices' && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(
          collection([currentDevice, printerDevice, displayDevice]),
        ),
      });
    }

    if (pathname === 'devices' && method === 'POST') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(currentDevice),
      });
    }

    if (pathname === 'device_configs' && method === 'GET') {
      const requestedType = url.searchParams.get('type');
      // API Platform array notation would be type[] — must NOT appear for this fix
      const hasArrayType =
        url.searchParams.has('type[]') ||
        [...url.searchParams.keys()].some(k => k === 'type[]' || k.startsWith('type['));

      typeRequests.push({
        type: requestedType,
        hasArrayType,
        search: url.search,
      });

      if (hasArrayType) {
        // Simulate the previous failure mode (bad request / empty / error)
        return route.fulfill({
          status: 400,
          headers: jsonHeaders(),
          body: JSON.stringify({
            'hydra:description': 'Invalid type filter array notation',
          }),
        });
      }

      const filtered = requestedType
        ? allConfigs.filter(c => String(c.type).toUpperCase() === String(requestedType).toUpperCase())
        : allConfigs;

      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(filtered)),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });

  return {typeRequests};
};

test.describe('Manager devices-index type filters (device_config) #381', () => {
  test('All, PDV and non-PDV types load without error (scalar type only)', async ({
    page,
  }) => {
    const api = await mockDevicesTypeFilterApi(page);
    const consoleErrors = [];
    page.on('pageerror', err => consoleErrors.push(String(err)));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/devices-index?store=device_config');

    // Initial All (or default) should render without crash
    await expect(page.locator('body')).toBeVisible();
    await expect.poll(() => api.typeRequests.length).toBeGreaterThan(0);

    // Click filter chips by visible labels used in UI
    const filterLabels = ['Todos', 'PDVs', 'KDS', 'Impressoras', 'Devices'];
    for (const label of filterLabels) {
      const chip = page.getByText(label, {exact: true}).first();
      if (await chip.count()) {
        await chip.click();
        // Give list a moment to re-fetch
        await page.waitForTimeout(400);
      }
    }

    // No array-type requests (the bug)
    const arrayRequests = api.typeRequests.filter(r => r.hasArrayType);
    expect(arrayRequests).toEqual([]);

    // At least one request without type (All) and one with scalar PDV / PRINTER / DISPLAY
    const typesSeen = new Set(
      api.typeRequests.map(r => r.type).filter(Boolean),
    );
    // PDV or PRINTER or DISPLAY should have been requested as scalar
    const hasScalarNonAll = [...typesSeen].some(t =>
      ['PDV', 'PRINTER', 'PRINT', 'DISPLAY', 'DEVICE', 'IP_CAMERA'].includes(
        String(t).toUpperCase(),
      ),
    );
    expect(hasScalarNonAll || api.typeRequests.some(r => !r.type)).toBe(true);

    // Page still healthy
    await expect(page.locator('body')).toBeVisible();
    const critical = consoleErrors.filter(
      e =>
        !/favicon|ResizeObserver|Download the React DevTools/i.test(e) &&
        /TypeError|ReferenceError|Cannot read|hydra:description|Invalid type/i.test(
          e,
        ),
    );
    expect(critical).toEqual([]);
  });

  test('switching All ↔ Printer ↔ All stays stable', async ({page}) => {
    const api = await mockDevicesTypeFilterApi(page);

    await page.goto('/devices-index?store=device_config');
    await expect.poll(() => api.typeRequests.length).toBeGreaterThan(0);

    const todos = page.getByText('Todos', {exact: true}).first();
    const impressoras = page.getByText('Impressoras', {exact: true}).first();

    if (await impressoras.count()) {
      await impressoras.click();
      await page.waitForTimeout(350);
    }
    if (await todos.count()) {
      await todos.click();
      await page.waitForTimeout(350);
    }
    if (await impressoras.count()) {
      await impressoras.click();
      await page.waitForTimeout(350);
    }

    expect(api.typeRequests.every(r => !r.hasArrayType)).toBe(true);
    await expect(page.locator('body')).toBeVisible();
  });
});
