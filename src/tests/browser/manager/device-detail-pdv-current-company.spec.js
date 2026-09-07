/**
 * Smoke browser: DeviceConfig PDV detail opens without currentCompany ReferenceError.
 * fluxo: device-configuracao
 * flowchartIds: [1]
 * Refs: app-community#704
 */
const fs = require('fs');
const path = require('path');
const {expect, test} = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');

const FLOW_ID = 'device-configuracao';
const FLOWCHART_IDS = [1];
const APP_VERSION = packageJson?.version || '1.0.0';
const DEVICE_ENTITY_ID = 403;
const PDV_CONFIG_ID = 510;
const CURRENT_DEVICE_ID = 'web-7';
const ALIAS = 'PDV Santa Redonda';

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

const evidenceSteps = [];

const writeEvidence = async (page, outputDir, stepId, title) => {
  fs.mkdirSync(outputDir, {recursive: true});
  const fileName = `${stepId}.png`;
  await page.screenshot({path: path.join(outputDir, fileName), fullPage: true});
  evidenceSteps.push({id: stepId, title, screenshot: fileName, url: page.url()});
};

const writeManifest = outputDir => {
  const manifest = {
    fluxo: FLOW_ID,
    flowchartIds: FLOWCHART_IDS,
    flowchartLinks: FLOWCHART_IDS.map(
      id => `https://admin.controleonline.com/admin/flowcharts/${id}`,
    ),
    title: 'DeviceConfig PDV detail opens without currentCompany error',
    issue: 'ControleOnline/app-community#704',
    device: DEVICE_ENTITY_ID,
    config: PDV_CONFIG_ID,
    type: 'PDV',
    steps: evidenceSteps,
  };
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
};

const currentDevice = {
  '@id': `/devices/${DEVICE_ENTITY_ID}`,
  '@type': 'Device',
  id: DEVICE_ENTITY_ID,
  device: CURRENT_DEVICE_ID,
  alias: ALIAS,
  metadata: {runtime: 'web', network: {publicIp: '127.0.0.1'}},
};

const createDeviceConfig = ({id, type, device = currentDevice}) => ({
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

const mockDevicesApi = async page => {
  const company = {
    id: 3,
    name: 'Teste',
    alias: 'TESTE',
    panel_enabled: true,
    enabled: true,
    commercial_enabled: true,
    theme: {colors: {primary: '#0EA5E9'}},
  };
  const managerConfig = createDeviceConfig({id: 487, type: 'MANAGER'});
  const pdvConfig = createDeviceConfig({id: PDV_CONFIG_ID, type: 'PDV'});
  const deviceConfigs = [managerConfig, pdvConfig];

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
        body: JSON.stringify(collection([currentDevice])),
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
        body: JSON.stringify(currentDevice),
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
      const found = deviceConfigs.find(c => c.id === id) || pdvConfig;
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
    ({appVersion}) => {
      localStorage.setItem('token', 'smoke-token-704');
      localStorage.setItem('config', JSON.stringify({language: 'pt-br'}));
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
          metadata: {runtime: 'web'},
        }),
      );
    },
    {appVersion: APP_VERSION},
  );
};

test.describe('device-detail PDV currentCompany (#704)', () => {
  test.describe.configure({timeout: 60000});

  test('PDV config 510 of device 403 opens without currentCompany error', async ({
    page,
  }, testInfo) => {
    testInfo.annotations.push({type: 'fluxo', description: FLOW_ID});
    testInfo.annotations.push({
      type: 'flowchartIds',
      description: JSON.stringify(FLOWCHART_IDS),
    });

    const outputDir = testInfo.outputDir;
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(String(err)));
    page.on('console', msg => {
      if (msg.type() === 'error') pageErrors.push(msg.text());
    });

    await mockDevicesApi(page);
    await page.goto('/devices-index?store=device_config');
    await expect(page.getByTestId(`device-config-${PDV_CONFIG_ID}`)).toBeVisible({
      timeout: 15000,
    });
    await writeEvidence(page, outputDir, '01-lista-devices', 'DevicesIndex');

    await page.getByTestId(`device-config-${PDV_CONFIG_ID}`).click();
    await expect(page).toHaveURL(/device-detail/, {timeout: 15000});
    await expect(page.getByText('Configuração do PDV')).toBeVisible({
      timeout: 15000,
    });
    await writeEvidence(
      page,
      outputDir,
      '02-detalhe-pdv-510',
      'DeviceConfig PDV 510 / device 403',
    );

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/currentCompany is not defined/i);
    expect(pageErrors.join('\n')).not.toMatch(/currentCompany is not defined/i);

    const manifest = writeManifest(outputDir);
    expect(manifest.fluxo).toBe(FLOW_ID);
    expect(manifest.flowchartIds).toEqual(FLOWCHART_IDS);
    expect(manifest.steps.map(s => s.id)).toEqual([
      '01-lista-devices',
      '02-detalhe-pdv-510',
    ]);
  });
});
