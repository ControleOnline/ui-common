import assert from 'node:assert/strict';
import test from 'node:test';

import Translate from '../../../utils/translate.js';

const installLocalStorage = (config = {language: 'pt-br'}) => {
  const storage = {};

  global.localStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(storage, key)
        ? storage[key]
        : null;
    },
    setItem(key, value) {
      storage[key] = String(value);
    },
    removeItem(key) {
      delete storage[key];
    },
  };

  localStorage.setItem('config', JSON.stringify(config));
  localStorage.setItem('translates', JSON.stringify({}));
  delete global.refreshTranslationsUI;
};

const flushAsync = async () => {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
};

const normalizeLanguage = value =>
  String(value || '')
    .trim()
    .replace(/_/g, '-')
    .toLowerCase();

const normalizeId = value =>
  String(value || '')
    .replace(/\D+/g, '')
    .trim();

const createPendingTranslateStore = ({getItems} = {}) => {
  const pendingMessages = {};
  const translateActions = {
    getItems: getItems || (async () => []),
    queueMissingTranslate: ({language, companyId, store, type, key, translate}) => {
      const normalizedLanguage = normalizeLanguage(language);
      const normalizedCompanyId = normalizeId(companyId);

      if (!pendingMessages[normalizedLanguage]) {
        pendingMessages[normalizedLanguage] = {};
      }

      if (!pendingMessages[normalizedLanguage].companies) {
        pendingMessages[normalizedLanguage].companies = {};
      }

      if (!pendingMessages[normalizedLanguage].companies[normalizedCompanyId]) {
        pendingMessages[normalizedLanguage].companies[normalizedCompanyId] = {};
      }

      if (!pendingMessages[normalizedLanguage].companies[normalizedCompanyId][store]) {
        pendingMessages[normalizedLanguage].companies[normalizedCompanyId][store] = {};
      }

      if (
        !pendingMessages[normalizedLanguage].companies[normalizedCompanyId][store][type]
      ) {
        pendingMessages[normalizedLanguage].companies[normalizedCompanyId][store][type] =
          {};
      }

      pendingMessages[normalizedLanguage].companies[normalizedCompanyId][store][type][
        key
      ] = translate;

      return pendingMessages;
    },
    removePendingTranslate: ({language, companyId, store, type, key}) => {
      const normalizedLanguage = normalizeLanguage(language);
      const normalizedCompanyId = normalizeId(companyId);
      const languageBucket = pendingMessages[normalizedLanguage];
      const companyBucket = languageBucket?.companies?.[normalizedCompanyId];
      const storeBucket = companyBucket?.[store];
      const typeBucket = storeBucket?.[type];

      if (!typeBucket || !Object.prototype.hasOwnProperty.call(typeBucket, key)) {
        return pendingMessages;
      }

      delete typeBucket[key];

      if (Object.keys(typeBucket).length === 0) {
        delete storeBucket[type];
      }

      if (Object.keys(storeBucket).length === 0) {
        delete companyBucket[store];
      }

      if (Object.keys(companyBucket).length === 0) {
        delete languageBucket.companies[normalizedCompanyId];
      }

      if (Object.keys(languageBucket.companies || {}).length === 0) {
        delete languageBucket.companies;
      }

      if (Object.keys(languageBucket).length === 0) {
        delete pendingMessages[normalizedLanguage];
      }

      return pendingMessages;
    },
  };

  return {
    getters: {
      messages: pendingMessages,
    },
    actions: translateActions,
    pendingMessages,
    translateActions,
  };
};

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

test('queues missing translations in the translate store without posting to the backend', async () => {
  installLocalStorage();

  const discoveryCalls = [];
  const translateStore = createPendingTranslateStore({
    getItems: async params => {
      discoveryCalls.push(params);
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

  const firstValue = translate.t('contract', 'empty', 'none_registered_title');
  const secondValue = translate.t('contract', 'empty', 'none_registered_title');

  assert.equal(firstValue, 'None registered title');
  assert.equal(secondValue, 'None registered title');

  await flushAsync();

  assert.deepEqual(discoveryCalls, [
    {store: 'contract', 'language.language': 'pt-br', people: '/people/1', page: 1},
  ]);
  assert.deepEqual(translateStore.pendingMessages, {
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
  });
});

test('persists missing translations with the normalized configured language', async () => {
  installLocalStorage({language: 'en_US'});

  const translateStore = createPendingTranslateStore({
    getItems: async () => [],
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
    translateStore.pendingMessages['en-us'].companies[1].contract.empty.none_registered_title,
    'None registered title',
  );
});

test('loads each requested store only for the current and default companies', async () => {
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

  assert.deepEqual(calls, [
    {store: 'orders', 'language.language': 'pt-br', people: '/people/5', page: 1},
    {store: 'orders', 'language.language': 'pt-br', people: '/people/1', page: 1},
    {store: 'crm', 'language.language': 'pt-br', people: '/people/5', page: 1},
    {store: 'crm', 'language.language': 'pt-br', people: '/people/1', page: 1},
  ]);
});

test('removes stale pending entries once a discovered store returns the real translation', async () => {
  installLocalStorage();

  const translateStore = createPendingTranslateStore({
    getItems: async params => {
      if (params.page === 1) {
        return [
          {
            store: 'menu',
            type: 'menu',
            key: 'orders',
            translate: 'Pedidos',
          },
        ];
      }

      return [];
    },
  });

  translateStore.pendingMessages['pt-br'] = {
    companies: {
      1: {
        menu: {
          menu: {
            orders: 'Orders',
          },
        },
      },
    },
  };

  let refreshCalls = 0;
  global.refreshTranslationsUI = () => {
    refreshCalls += 1;
  };

  const translate = new Translate(
    [{id: 1}],
    {id: 1},
    {id: 1},
    ['orders'],
    translateStore,
  );

  assert.equal(translate.t('menu', 'menu', 'orders'), 'Orders');

  await flushAsync();

  assert.deepEqual(translateStore.pendingMessages, {});
  assert.equal(refreshCalls, 1);
  assert.equal(translate.t('menu', 'menu', 'orders'), 'Pedidos');
});
