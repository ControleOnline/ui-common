const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DATE_FILTER_LABEL_KEYS = {
  all: 'period_all',
  today: 'period_today',
  '7d': 'period_7d',
  '30d': 'period_30d',
  this_month: 'period_this_month',
  last_month: 'period_last_month',
  custom: 'period_custom',
};

const pad2 = value => String(value).padStart(2, '0');

const formatDateToApi = date =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;

const resolveOrderLabel = key => global.t?.t('orders', 'label', key);

const createDayStart = date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const createDayEnd = date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const formatDateLabel = date => date.toLocaleDateString('pt-BR');

const createRangeEnd = (baseDate, useCurrentMoment = false) =>
  useCurrentMoment ? new Date(baseDate) : createDayEnd(baseDate);

const resolveRelativeStart = (baseDate, days, relativeMode = 'calendar') => {
  if (relativeMode === 'rolling') {
    const startDate = new Date(baseDate);
    startDate.setDate(startDate.getDate() - days);
    return startDate;
  }

  const startDate = createDayStart(baseDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  return startDate;
};

// Shared parser for screens that accept direct YYYY-MM-DD input.
export const parseDateInput = value => {
  const normalizedValue = String(value || '').trim();

  if (!DATE_INPUT_PATTERN.test(normalizedValue)) {
    return null;
  }

  const [year, month, day] = normalizedValue.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day, 0, 0, 0, 0);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

// Validation stays centralized so every screen uses the same rules and messages.
export const validateCustomDateRange = (fromInput, toInput) => {
  const fromValue = String(fromInput || '').trim();
  const toValue = String(toInput || '').trim();
  const fromDate = fromValue ? parseDateInput(fromValue) : null;
  const toDate = toValue ? parseDateInput(toValue) : null;

  if ((fromValue && !fromDate) || (toValue && !toDate)) {
    return global.t?.t('orders', 'validation', 'invalid_date_format');
  }

  if (fromDate && toDate && fromDate > toDate) {
    return global.t?.t('orders', 'validation', 'invalid_date_range');
  }

  return '';
};

const resolveDateObjectsRange = (dateFilterKey, customRange = null, options = {}) => {
  const {
    baseDate = new Date(),
    relativeMode = 'calendar',
    useCurrentMoment = false,
  } = options;
  const now = new Date(baseDate);

  if (dateFilterKey === 'today') {
    return {
      afterDate: createDayStart(now),
      beforeDate: createRangeEnd(now, useCurrentMoment),
    };
  }

  if (dateFilterKey === '7d') {
    return {
      afterDate: resolveRelativeStart(now, 7, relativeMode),
      beforeDate: createRangeEnd(now, useCurrentMoment),
    };
  }

  if (dateFilterKey === '30d') {
    return {
      afterDate: resolveRelativeStart(now, 30, relativeMode),
      beforeDate: createRangeEnd(now, useCurrentMoment),
    };
  }

  if (dateFilterKey === 'this_month') {
    return {
      afterDate: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      beforeDate: createRangeEnd(now, useCurrentMoment),
    };
  }

  if (dateFilterKey === 'last_month') {
    return {
      afterDate: new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0),
      beforeDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }

  if (dateFilterKey === 'custom') {
    const afterDate = parseDateInput(customRange?.from);
    const beforeDate = parseDateInput(customRange?.to);

    if (afterDate) {
      afterDate.setHours(0, 0, 0, 0);
    }

    if (beforeDate) {
      beforeDate.setHours(23, 59, 59, 999);
    }

    return {
      afterDate,
      beforeDate,
    };
  }

  return {
    afterDate: null,
    beforeDate: null,
  };
};

export const DEFAULT_DATE_FILTER_KEY = 'today';

export const DEFAULT_DATE_FILTER_OPTION_KEYS = [
  'all',
  'today',
  '7d',
  '30d',
  'this_month',
  'last_month',
  'custom',
];

export const buildDateFilterOptions = (
  optionKeys = DEFAULT_DATE_FILTER_OPTION_KEYS,
) => optionKeys.map(key => ({
  key,
  label: resolveOrderLabel(DATE_FILTER_LABEL_KEYS[key] || key),
}));

export const getDateRange = (
  dateFilterKey,
  customRange = null,
  options = {},
) => {
  const { afterDate, beforeDate } = resolveDateObjectsRange(
    dateFilterKey,
    customRange,
    options,
  );

  return {
    after: afterDate ? formatDateToApi(afterDate) : null,
    before: beforeDate ? formatDateToApi(beforeDate) : null,
  };
};

export const resolveDateRangeSummary = (
  dateFilterKey,
  customRange = null,
  options = {},
) => {
  const { afterDate, beforeDate } = resolveDateObjectsRange(
    dateFilterKey,
    customRange,
    options,
  );

  if (!afterDate || !beforeDate) {
    return afterDate ? formatDateLabel(afterDate) : beforeDate ? formatDateLabel(beforeDate) : '';
  }

  const afterLabel = formatDateLabel(afterDate);
  const beforeLabel = formatDateLabel(beforeDate);

  if (afterLabel === beforeLabel) {
    return afterLabel;
  }

  return `${afterLabel} - ${beforeLabel}`;
};

export const resolveDateFilterTitle = () =>
  resolveOrderLabel('period');

export const resolveDateFilterCurrentLabel = () =>
  resolveOrderLabel('current_date');
