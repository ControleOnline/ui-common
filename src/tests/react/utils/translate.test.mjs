import assert from 'node:assert/strict';
import test from 'node:test';

import Translate from '../../../utils/translate.js';

const installLocalStorage = () => {
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

  localStorage.setItem('config', JSON.stringify({language: 'pt-br'}));
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

test('loads each requested store for every linked company once', async () => {
  installLocalStorage();

  const calls = [];
  const translate = new Translate(
    [{id: 1}, {id: 5}],
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
    {store: 'orders', 'language.language': 'pt-br', people: '/people/1', page: 1},
    {store: 'orders', 'language.language': 'pt-br', people: '/people/5', page: 1},
    {store: 'crm', 'language.language': 'pt-br', people: '/people/1', page: 1},
    {store: 'crm', 'language.language': 'pt-br', people: '/people/5', page: 1},
  ]);
});
