const test = require('node:test');
const assert = require('node:assert/strict');
const { formatBRL, summarizeOrderProducts } = require('../../../react/utils/orderProductsSummary');

test('sums only top-level lines', () => {
  const items = [
    { id: 1, quantity: 2, price: 130, total: 260 },
    { id: 2, quantity: 1, price: 0.01, total: 0.01 },
    { id: 3, quantity: 1, price: 10, total: 10, orderProduct: '/order_products/1' },
  ];
  assert.deepEqual(summarizeOrderProducts(items), { count: 2, total: 260.01 });
});

test('falls back to price x quantity and handles empty input', () => {
  assert.deepEqual(summarizeOrderProducts([{ quantity: 3, price: 2.5 }]), { count: 1, total: 7.5 });
  assert.deepEqual(summarizeOrderProducts(null), { count: 0, total: 0 });
});

test('formats Brazilian currency', () => {
  assert.equal(formatBRL(1260), 'R$ 1.260,00');
  assert.equal(formatBRL(260.01), 'R$ 260,01');
  assert.equal(formatBRL(0), 'R$ 0,00');
  assert.equal(formatBRL(1234567.8), 'R$ 1.234.567,80');
});
