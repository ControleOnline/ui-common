import assert from 'node:assert/strict';
import test from 'node:test';

import Translate from '../../../utils/translate.js';
import {
  installLocalStorage,
  flushAsync,
  createPendingTranslateStore,
} from './translate.test.helpers.mjs';

test('prefers the current company translation and falls back to the default company', () => {
  installLocalStorage();

  const translateStore = createPendingTranslateStore();
  const translate = new Translate(
    [{id: 1}, {id: 5}],
    {id: 1},
    {id: 5},
    ['orders'],
    translateStore,
  );

  translate.findMessage('orders', 'label', 'save', 'Salvar', 1);
  translate.findMessage('orders', 'label', 'save', 'Save for ASC', 5);
  translate.persist();

  assert.equal(translate.t('orders', 'label', 'save'), 'Save for ASC');

  const fallbackTranslate = new Translate(
    [{id: 1}, {id: 5}],
    {id: 1},
    {id: 9},
    ['orders'],
    createPendingTranslateStore(),
  );

  assert.equal(fallbackTranslate.t('orders', 'label', 'save'), 'Salvar');
});

test('keeps the translate method bound when passed as a standalone function', () => {
  installLocalStorage();

  const translate = new Translate(
    [{id: 1}],
    {id: 1},
    {id: 1},
    ['orders'],
    createPendingTranslateStore(),
  );

  translate.findMessage('orders', 'label', 'save', 'Salvar', 1);

  const detachedTranslate = translate.t;

  assert.equal(detachedTranslate('orders', 'label', 'save'), 'Salvar');
});

test('hydrates the cached translations into the translate store on startup', () => {
  installLocalStorage();
  localStorage.setItem('translates', JSON.stringify({
    'pt-br': {
      companies: {
        1: {
          invoice: {
            label: {
              accountsReceivable: 'Contas a receber',
            },
          },
        },
      },
    },
  }));

  const translateStore = createPendingTranslateStore();

  new Translate(
    [{id: 1}],
    {id: 1},
    {id: 1},
    ['invoice'],
    translateStore,
  );

  assert.equal(
    translateStore.messages['pt-br'].companies[1].invoice.label.accountsReceivable,
    'Contas a receber',
  );
});

test('posts missing translations once and keeps the fallback until review', async () => {
  installLocalStorage();

  const saveCalls = [];
  const translateStore = createPendingTranslateStore({
    save: async payload => {
      saveCalls.push(payload);
      return payload;
    },
  });
  const translate = new Translate(
    [{id: 1}],
    {id: 1},
    {id: 1},
    ['contract'],
    translateStore,
  );

  const firstValue = translate.t('contract', 'empty', 'none_registered_title');
  const secondValue = translate.t('contract', 'empty', 'none_registered_title');

  assert.equal(firstValue, 'None registered title');
  assert.equal(secondValue, 'None registered title');

  await flushAsync();

  assert.deepEqual(saveCalls, [{
    people: '/people/1',
    language: 'pt-br',
    store: 'contract',
    type: 'empty',
    key: 'none_registered_title',
    translate: 'None registered title',
    revised: false,
  }]);
  assert.equal(
    translateStore.messages['pt-br'].companies[1].contract.empty.none_registered_title,
    'None registered title',
  );
  assert.deepEqual(translateStore.pendingMessages, {});
});

test('queues missing translations in a single batch resolve request', async () => {
  installLocalStorage();

  const resolveCalls = [];
  const translateStore = createPendingTranslateStore({
    resolveQueuedMessages: async payload => {
      resolveCalls.push(payload);

      return [
        {
          people: '/people/1',
          language: {
            id: 1,
            language: 'pt-br',
          },
          store: 'contract',
          type: 'empty',
          key: 'none_registered_title',
          translate: 'Nenhum registro cadastrado',
          revised: false,
        },
        {
          people: '/people/1',
          language: {
            id: 1,
            language: 'pt-br',
          },
          store: 'contract',
          type: 'empty',
          key: 'none_registered_subtitle',
          translate: 'Nenhum subtítulo cadastrado',
          revised: false,
        },
      ];
    },
  });
  const translate = new Translate(
    [{id: 1}],
    {id: 1},
    {id: 1},
    ['contract'],
    translateStore,
  );

  assert.equal(
    translate.t('contract', 'empty', 'none_registered_title'),
    'None registered title',
  );
  assert.equal(
    translate.t('contract', 'empty', 'none_registered_subtitle'),
    'None registered subtitle',
  );
  assert.equal(
    translate.t('contract', 'empty', 'none_registered_title'),
    'None registered title',
  );

  await flushAsync();

  assert.deepEqual(resolveCalls, [
    {
      people: '/people/1',
      language: 'pt-br',
      requests: [
        {
          store: 'contract',
          type: 'empty',
          keys: ['none_registered_title', 'none_registered_subtitle'],
        },
      ],
    },
  ]);
  assert.equal(
    translateStore.messages['pt-br'].companies[1].contract.empty.none_registered_title,
    'Nenhum registro cadastrado',
  );
  assert.equal(
    translateStore.messages['pt-br'].companies[1].contract.empty.none_registered_subtitle,
    'Nenhum subtítulo cadastrado',
  );
  assert.deepEqual(translateStore.pendingMessages, {});
});

test('falls back past empty current-company values to the main company', () => {
  installLocalStorage();
  const translateStore = createPendingTranslateStore();
  const currentCompany = {id: 2};
  const defaultCompany = {id: 1};
  const translate = new Translate(
    [defaultCompany, currentCompany],
    defaultCompany,
    currentCompany,
    ['orders'],
    translateStore,
  );

  translate.findMessage('orders', 'menu', 'overview', '   ', 2, 'pt-br');
  translate.findMessage('orders', 'menu', 'overview', 'Visão geral', 1, 'pt-br');

  assert.equal(translate.t('orders', 'menu', 'overview'), 'Visão geral');
});

test('getResolveCompaniesToCache returns current and main companies', () => {
  installLocalStorage();
  const translateStore = createPendingTranslateStore();
  const currentCompany = {id: 2};
  const defaultCompany = {id: 1};
  const translate = new Translate(
    [defaultCompany, currentCompany],
    defaultCompany,
    currentCompany,
    ['orders'],
    translateStore,
  );

  const ids = translate
    .getResolveCompaniesToCache()
    .map((company) => String(company.id))
    .sort();
  assert.deepEqual(ids, ['1', '2']);
});
