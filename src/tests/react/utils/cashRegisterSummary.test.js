const test = require('node:test');
const assert = require('node:assert/strict');
const {buildCashSummaryParams, buildCashDrilldownNavigation, isValidDate, resolveDeviceLabel, sumDeviceBalances} = require('../../../react/utils/cashRegisterSummary');

test('requires company and a known period', () => {
  assert.deepEqual(buildCashSummaryParams({period: 'today'}), {error: 'company'});
  assert.deepEqual(buildCashSummaryParams({companyId: 1, period: 'x'}), {error: 'period'});
});

test('preset periods only send provider and period', () => {
  assert.deepEqual(buildCashSummaryParams({companyId: 7, period: 'week', from: '2026-01-01'}), {
    params: {provider: 7, period: 'week'},
  });
});

test('custom period validates dates and order', () => {
  assert.deepEqual(buildCashSummaryParams({companyId: 7, period: 'custom', from: '2026-11-01', to: '2026-10-01'}), {error: 'range'});
  assert.deepEqual(buildCashSummaryParams({companyId: 7, period: 'custom', from: '2026-02-30', to: '2026-03-01'}), {error: 'range'});
  assert.deepEqual(buildCashSummaryParams({companyId: 7, period: 'custom', from: '2026-10-01', to: '2026-10-31', device: 'abc'}), {
    params: {provider: 7, period: 'custom', from: '2026-10-01', to: '2026-10-31', device: 'abc'},
  });
  assert.equal(isValidDate('2026-10-01'), true);
});

test('drill-down keeps payment type and period from the summary', () => {
  const summary = {from: '2026-11-01', to: '2026-11-30', scope: 'company'};
  assert.deepEqual(buildCashDrilldownNavigation({paymentTypeId: 63}, summary), {
    routeName: 'FinancialHubPage',
    params: {cashFilter: {paymentTypeId: 63, from: '2026-11-01', to: '2026-11-30'}},
  });
});

test('drill-down carries the user when the scope is the user', () => {
  const nav = buildCashDrilldownNavigation({paymentTypeId: 1}, {from: '2026-11-07', to: '2026-11-07', scope: 'user', userId: 6});
  assert.equal(nav.params.cashFilter.userId, 6);
});

test('drill-down is disabled without payment type or valid period', () => {
  assert.equal(buildCashDrilldownNavigation({paymentTypeId: null}, {from: '2026-11-01', to: '2026-11-30'}), null);
  assert.equal(buildCashDrilldownNavigation({paymentTypeId: 1}, {from: 'x', to: '2026-11-30'}), null);
});

test('device label uses the backend label with fallbacks and groups rows without device', () => {
  assert.equal(resolveDeviceLabel({deviceId: 4, label: 'Balcao (123456)'}), 'Balcao (123456)');
  assert.equal(resolveDeviceLabel({deviceId: 4, device: 'web-6'}), 'web-6');
  assert.equal(resolveDeviceLabel({deviceId: 4}), '#4');
  assert.equal(resolveDeviceLabel({deviceId: null}), 'Sem dispositivo');
});

test('device balances sum matches the payment total without float drift', () => {
  assert.equal(sumDeviceBalances([{balance: 1140.01}, {balance: 2}]), 1142.01);
  assert.equal(sumDeviceBalances([{balance: 0.1}, {balance: 0.2}]), 0.3);
  assert.equal(sumDeviceBalances(undefined), 0);
});
