import assert from 'node:assert/strict';
import test from 'node:test';

import Translate from '../../../utils/translate.js';
import {
  addPendingTranslates,
  removePendingTranslates,
} from '../../../utils/translatePending.js';
import {
  installLocalStorage,
  flushAsync,
  createPendingTranslateStore,
} from './translate.test.helpers.mjs';

// Regression: every commit on the translate store re-renders all subscribers.
// One commit per missing key exceeded React's nested update limit
// ("Maximum update depth exceeded"). Missing keys of the same tick must be
// written with a single commit.
test('writes many missing keys to the pending store with a single commit', async () => {
  installLocalStorage();

  const translateStore = createPendingTranslateStore({
    resolveQueuedMessages: async () => [],
  });
  let pendingCommits = 0;
  const setPendingMessages = translateStore.actions.setPendingMessages;
  const queueMissingTranslate = translateStore.actions.queueMissingTranslate;
  translateStore.actions.setPendingMessages = messages => {
    pendingCommits += 1;
    translateStore.getters.pendingMessages = messages;
    return setPendingMessages(messages);
  };
  translateStore.actions.queueMissingTranslate = payload => {
    pendingCommits += 1;
    return queueMissingTranslate(payload);
  };
  pendingCommits = 0;

  const translate = new Translate(
    [{id: 1}],
    {id: 1},
    {id: 1},
    ['menu'],
    translateStore,
  );
  pendingCommits = 0;

  for (let index = 0; index < 120; index += 1) {
    translate.t('menu', 'menu', `missing_key_${index}`);
  }

  await flushAsync();
  await flushAsync();

  assert.equal(pendingCommits, 1);
  const queued = translate.getQueuedTranslateGroups();
  assert.equal(queued.length, 1);
  assert.equal(queued[0].keys.length, 120);
});

test('does not queue the same missing key twice across renders', async () => {
  installLocalStorage();

  const translateStore = createPendingTranslateStore({
    resolveQueuedMessages: async () => [],
  });
  const translate = new Translate(
    [{id: 1}],
    {id: 1},
    {id: 1},
    ['menu'],
    translateStore,
  );

  for (let render = 0; render < 5; render += 1) {
    translate.t('menu', 'menu', 'products');
    await flushAsync();
  }

  assert.deepEqual(translate.getQueuedTranslateGroups(), [
    {store: 'menu', type: 'menu', keys: ['products']},
  ]);
});

test('addPendingTranslates / removePendingTranslates are immutable and idempotent', () => {
  const entries = [
    {store: 'menu', type: 'menu', key: 'a', translate: 'A'},
    {store: 'menu', type: 'menu', key: 'b', translate: 'B'},
  ];
  const base = {};
  const added = addPendingTranslates(base, 'pt_BR', 1, entries);

  assert.deepEqual(base, {});
  assert.deepEqual(added['pt-br'].companies['1'].menu.menu, {a: 'A', b: 'B'});
  assert.equal(addPendingTranslates(added, 'pt-br', 1, entries), added);

  const removed = removePendingTranslates(added, 'pt-br', 1, entries);
  assert.deepEqual(removed, {});
  assert.deepEqual(added['pt-br'].companies['1'].menu.menu, {a: 'A', b: 'B'});
  assert.equal(removePendingTranslates(removed, 'pt-br', 1, entries), removed);
});
