/**
 * Smoke browser: Manager /device-detail alias save updates header without refresh.
 * fluxo: manager-devices
 * Refs: app-community#382
 *
 * Criteria:
 * - Edit device name → save → displayed alias in header becomes the new value without page reload.
 * - Modules under Devices/detail remain ≤ 500 lines (absolute limit).
 */
const { expect, test } = require('playwright/test');
const fs = require('fs');
const path = require('path');
const packageJson = require('../../../../../../../package.json');
const { API_ORIGIN } = require('../../../../../../../src/tests/browser/apiOrigin');

const APP_VERSION = packageJson?.version || '1.0.0';
const CURRENT_DEVICE_ID = 'web-7';
const DEVICE_ENTITY_ID = 396;
const INITIAL_ALIAS = 'Caixa atual';
const NEXT_ALIAS = 'Caixa Renomeado #382';

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

const collection = (member) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

const currentDevice = {
  '@id': `/devices/${DEVICE_ENTITY_ID}`,
  '@type': 'Device',
  id: DEVICE_ENTITY_ID,
  device: CURRENT_DEVICE_ID,
  alias: INITIAL_ALIAS,
  metadata: {
    runtime: 'web',
    network: { publicIp: '127.0.0.1' },
  },
};

const createDeviceConfig = ({ id, type, device = currentDevice }) => ({
  '@id': `/device_configs/${id}`,
  '@type': 'DeviceConfig',
  id,
  type,
  people: '/people/3',
  device,
  configs: JSON.stringify({
    'config-version': APP_VERSION,
    'pos-gateway': 'infinite-pay',
  }),
});

const detailDir = path.join(__dirname, '../../../react/pages/Devices/detail');

const MODULES_MAX_500 = [
  'DeviceDetailScreen.js',
  'DeviceDetailHeader.js',
  'DeviceDetailRenderers.js',
  'DeviceDetailPdvConfigSection.js',
  'DeviceDetailOrdersPrintSection.js',
  'DeviceDetailAlertsCommandsSection.js',
  'DeviceDetailMovementSections.js',
  'DeviceDetailPaymentSection.js',
  'deviceDetailConstants.js',
  'deviceDetailHelpers.js',
  'OptionButtonChip.js',
  'useDeviceDetailStateA.js',
  'useDeviceDetailStateB.js',
  'useDeviceDetailLoaders.js',
  'useDeviceDetailActions.js',
  'useDeviceDetailSaves.js',
];

const mockDevicesApi = async (page) => {
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
      },
    },
  };

  const managerConfig = createDeviceConfig({ id: 487, type: 'MANAGER' });
  const deviceConfigs = [managerConfig];
  /** @type {Array<{id:number,alias:string}>} */
  const savedAliasPuts = [];

  // Live mutable alias for GET after PUT
  let liveAlias = INITIAL_ALIAS;

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');
    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
    }

    if (pathname === 'themes-colors.css') {
      return route.fulfill({
        status: 200,
        headers: { ...CORS_HEADERS, 'content-type': 'text/css; charset=utf-8' },
        body: ':root { --primary: #0ea5e9; }',
      });
    }

    if (pathname === 'runtime/ip') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({ ip: '127.0.0.1' }),
      });
    }

    if (pathname === 'menus-people') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({ modules: {} }),
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
        body: JSON.stringify({ configs: {} }),
      });
    }

    if (pathname === 'devices' && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(
          collection([{ ...currentDevice, alias: liveAlias }]),
        ),
      });
    }

    if (
      (pathname === `devices/${DEVICE_ENTITY_ID}` ||
        pathname === `devices/${CURRENT_DEVICE_ID}`) &&
      method === 'GET'
    ) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({ ...currentDevice, alias: liveAlias }),
      });
    }

    // Alias save: PUT /devices/{id}
    if (
      (pathname === `devices/${DEVICE_ENTITY_ID}` ||
        pathname === `devices/${CURRENT_DEVICE_ID}`) &&
      (method === 'PUT' || method === 'PATCH')
    ) {
      let body = {};
      try {
        body = request.postDataJSON() || {};
      } catch {
        body = {};
      }
      const next = String(body.alias || body.name || '').trim() || liveAlias;
      liveAlias = next;
      savedAliasPuts.push({ id: DEVICE_ENTITY_ID, alias: next });
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({ ...currentDevice, alias: next }),
      });
    }

    if (pathname === 'devices' && method === 'POST') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({ ...currentDevice, alias: liveAlias }),
      });
    }

    if (pathname === 'device_configs' && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(deviceConfigs)),
      });
    }

    if (pathname.startsWith('device_configs/') && method === 'GET') {
      const id = Number(pathname.split('/')[1]);
      const found = deviceConfigs.find((c) => c.id === id) || managerConfig;
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({
          ...found,
          device: { ...found.device, alias: liveAlias },
        }),
      });
    }

    // Fallback: empty collection / 200
    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });

  await page.addInitScript(
    ({ appVersion }) => {
      localStorage.setItem('token', 'smoke-token-382');
      localStorage.setItem('config', JSON.stringify({ language: 'pt-br' }));
      localStorage.setItem(
        'device',
        JSON.stringify({
          id: 'web-7',
          device: 'web-7',
          type: 'MANAGER',
          appName: 'Browser Manager',
          appVersion,
          buildNumber: appVersion,
          systemName: 'web',
          systemVersion: 'web',
          deviceType: 'web',
          metadata: { runtime: 'web' },
        }),
      );
    },
    { appVersion: APP_VERSION },
  );

  return { savedAliasPuts, getLiveAlias: () => liveAlias };
};

test.describe('device-detail alias save (browser smoke #382)', () => {
  test('all detail modules respect absolute 500-line limit', async () => {
    for (const name of MODULES_MAX_500) {
      const f = path.join(detailDir, name);
      expect(fs.existsSync(f), `missing ${name}`).toBe(true);
      const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/).length;
      expect(lines, `${name} has ${lines} lines (max 500)`).toBeLessThanOrEqual(
        500,
      );
    }
  });

  test('deviceAliasSync helper exists for save path', async () => {
    const helper = path.join(
      __dirname,
      '../../../react/utils/deviceAliasSync.js',
    );
    expect(fs.existsSync(helper)).toBe(true);
    expect(fs.readFileSync(helper, 'utf8')).toMatch(/buildDeviceAliasStoreUpdates/);
  });

  test('edit alias → save → header shows new value without refresh', async ({
    page,
  }) => {
    const api = await mockDevicesApi(page);

    await page.goto('/devices-index?store=device_config');

    // Open device detail (MANAGER profile of current device)
    await page.getByTestId('device-config-487').click();
    await expect(page).toHaveURL(/device-detail/);

    // Header must show initial alias
    await expect(page.getByText(INITIAL_ALIAS, { exact: true })).toBeVisible({
      timeout: 15000,
    });

    // Header shows initial alias via testID
    await expect(page.getByTestId('device-alias-text')).toHaveText(INITIAL_ALIAS, {
      timeout: 15000,
    });

    // Start edit via testID
    await page.getByTestId('device-alias-edit').click();

    // Fill input (testID on RN TextInput maps to data-testid on web)
    const aliasInput = page.getByTestId('device-alias-input');
    await expect(aliasInput).toBeVisible({ timeout: 10000 });
    await aliasInput.fill(NEXT_ALIAS);

    // Save via testID
    await page.getByTestId('device-alias-save').click();

    // Wait for PUT
    await expect
      .poll(() => api.savedAliasPuts.length, { timeout: 15000 })
      .toBeGreaterThanOrEqual(1);
    expect(api.savedAliasPuts[api.savedAliasPuts.length - 1].alias).toBe(
      NEXT_ALIAS,
    );

    // CRITICAL acceptance: header shows NEW alias without page reload
    await expect(page.getByText(NEXT_ALIAS, { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/device-detail/);
  });
});
