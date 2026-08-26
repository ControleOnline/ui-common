/**
 * fluxo: outros
 * Justificativa: ajuste visual do footer runtime (marquee 1 linha), fora dos
 * fluxos de negócio do catálogo canônico.
 * Issue: app-community#630
 *
 * Passos:
 * 1. Abrir shell Manager com mensagem curta no footer
 * 2. Capturar footer (1 linha, estático)
 * 3. Abrir shell Manager com mensagem longa
 * 4. Capturar footer (1 linha + overflow/marquee)
 */
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

const LONG_FOOTER =
  'Aviso operacional: fila de produção atrasada — conferir pedidos abertos, estoque crítico e dispositivos KDS offline antes de liberar o próximo turno de atendimento no salão e delivery';

const createCompany = footerText => ({
  id: 3,
  name: 'Controle Online',
  alias: 'CONTROLE ONLINE',
  panel_enabled: true,
  enabled: true,
  commercial_enabled: true,
  theme: {
    colors: {
      primary: '#0EA5E9',
      footerBackground: '#0F172A',
      footerBorder: '#1E293B',
      footerText: '#E2E8F0',
      footerLink: '#38BDF8',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
    },
  },
  configs: {
    'device-runtime-footer-text': footerText,
  },
});

const mockApi = async (page, footerText) => {
  const company = createCompany(footerText);

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
        body: ':root { --primary: #0ea5e9; --footer-text: #e2e8f0; }',
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

    if (
      pathname === 'people/company/default' ||
      pathname === 'people/companies/my'
    ) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(
          pathname === 'people/company/default' ? company : collection([company]),
        ),
      });
    }

    if (
      pathname === 'people' ||
      pathname === 'devices' ||
      pathname === 'device_configs'
    ) {
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

async function assertSingleLineFooter(page, label) {
  const footer = page.getByTestId('runtime-info-footer');
  await expect(footer, `footer visible (${label})`).toBeVisible({timeout: 15000});

  const box = await footer.boundingBox();
  expect(box, `footer box (${label})`).toBeTruthy();
  // One visual line of content + chrome: keep height bounded (not stacked multi-line body)
  expect(box.height, `footer height single-line-ish (${label})`).toBeLessThan(120);

  const marquee = page.getByTestId('runtime-footer-marquee-text');
  if (await marquee.count()) {
    await expect(marquee.first()).toBeVisible();
  }

  return footer;
}

test.describe('runtime footer marquee (#630) — fluxo: outros', () => {
  test('short message: footer one line and static', async ({page}, testInfo) => {
    const consoleErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => {
      consoleErrors.push(String(error?.message || error));
    });

    await mockApi(page, 'OK');
    await page.goto('/devices-index?store=device_config');
    await page.waitForTimeout(2500);

    const footer = await assertSingleLineFooter(page, 'short');
    await footer.screenshot({
      path: testInfo.outputPath('step-short-footer.png'),
    });
    await page.screenshot({
      path: testInfo.outputPath('step-short-full.png'),
      fullPage: true,
    });

    const relevant = consoleErrors.filter(text =>
      /TypeError|Cannot read|undefined is not|RuntimeInfoFooter|Marquee/i.test(
        text,
      ),
    );
    expect(relevant, JSON.stringify(relevant)).toEqual([]);
  });

  test('long message: footer stays one line and remains readable', async ({
    page,
  }, testInfo) => {
    const consoleErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => {
      consoleErrors.push(String(error?.message || error));
    });

    await mockApi(page, LONG_FOOTER);
    await page.goto('/devices-index?store=device_config');
    await page.waitForTimeout(2500);

    const footer = await assertSingleLineFooter(page, 'long');
    await footer.screenshot({
      path: testInfo.outputPath('step-long-footer.png'),
    });
    await page.screenshot({
      path: testInfo.outputPath('step-long-full.png'),
      fullPage: true,
    });

    // Wait a bit so marquee animation can start if overflow applies
    await page.waitForTimeout(2000);
    await footer.screenshot({
      path: testInfo.outputPath('step-long-footer-after-hold.png'),
    });

    const relevant = consoleErrors.filter(text =>
      /TypeError|Cannot read|undefined is not|RuntimeInfoFooter|Marquee/i.test(
        text,
      ),
    );
    expect(relevant, JSON.stringify(relevant)).toEqual([]);
  });
});
