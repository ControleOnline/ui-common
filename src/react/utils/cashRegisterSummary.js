const PERIODS = ['today', 'yesterday', 'week', 'month', 'custom'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = value => {
  if (!DATE_PATTERN.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

/**
 * Builds the query string params of GET /cash-register/summary.
 * Returns {error} when the selected period is incomplete or invalid.
 */
const buildCashSummaryParams = ({companyId, period, from, to, device}) => {
  if (!companyId) return {error: 'company'};
  if (!PERIODS.includes(period)) return {error: 'period'};

  const params = {provider: companyId, period};
  if (period === 'custom') {
    if (!isValidDate(from) || !isValidDate(to) || to < from) {
      return {error: 'range'};
    }
    params.from = from;
    params.to = to;
  }
  if (device) params.device = device;
  return {params};
};

/**
 * Params for navigating from a payment-type row to FinancialHubPage, keeping the
 * period shown on the Caixa screen. Returns null for rows without payment type.
 */
const buildCashDrilldownNavigation = (item, summary) => {
  const paymentTypeId = Number(item?.paymentTypeId);
  if (!Number.isInteger(paymentTypeId) || paymentTypeId <= 0) return null;
  if (!isValidDate(summary?.from) || !isValidDate(summary?.to)) return null;

  const cashFilter = {paymentTypeId, from: summary.from, to: summary.to};
  if (summary.scope === 'user' && summary.userId) cashFilter.userId = summary.userId;

  return {routeName: 'FinancialHubPage', params: {cashFilter}};
};

module.exports = {PERIODS, isValidDate, buildCashSummaryParams, buildCashDrilldownNavigation};
