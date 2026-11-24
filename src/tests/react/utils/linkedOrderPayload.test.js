const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LINKED_ORDER_TYPE,
  buildLinkedOrderPayload,
} = require('../../../react/utils/linkedOrderPayload');

test('linked commercial orders start as cart so products can be edited', () => {
  assert.equal(LINKED_ORDER_TYPE, 'cart');
  const payload = buildLinkedOrderPayload({
    contractIri: '/contracts/27',
    providerIri: '/people/1',
    statusIri: '/statuses/119',
    clientIri: '/people/105792',
  });

  assert.deepEqual(payload, {
    app: 'CRM',
    orderType: 'cart',
    contract: '/contracts/27',
    provider: '/people/1',
    status: '/statuses/119',
    client: '/people/105792',
    payer: '/people/105792',
  });
});

test('empty orderType falls back to cart instead of being sent blank', () => {
  assert.equal(buildLinkedOrderPayload({orderType: ''}).orderType, 'cart');
  assert.equal(buildLinkedOrderPayload({orderType: null}).orderType, 'cart');
});

test('explicit payer wins over client and optional refs are omitted', () => {
  const payload = buildLinkedOrderPayload({
    contractIri: '/contracts/1',
    providerIri: '/people/1',
    clientIri: '/people/2',
    payerIri: '/people/3',
  });
  assert.equal(payload.payer, '/people/3');
  assert.equal('status' in payload, false);

  const withoutParties = buildLinkedOrderPayload({contractIri: '/contracts/1'});
  assert.equal('client' in withoutParties, false);
  assert.equal('payer' in withoutParties, false);
});
