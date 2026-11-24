const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveClientPortfolioParams } = require('../../../react/utils/clientPortfolioParams');

test('seller only sees his own portfolio', () => {
  assert.deepEqual(
    resolveClientPortfolioParams({ currentCompanyId: 1, permissions: ['salesman'], sellerPeopleId: 31487 }),
    { 'link.company': '/people/31487', 'link.linkType': 'sellers-client' },
  );
});

test('owners and managers see every company client', () => {
  const expected = { 'link.company': '/people/1', 'link.linkType': 'client' };
  assert.deepEqual(
    resolveClientPortfolioParams({ currentCompanyId: 1, permissions: ['salesman', 'owner'], sellerPeopleId: 7 }),
    expected,
  );
  assert.deepEqual(
    resolveClientPortfolioParams({ currentCompanyId: '/people/1', permissions: 'manager', sellerPeopleId: 7 }),
    expected,
  );
});

test('without seller data falls back to company clients, without company returns null', () => {
  assert.deepEqual(
    resolveClientPortfolioParams({ currentCompanyId: 1, permissions: ['salesman'] }),
    { 'link.company': '/people/1', 'link.linkType': 'client' },
  );
  assert.equal(resolveClientPortfolioParams({ permissions: ['salesman'], sellerPeopleId: 1 }), null);
});
