/**
 * Smoke browser: Manager /device-detail copy configs from another device.
 * fluxo: manager-devices
 * Refs: app-community#629
 *
 * Criteria:
 * - Destino abre detalhe → ícone copy → escolhe origem → confirma.
 * - POST /device_configs/add-configs usa identidade do destino (device/people).
 * - Origem não é alterada; chaves copiadas vêm do configs da origem.
 */
const { expect, test } = require('playwright/test');
const fs = require('fs');
const path = require('path');
const packageJson = require('../../../../../../../package.json');
const { API_ORIGIN } = require('../../../../../../../src/tests/browser/apiOrigin');

const APP_VERSION = packageJson?.version || '1.0.0';
const DEST_DEVICE_STRING = 'web-7';
const DEST_ENTITY_ID = 396;
const DEST_ALIAS = 'Caixa destino';
const SRC_DEVICE_STRING = 'src-88';
const SRC_ENTITY_ID = 410;
const SRC_ALIAS = 'Caixa origem';
const OTHER_TENANT_DEVICE = 'other-co';

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

const destDevice = {
  '@id': `/devices/${DEST_ENTITY_ID}`,
  '@type': 'Device',
  id: DEST_ENTITY_ID,
  device: DEST_DEVICE_STRING,
  alias: DEST_ALIAS,
  metadata: { runtime: 'web', network: { publicIp: '127.0.0.1' } },
};

const srcDevice = {
  '@id': `/devices/${SRC_ENTITY_ID}`,
  '@type': 'Device',
  id: SRC_ENTITY_ID,
  device: SRC_DEVICE_STRING,
  alias: SRC_ALIAS,
  metadata: { runtime: 'web' },
};

const createDeviceConfig = ({ id, type, device, people = '/people/3', configs }) => ({
  '@id': `/device_configs/${id}`,
  '@type': 'DeviceConfig',
  id,
  type,
  people,
  device,
  configs: JSON.stringify(configs),
});

const destManager = createDeviceConfig({
  id: 487,
  type: 'MANAGER',
  device: destDevice,
  configs: { 'config-version': APP_VERSION, 'pos-gateway': 'infinite-pay' },
});

const srcPdv = createDeviceConfig({
  id: 501,
  type: 'PDV',
  device: srcDevice,
  configs: {
    'pos-operation-mode': 'cashier',
    'pos-gateway': 'cielo',
    'printer-enabled': '1',
  },
});

const srcPrint = createDeviceConfig({
  id: 502,
  type: 'PRINT',
  device: srcDevice,
  configs: { 'print-network-port': '9100' },
});

const otherTenant = createDeviceConfig({
  id: 777,
  type: 'PDV',
  people: '/people/99',
  device: {
    '@id': '/devices/999',
    id: 999,
    device: OTHER_TENANT_DEVICE,
    alias: 'Outra empresa',
  },
  configs: { 'pos-gateway': 'getnet' },
});

const mockCopyApi = async (page) => {
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

  const companyConfigs = [destManager, srcPdv, srcPrint];
  /** @type {Array<object>} */
  const addConfigPosts = [];

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
        body: JSON.stringify(collection([destDevice, srcDevice])),
      });
    }

    if (
      (pathname === `devices/${DEST_ENTITY_ID}` ||
        pathname === `devices/${DEST_DEVICE_STRING}`) &&
      method === 'GET'
    ) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(destDevice),
      });
    }

    if (pathname === 'device_configs' && method === 'GET') {
      const people = String(url.searchParams.get('people') || '');
      const rows =
        people.includes('/people/3') || !people
          ? companyConfigs
          : [];
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([...rows, otherTenant])),
      });
    }

    if (pathname === 'device_configs/add-configs' && method === 'POST') {
      let body = {};
      try {
        body = request.postDataJSON() || {};
      } catch {
        body = {};
      }
      addConfigPosts.push(body);
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({
          ...destManager,
          type: body.type || 'PDV',
          device: destDevice,
          configs: body.configs || destManager.configs,
        }),
      });
    }

    if (pathname.startsWith('device_configs/') && method === 'GET') {
      const id = Number(pathname.split('/')[1]);
      const found =
        [...companyConfigs, otherTenant].find((c) => c.id === id) || destManager;
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(found),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });

  await page.addInitScript(
    ({ appVersion }) => {
      localStorage.setItem('token', 'smoke-token-629');
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

  return { addConfigPosts };
};

test.describe('device-detail copy config (browser smoke #629)', () => {
  test('copy modal modules stay under 500 lines', async () => {
    const files = [
      path.join(__dirname, '../../../react/components/CopyDeviceConfigModal.js'),
      path.join(__dirname, '../../../react/utils/copyDeviceConfigs.js'),
      path.join(
        __dirname,
        '../../../react/pages/Devices/detail/useDeviceDetailCopyConfig.js',
      ),
    ];
    for (const f of files) {
      expect(fs.existsSync(f), `missing ${f}`).toBe(true);
      const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/).length;
      expect(lines, `${f} has ${lines} lines`).toBeLessThanOrEqual(500);
    }
  });

  test('copy from source device posts destination identity only', async ({
    page,
  }) => {
    const api = await mockCopyApi(page);

    await page.goto('/devices-index?store=device_config');
    await page.getByTestId('device-config-487').click();
    await expect(page).toHaveURL(/device-detail/);
    await expect(page.getByTestId('device-alias-text')).toHaveText(DEST_ALIAS, {
      timeout: 15000,
    });

    await page.getByTestId('device-detail-copy-config-btn').click();
    await expect(page.getByTestId('copy-device-config-modal')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('copy-device-config-hint')).toContainText(
      DEST_ALIAS,
    );

    await expect(
      page.getByTestId(`copy-device-config-option-${SRC_DEVICE_STRING}`),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByTestId(`copy-device-config-option-${DEST_DEVICE_STRING}`),
    ).toHaveCount(0);
    await expect(
      page.getByTestId(`copy-device-config-option-${OTHER_TENANT_DEVICE}`),
    ).toHaveCount(0);

    await page
      .getByTestId(`copy-device-config-option-${SRC_DEVICE_STRING}`)
      .click();
    await expect(page.getByTestId('copy-device-config-preview')).toBeVisible();
    await expect(page.getByTestId('copy-device-config-preview')).toContainText(
      'PDV',
    );
    await expect(page.getByTestId('copy-device-config-preview')).toContainText(
      'pos-gateway',
    );

    await page.getByTestId('copy-device-config-confirm').click();

    await expect
      .poll(() => api.addConfigPosts.length, { timeout: 15000 })
      .toBeGreaterThanOrEqual(1);

    const devicesPosted = api.addConfigPosts.map((p) => String(p.device || ''));
    expect(devicesPosted.every((d) => d === DEST_DEVICE_STRING)).toBe(true);
    expect(devicesPosted).not.toContain(SRC_DEVICE_STRING);

    const peoplePosted = api.addConfigPosts.map((p) => String(p.people || ''));
    expect(peoplePosted.every((p) => p === '/people/3')).toBe(true);

    const types = api.addConfigPosts.map((p) => String(p.type || '').toUpperCase());
    expect(types).toEqual(expect.arrayContaining(['PDV', 'PRINT']));

    await expect(page).toHaveURL(/device-detail/);
    await expect(page.getByTestId('device-alias-text')).toHaveText(DEST_ALIAS);
  });
});
