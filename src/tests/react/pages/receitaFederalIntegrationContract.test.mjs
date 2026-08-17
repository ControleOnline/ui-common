import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const catalog = fs.readFileSync(new URL('../../../react/pages/integrationsCatalog.js', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../../../react/pages/IntegrationConfigPage.js', import.meta.url), 'utf8');
const fields = fs.readFileSync(new URL('../../../react/pages/IntegrationConfigFields.js', import.meta.url), 'utf8');
const utils = fs.readFileSync(new URL('../../../react/pages/IntegrationConfigPage.utils.js', import.meta.url), 'utf8');

test('Receita Federal catalog exposes company fiscal configuration', () => {
  assert.match(catalog, /key: 'receita-federal'/);
  assert.match(catalog, /label: 'Receita Federal'/);
  assert.match(catalog, /receita-federal-tax-regime/);
  assert.match(catalog, /receita-federal-ibge-code/);
  assert.match(catalog, /receita-federal-certificate-file/);
  assert.match(catalog, /receita-federal-certificate-password/);
  assert.match(catalog, /secureTextEntry: true/);
  assert.match(catalog, /\.pfx,\.p12,application\/x-pkcs12/);
});

test('Receita Federal route resolves without relying only on route params', () => {
  assert.match(utils, /ReceitaFederalIntegrationPage: 'receita-federal'/);
  assert.match(page, /ROUTE_PROVIDER_MAP\[route\?\.name\]/);
});

test('certificate picker remains scoped to the active company', () => {
  assert.match(fields, /companyId=\{providerId\}/);
  assert.match(fields, /entityId=\{providerId\}/);
  assert.match(fields, /peopleId: companyId \|\| providerId/);
  assert.match(fields, /company_certificate/);
});

test('IntegrationConfigPage delegates field rendering to a focused component', () => {
  assert.match(page, /<IntegrationConfigFields/);
  assert.ok(page.split('\n').length <= 500, `IntegrationConfigPage.js has ${page.split('\n').length} lines`);
  assert.ok(fields.split('\n').length <= 500, `IntegrationConfigFields.js has ${fields.split('\n').length} lines`);
  assert.ok(utils.split('\n').length <= 500, `IntegrationConfigPage.utils.js has ${utils.split('\n').length} lines`);
});
