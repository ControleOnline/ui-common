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

const companyA = {
  id: 3,
  name: 'Controle Online',
  alias: 'CONTROLE',
  panel_enabled: true,
  enabled: true,
  commercial_enabled: true,
  theme: {colors: {primary: '#0EA5E9', success: '#10b981'}},
};

const companyB = {
  id: 9,
  name: 'Gyros',
  alias: 'GYROS',
  panel_enabled: true,
  enabled: true,
  commercial_enabled: true,
  theme: {colors: {primary: '#16A34A', success: '#10b981'}},
};

const fullToolbarMenus = {
  modules: {
    1: {
      id: 1,
      label: 'Toolbar',
      icon: 'home',
      sortOrder: 10,
      menus: [
        {
          id: 11,
          menuKey: 'home',
          label: 'Início',
          route: 'HomePage',
          icon: 'home',
          menuType: 'toolbar',
          sortOrder: 10,
        },
        {
          id: 12,
          menuKey: 'opportunities',
          label: 'Oportunidades',
          route: 'CrmIndex',
          icon: 'dollar-sign',
          menuType: 'toolbar',
          sortOrder: 20,
        },
        {
          id: 13,
          menuKey: 'customers',
          label: 'Clientes',
          route: 'ClientsIndex',
          icon: 'users',
          menuType: 'toolbar',
          sortOrder: 30,
        },
        {
          id: 14,
          menuKey: 'profile',
          label: 'Perfil',
          route: 'ProfilePage',
          icon: 'user',
          menuType: 'toolbar',
          sortOrder: 40,
        },
      ],
    },
  },
};

const limitedToolbarMenus = {
  modules: {
    1: {
      id: 1,
      label: 'Toolbar',
      icon: 'home',
      sortOrder: 10,
      menus: [
        {
          id: 21,
          menuKey: 'home',
          label: 'Início',
          route: 'HomePage',
          icon: 'home',
          menuType: 'toolbar',
          sortOrder: 10,
        },
        {
          id: 24,
          menuKey: 'profile',
          label: 'Perfil',
          route: 'ProfilePage',
          icon: 'user',
          menuType: 'toolbar',
          sortOrder: 40,
        },
      ],
    },
  },
};

const installSession = async (page, {companyId = 3} = {}) => {
  await page.addInitScript(
    ({appVersion, companyId}) => {
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
          mycompany: companyId,
          roles: ['ROLE_ADMIN'],
        }),
      );
      set('config', JSON.stringify({language: 'pt-br'}));
      set('app-type', 'MANAGER');
      set(
        'device',
        JSON.stringify({
          id: 'web-manager',
          device: 'web-manager',
          type: 'WEB',
          appName: 'Browser Manager',
          appVersion,
          buildNumber: appVersion,
          systemName: 'web',
          systemVersion: 'web',
          deviceType: 'web',
          metadata: {},
        }),
      );
    },
    {appVersion: APP_VERSION, companyId},
  );
};

const mockManagerApi = async (page, {toolbarByCompany}) => {
  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');
    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }

    if (pathname === 'menus-people') {
      const companyId = String(url.searchParams.get('myCompany') || '');
      const menuType = String(url.searchParams.get('menuType') || '');
      const payload =
        menuType === 'toolbar'
          ? toolbarByCompany[companyId] || {modules: {}}
          : {modules: {}};
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({
          response: {
            data: payload,
            count: 1,
            error: '',
            success: true,
          },
        }),
      });
    }

    if (
      pathname === 'people/companies/my' ||
      pathname === 'people/company/default'
    ) {
      const list = [companyA, companyB];
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(
          pathname === 'people/companies/my' ? collection(list) : companyA,
        ),
      });
    }

    if (pathname.startsWith('people/') || pathname === 'companies') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(companyA),
      });
    }

    if (pathname === 'configs/discovery-configs') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({configs: {}}),
      });
    }

    if (pathname === 'devices' || pathname.startsWith('device')) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([])),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });
};

test.describe('MANAGER bottom navigation role toolbar', () => {
  test.use({viewport: {width: 390, height: 844}});

  test('full role sees authorized toolbar routes including Clientes', async ({
    page,
  }) => {
    await mockManagerApi(page, {
      toolbarByCompany: {
        '3': fullToolbarMenus,
        '9': limitedToolbarMenus,
      },
    });
    await installSession(page, {companyId: 3});
    await page.goto('/');

    const nav = page.getByTestId('bottom-navigation');
    await expect(nav).toBeVisible({timeout: 20000});
    await expect(nav.getByText('Início')).toBeVisible();
    await expect(nav.getByText('Oportunidades')).toBeVisible();
    await expect(nav.getByText('Clientes')).toBeVisible();
    await expect(nav.getByText('Perfil')).toBeVisible();
  });

  test('limited role does not expose business routes; keeps Início and Perfil', async ({
    page,
  }) => {
    await mockManagerApi(page, {
      toolbarByCompany: {
        '3': limitedToolbarMenus,
      },
    });
    await installSession(page, {companyId: 3});
    await page.goto('/');

    const nav = page.getByTestId('bottom-navigation');
    await expect(nav).toBeVisible({timeout: 20000});
    await expect(nav.getByText('Início')).toBeVisible();
    await expect(nav.getByText('Perfil')).toBeVisible();
    await expect(nav.getByText('Clientes')).toHaveCount(0);
    await expect(nav.getByText('Oportunidades')).toHaveCount(0);
  });

  test('API failure keeps safe fallback without business routes', async ({
    page,
  }) => {
    await page.route(`${API_ORIGIN}/**`, async route => {
      const request = route.request();
      const url = new URL(request.url());
      const pathname = url.pathname.replace(/^\/+/, '');
      const method = request.method().toUpperCase();

      if (method === 'OPTIONS') {
        return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
      }

      if (pathname === 'menus-people') {
        return route.fulfill({
          status: 500,
          headers: jsonHeaders(),
          body: JSON.stringify({
            response: {data: [], count: 0, error: 'fail', success: false},
          }),
        });
      }

      if (
        pathname === 'people/companies/my' ||
        pathname === 'people/company/default' ||
        pathname.startsWith('people/') ||
        pathname === 'companies'
      ) {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify(
            pathname === 'people/companies/my'
              ? collection([companyA])
              : companyA,
          ),
        });
      }

      if (pathname === 'configs/discovery-configs') {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders(),
          body: JSON.stringify({configs: {}}),
        });
      }

      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([])),
      });
    });

    await installSession(page, {companyId: 3});
    await page.goto('/');

    const nav = page.getByTestId('bottom-navigation');
    await expect(nav).toBeVisible({timeout: 20000});
    await expect(nav.getByText('Início')).toBeVisible();
    await expect(nav.getByText('Perfil')).toBeVisible();
    await expect(nav.getByText('Clientes')).toHaveCount(0);
    await expect(nav.getByText('Oportunidades')).toHaveCount(0);
  });
});
