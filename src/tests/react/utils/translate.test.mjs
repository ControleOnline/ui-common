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
};

test('prefers the current company translation and falls back to the default company', () => {
  installLocalStorage();

  const translate = new Translate(
    [{id: 1}, {id: 5}],
    {id: 1},
    {id: 5},
    ['orders'],
    {},
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
    {},
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
    {},
  );

  translate.findMessage('orders', 'label', 'save', 'Salvar', 1);

  const detachedTranslate = translate.t;

  assert.equal(detachedTranslate('orders', 'label', 'save'), 'Salvar');
});

test('defers missing translation persistence and deduplicates repeated renders', async () => {
  installLocalStorage();

  let addToQueueCalls = 0;
  let initQueueCalls = 0;
  const queued = [];
  const translate = new Translate(
    [{id: 1}],
    {id: 1},
    {id: 1},
    ['contract'],
    {
      addToQueue: fn => {
        addToQueueCalls += 1;
        queued.push(fn);
      },
      initQueue: () => {
        initQueueCalls += 1;
      },
      save: async () => ({}),
    },
  );

  const firstValue = translate.t('contract', 'empty', 'none_registered_title');
  const secondValue = translate.t('contract', 'empty', 'none_registered_title');

  assert.equal(firstValue, 'None registered title');
  assert.equal(secondValue, 'None registered title');
  assert.equal(addToQueueCalls, 0);
  assert.equal(initQueueCalls, 0);

  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(addToQueueCalls, 1);
  assert.equal(initQueueCalls, 1);
  assert.equal(queued.length, 1);
});

test('persists missing translations with the normalized configured language', async () => {
  installLocalStorage({language: 'en_US'});

  const savedPayloads = [];
  const queued = [];
  const translate = new Translate(
    [{id: 1}],
    {id: 1},
    {id: 1},
    ['contract'],
    {
      addToQueue: fn => {
        queued.push(fn);
      },
      initQueue: () => {},
      save: async payload => {
        savedPayloads.push(payload);
        return {};
      },
    },
  );

  translate.t('contract', 'empty', 'none_registered_title');

  await new Promise(resolve => setTimeout(resolve, 0));
  await queued[0]();

  assert.equal(savedPayloads.length, 1);
  assert.equal(savedPayloads[0].language, 'en-us');
  assert.equal(savedPayloads[0].people, '/people/1');
});

test('loads each requested store only for the current and default companies', async () => {
  installLocalStorage();

  const calls = [];
  const translate = new Translate(
    [{id: 1}, {id: 5}, {id: 9}],
    {id: 1},
    {id: 5},
    ['orders', 'crm'],
    {
      getItems: async params => {
        calls.push(params);
        return [];
      },
      addToQueue: () => {},
      initQueue: () => {},
    },
  );

  await translate.discoveryAll();

  assert.deepEqual(calls, [
    {store: 'orders', 'language.language': 'pt-br', people: '/people/5', page: 1},
    {store: 'orders', 'language.language': 'pt-br', people: '/people/1', page: 1},
    {store: 'crm', 'language.language': 'pt-br', people: '/people/5', page: 1},
    {store: 'crm', 'language.language': 'pt-br', people: '/people/1', page: 1},
  ]);
});
