import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDateFilterOptions,
  getDateRange,
  resolveDateRangeSummary,
} from '../../../react/utils/dateRangeFilter.js';

test('keeps 90d available in the shared date filter contract', () => {
  const baseDate = new Date(2026, 5, 8, 12, 0, 0, 0);

  assert.deepEqual(buildDateFilterOptions(['90d']), [
    { key: '90d', label: '90 dias' },
  ]);

  assert.deepEqual(
    getDateRange('90d', null, { baseDate }),
    {
      after: '2026-03-11 00:00:00',
      before: '2026-06-08 23:59:59',
    },
  );

  assert.equal(
    resolveDateRangeSummary('90d', null, { baseDate }),
    '11/03/2026 - 08/06/2026',
  );
});
