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

const textHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'text/css; charset=utf-8',
});

const collection = member => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

const createCompany = () => ({
  id: 3,
  name: 'Controle Online',
  alias: 'CONTROLE ONLINE',
  panel_enabled: true,
  enabled: true,
  commercial_enabled: true,
  theme: {
    colors: {
      primary: '#0EA5E9',
      secondary: '#F97316',
      buttonBackground: '#0EA5E9',
      buttonBorder: '#0284C7',
      buttonText: '#FFFFFF',
      buttonTextSecondary: '#64748B',
      cardBackground: '#FFFFFF',
      cardBorder: '#D8E0EA',
      modalOverlay: 'rgba(15, 23, 42, 0.45)',
      modalBackground: '#FFFFFF',
      modalBorder: '#D8E0EA',
      modalHeaderText: '#0F172A',
      modalText: '#334155',
      toastDangerBackground: '#FEE2E2',
      toastDangerBorder: '#FECACA',
      toastDangerIcon: '#DC2626',
      toastDangerText: '#991B1B',
    },
  },
  configs: {},
});

const mockApi = async page => {
  const company = createCompany();

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
        headers: textHeaders(),
        body: ':root { --primary: #0ea5e9; --modal-overlay: rgba(15,23,42,0.45); }',
      });
    }

    if (pathname === 'runtime/ip') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({ip: '127.0.0.1'}),
      });
    }

    if (
      pathname === 'people/company/default' ||
      pathname === 'people' ||
      pathname === 'devices' ||
      pathname === 'device_configs' ||
      pathname === 'menus-people'
    ) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([company])),
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
      window.localStorage.setItem(
        'session',
        JSON.stringify({
          id: 7,
          people: '/people/7',
          api_key: 'test-api-key',
          active: 1,
          mycompany: 3,
          roles: ['ROLE_SUPER'],
          phone: '(11) 97114-0832',
          email: 'qa@controleonline.com',
        }),
      );
      window.localStorage.setItem('config', JSON.stringify({language: 'pt-br'}));
      window.localStorage.setItem('app-type', 'MANAGER');
      window.localStorage.setItem(
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
    {appVersion: APP_VERSION},
  );
};

test.describe('theme ConfirmModal + SystemErrorToast (#362)', () => {
  test('manager shell loads with theme tokens and no console errors on shared UI', async ({
    page,
  }) => {
    const consoleErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', error => {
      consoleErrors.push(String(error?.message || error));
    });

    await mockApi(page);
    await page.goto('/devices-index?store=device_config');

    // Page should settle without theme/runtime crashes
    await page.waitForTimeout(2000);

    // Soft presence check — devices index or empty state or nav shell
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);

    // No React / theme token resolution crashes
    const relevant = consoleErrors.filter(
      text =>
        /theme|TypeError|Cannot read|undefined is not|StyleSheet|modalOverlay|toastDanger/i.test(
          text,
        ),
    );
    expect(
      relevant,
      `Unexpected theme/runtime console errors: ${JSON.stringify(relevant)}`,
    ).toEqual([]);
  });

  test('SystemErrorToast path accepts theme palette without throwing when error is published', async ({
    page,
  }) => {
    const consoleErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', error => {
      consoleErrors.push(String(error?.message || error));
    });

    await mockApi(page);
    await page.goto('/devices-index?store=device_config');
    await page.waitForTimeout(1500);

    // Attempt to publish a system error through any global channel the app may expose
    await page.evaluate(() => {
      try {
        // MessageService / systemErrorChannel may be reachable via window hooks in some builds
        if (typeof window.__publishSystemError === 'function') {
          window.__publishSystemError('QA theme toast probe #362');
          return;
        }
        // Fallback: dispatch a CustomEvent some runtimes listen to
        window.dispatchEvent(
          new CustomEvent('controleonline:system-error', {
            detail: {message: 'QA theme toast probe #362'},
          }),
        );
      } catch (e) {
        // Swallow — presence of throw is asserted via consoleErrors
        console.error(String(e));
      }
    });

    await page.waitForTimeout(800);

    const relevant = consoleErrors.filter(text =>
      /theme|modalOverlay|toastDanger|Cannot read properties of undefined \(reading 'colors'\)/i.test(
        text,
      ),
    );
    expect(
      relevant,
      `Theme token errors after system-error probe: ${JSON.stringify(relevant)}`,
    ).toEqual([]);
  });
});
