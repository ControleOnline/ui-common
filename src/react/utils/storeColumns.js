import { getAllStores } from '@store';
import { formatHumanLabel } from '@controleonline/ui-common/src/react/utils/entityDisplay';

const normalizeText = value => String(value || '').trim();

const singularizeResourceName = resourceName => {
  const normalized = normalizeText(resourceName).replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    return '';
  }

  if (normalized.endsWith('ies')) {
    return `${normalized.slice(0, -3)}y`;
  }

  if (normalized.endsWith('sses') || normalized.endsWith('ses')) {
    return normalized.slice(0, -2);
  }

  if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
    return normalized.slice(0, -1);
  }

  return normalized;
};

const normalizeKey = value =>
  normalizeText(value)
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const extractEntityResource = entityIri => {
  const normalizedIri = normalizeText(entityIri);
  if (!normalizedIri) {
    return '';
  }

  const segments = normalizedIri.split('/').filter(Boolean);
  if (segments.length < 2) {
    return '';
  }

  return normalizeText(segments[segments.length - 2]);
};

const getStoreColumns = store => {
  const columns = store?.getters?.columns || store?.columns;
  return Array.isArray(columns) ? columns.filter(Boolean) : [];
};

const getStoreEndpoint = store =>
  normalizeText(store?.getters?.resourceEndpoint || store?.resourceEndpoint).replace(
    /^\/+|\/+$/g,
    '',
  );

const normalizeComparableValue = value => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return normalizeComparableValue(
      value?.value ?? value?.['@id'] ?? value?.id ?? value?.label ?? '',
    );
  }

  return normalizeText(value);
};

const buildRowContext = (row, fieldName, value) => {
  if (!fieldName) {
    return row || {};
  }

  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return {[fieldName]: value};
  }

  return {
    ...row,
    [fieldName]: value,
  };
};

const resolveListValue = ({column, value, row}) => {
  if (!Array.isArray(column?.list) || !column.list.length) {
    return value;
  }

  const comparableValue = normalizeComparableValue(value);
  const matchedItem = column.list.find(item => {
    const currentValue =
      item?.value ?? item?.['@id'] ?? item?.id ?? item?.label ?? item;

    return normalizeComparableValue(currentValue) === comparableValue;
  });

  if (!matchedItem) {
    return value;
  }

  if (typeof column.formatList === 'function') {
    const formattedItem = column.formatList(matchedItem, column, row);
    if (formattedItem && typeof formattedItem === 'object' && !Array.isArray(formattedItem)) {
      return formattedItem?.label ?? formattedItem?.value ?? matchedItem?.label ?? value;
    }

    return formattedItem;
  }

  return matchedItem?.label ?? value;
};

const normalizeFormattedValue = value => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value?.label ?? value?.value ?? value?.name ?? value;
  }

  return value;
};

const translateColumnValue = ({column, storeName, value}) => {
  if (!column?.translate || typeof value !== 'string' || !normalizeText(storeName)) {
    return value;
  }

  const translateFn =
    typeof globalThis !== 'undefined' && typeof globalThis?.t?.t === 'function'
      ? globalThis.t.t.bind(globalThis.t)
      : null;

  return translateFn ? translateFn(storeName, 'span', value) : value;
};

export const resolveStoreConfigByEntity = ({entity = null, entityIri = ''} = {}) => {
  const resolvedEntityIri =
    normalizeText(entity?.['@id']) || normalizeText(entityIri);
  const resourceName = extractEntityResource(resolvedEntityIri);
  if (!resourceName) {
    return {
      columns: [],
      resourceName: '',
      storeName: '',
    };
  }

  const normalizedResourceName = singularizeResourceName(resourceName);
  const stores = getAllStores();

  const candidates = Object.entries(stores || {})
    .map(([storeName, store]) => {
      const resourceEndpoint = getStoreEndpoint(store);
      const normalizedEndpoint = singularizeResourceName(resourceEndpoint);
      const columns = getStoreColumns(store);

      if (
        !resourceEndpoint ||
        (resourceEndpoint !== resourceName && normalizedEndpoint !== normalizedResourceName)
      ) {
        return null;
      }

      let score = 0;
      if (resourceEndpoint === resourceName) score += 4;
      if (storeName === resourceName) score += 3;
      if (storeName === normalizedResourceName) score += 2;
      if (resourceEndpoint === storeName) score += 1;
      if (columns.length) score += 1;

      return {
        columns,
        resourceName,
        score,
        storeName,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.columns.length - left.columns.length;
    });

  return candidates[0] || {
    columns: [],
    resourceName,
    storeName: '',
  };
};

export const resolveStoreColumn = (columns = [], fieldName = '') => {
  const normalizedFieldName = normalizeKey(fieldName);
  if (!normalizedFieldName) {
    return null;
  }

  return columns.find(column => {
    const candidateNames = [
      column?.key,
      column?.name,
      column?.label,
    ]
      .map(normalizeKey)
      .filter(Boolean);

    return candidateNames.includes(normalizedFieldName);
  }) || null;
};

export const formatStoreColumnLabel = ({
  columns = [],
  fieldName = '',
  fallbackLabel = '',
  storeName = '',
} = {}) => {
  const column = resolveStoreColumn(columns, fieldName);
  if (!column?.label) {
    return fallbackLabel;
  }

  const normalizedLabel = normalizeText(column.label);
  if (!normalizedLabel) {
    return fallbackLabel;
  }

  const resolvedLabel = translateColumnValue({
    column,
    storeName,
    value: normalizedLabel,
  });

  return formatHumanLabel(resolvedLabel) || resolvedLabel;
};

// Replica a logica central de columns do store para usos fora das listagens padrao.
export const formatStoreColumnValue = ({
  columns = [],
  fieldName = '',
  row = null,
  storeName = '',
  value,
} = {}) => {
  const column = resolveStoreColumn(columns, fieldName);
  if (!column) {
    return undefined;
  }

  const rowContext = buildRowContext(row, fieldName, value);
  const resolvedValue = resolveListValue({
    column,
    row: rowContext,
    value,
  });

  let formattedValue = resolvedValue;
  if (typeof column.format === 'function') {
    formattedValue = column.format(resolvedValue, column, rowContext, false);
  }

  return translateColumnValue({
    column,
    storeName,
    value: normalizeFormattedValue(formattedValue),
  });
};
