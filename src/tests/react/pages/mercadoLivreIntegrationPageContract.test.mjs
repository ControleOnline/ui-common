import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const pagePath = resolve('modules/controleonline/ui-common/src/react/pages/MercadoLivreIntegrationPage.js');
const pageSource = readFileSync(pagePath, 'utf8');

test('MercadoLivreIntegrationPage keeps the backend contract for connect and import actions', () => {
  assert.match(pageSource, /\/marketplace\/integrations\/mercadolivre\/authorization-page/);
  assert.match(pageSource, /\/marketplace\/integrations\/mercadolivre\/products\/import/);
  assert.match(pageSource, /provider_id/);
  assert.match(pageSource, /showcase_id/);
  assert.doesNotMatch(pageSource, /callback_url/);
  assert.doesNotMatch(pageSource, /mercadolivre\/oauth\/return/);
});
