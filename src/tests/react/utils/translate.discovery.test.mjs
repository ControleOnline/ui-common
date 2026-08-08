import assert from 'node:assert/strict';
import test from 'node:test';

import Translate from '../../../utils/translate.js';
import {
  installLocalStorage,
  flushAsync,
  createPendingTranslateStore,
} from './translate.test.helpers.mjs';

test('persists missing translations with the normalized configured language', async () => {
  installLocalStorage({language: 'en_US'});

  const saveCalls = [];
  const translateStore = createPendingTranslateStore({
    getItems: async () => [],
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

  translate.t('contract', 'empty', 'none_registered_title');

  await flushAsync();

  assert.equal(
    saveCalls[0].language,
    'en-us',
  );
  assert.equal(
    translateStore.messages['en-us'].companies[1].contract.empty.none_registered_title,
    'None registered title',
  );
});

test('does not fall back to the translates collection during discovery', async () => {
  installLocalStorage();

  const calls = [];
  const translate = new Translate(
    [{id: 1}, {id: 5}, {id: 9}],
    {id: 1},
    {id: 5},
    ['orders', 'crm'],
    createPendingTranslateStore({
      getItems: async params => {
        calls.push(params);
        return [];
      },
    }),
  );

  await translate.discoveryAll();

  assert.deepEqual(calls, []);
});

test('resolves queued store discovery through the resolve endpoint', async () => {
  installLocalStorage();

  const getItemsCalls = [];
  const resolveCalls = [];
  const translateStore = createPendingTranslateStore({
    getItems: async params => {
      getItemsCalls.push(params);
      return [];
    },
    resolveQueuedMessages: async payload => {
      resolveCalls.push(payload);

      return [
        {
          people: '/people/5',
          language: {
            id: 1,
            language: 'pt-br',
          },
          store: 'financial',
          type: 'label',
          key: 'accountsReceivable',
          translate: 'Contas a receber',
          revised: true,
        },
      ];
    },
  });
  const translate = new Translate(
    [{id: 1}, {id: 5}],
    {id: 1},
    {id: 5},
    ['financial'],
    translateStore,
  );

  translateStore.actions.queueMissingTranslate({
    language: 'pt-br',
    companyId: 1,
    store: 'financial',
    type: 'label',
    key: 'accountsReceivable',
    translate: 'Accounts Receivable',
  });

  await translate.discoveryAll();

  assert.deepEqual(getItemsCalls, []);
  // Discovery resolves against main+current; mock payload people id drives cache company.
  assert.equal(resolveCalls.length >= 1, true);
  assert.equal(resolveCalls[0].people, '/people/1');
  assert.deepEqual(resolveCalls[0].requests, [
    {
      store: 'financial',
      type: 'label',
      keys: ['accountsReceivable'],
    },
  ]);
  assert.equal(
    translateStore.messages['pt-br'].companies[5].financial.label.accountsReceivable,
    'Contas a receber',
  );
  assert.deepEqual(translateStore.pendingMessages, {});
});

test('reuses cached store buckets without refetching after in-memory discovery is cleared', async () => {
  installLocalStorage();
  localStorage.setItem('translates', JSON.stringify({
    'pt-br': {
      companies: {
        1: {
          contract: {
            empty: {
              none_registered_title: 'None registered title',
            },
          },
        },
      },
    },
  }));

  const calls = [];
  const translateStore = createPendingTranslateStore({
    getItems: async params => {
      calls.push(params);
      return [];
    },
  });
  const translate = new Translate(
    [{id: 1}],
    {id: 1},
    {id: 1},
    ['contract'],
    translateStore,
  );

  translate.discoveredStores.clear();

  assert.equal(translate.t('contract', 'empty', 'none_registered_title'), 'None registered title');

  await flushAsync();

  assert.deepEqual(calls, []);
});
