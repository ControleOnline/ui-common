/**
 * fluxo: outros
 * Justificativa: jornada visual do RuntimeInfoFooter (rotação 1 linha ↔
 * device/versão em 4s), fora dos fluxos de negócio do catálogo canônico.
 * Issue: app-community#384
 *
 * Passos / prints:
 * 1. 1 linha configurada — frame da linha isolada
 * 2. após ~4s — frame do primaryText (device + versão)
 * 3. 0 linhas — somente primaryText
 * 4. 2+ linhas — primeira linha, depois próxima entrada
 */
const {expect, test} = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');

const APP_VERSION = packageJson?.version || '1.0.0';
const LINE_ONE = 'Linha isolada do rodapé';
const LINE_TWO = 'Segunda linha do rodapé';
const PRIMARY_HINT = /Browser Manager|web-manager|1\./i;

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
  configs: footerText
    ? {'device-runtime-footer-text': footerText}
    : {},
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

async function openFooter(page, footerText) {
  await mockApi(page, footerText);
  await page.goto('/devices-index?store=device_config');
  const footer = page.getByTestId('runtime-info-footer');
  await expect(footer).toBeVisible({timeout: 15000});
  const label = page.getByTestId('runtime-footer-primary-text');
  await expect(label.first()).toBeVisible({timeout: 15000});
  return {footer, label: label.first()};
}

test.describe('runtime footer rotation (#384) — fluxo: outros', () => {
  test('1 line: isolated line then device/version without concat', async (
    {page},
    testInfo,
  ) => {
    const {footer, label} = await openFooter(page, LINE_ONE);
    await page.waitForTimeout(800);

    const firstText = (await label.innerText()).trim();
    expect(firstText).toContain(LINE_ONE);
    expect(firstText).not.toMatch(/ • /);

    await footer.screenshot({
      path: testInfo.outputPath('01-one-line-isolated.png'),
    });
    await page.screenshot({
      path: testInfo.outputPath('01-one-line-isolated-full.png'),
      fullPage: true,
    });

    await expect
      .poll(async () => (await label.innerText()).trim(), {
        timeout: 7000,
        intervals: [400, 800, 1200],
      })
      .not.toBe(firstText);

    const secondText = (await label.innerText()).trim();
    expect(secondText).not.toContain(LINE_ONE);
    expect(secondText).not.toMatch(/ • /);
    expect(secondText).toMatch(PRIMARY_HINT);

    await footer.screenshot({
      path: testInfo.outputPath('02-device-version.png'),
    });
    await page.screenshot({
      path: testInfo.outputPath('02-device-version-full.png'),
      fullPage: true,
    });
  });

  test('0 lines: only primaryText', async ({page}, testInfo) => {
    const {footer, label} = await openFooter(page, '');
    await page.waitForTimeout(800);

    const text = (await label.innerText()).trim();
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain(LINE_ONE);
    expect(text).toMatch(PRIMARY_HINT);

    await footer.screenshot({
      path: testInfo.outputPath('03-zero-lines-primary.png'),
    });
    await page.screenshot({
      path: testInfo.outputPath('03-zero-lines-primary-full.png'),
      fullPage: true,
    });
  });

  test('2+ lines: rotates between configured lines and primary', async (
    {page},
    testInfo,
  ) => {
    const {footer, label} = await openFooter(
      page,
      `${LINE_ONE}\n${LINE_TWO}`,
    );
    await page.waitForTimeout(800);

    const firstText = (await label.innerText()).trim();
    expect([LINE_ONE, LINE_TWO].some(line => firstText.includes(line))).toBe(
      true,
    );
    expect(firstText).not.toMatch(/ • /);

    await footer.screenshot({
      path: testInfo.outputPath('04-two-lines-first.png'),
    });

    await expect
      .poll(async () => (await label.innerText()).trim(), {
        timeout: 7000,
        intervals: [400, 800, 1200],
      })
      .not.toBe(firstText);

    const secondText = (await label.innerText()).trim();
    expect(secondText).not.toMatch(/ • /);
    expect(secondText.length).toBeGreaterThan(0);

    await footer.screenshot({
      path: testInfo.outputPath('05-two-lines-next.png'),
    });
    await page.screenshot({
      path: testInfo.outputPath('05-two-lines-next-full.png'),
      fullPage: true,
    });
  });
});
