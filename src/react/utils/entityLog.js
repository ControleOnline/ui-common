import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  buildAddressOptionSummary,
  formatHumanLabel,
  normalizeText,
} from '@controleonline/ui-common/src/react/utils/entityDisplay';
import { resolveFileImageUrl } from '@controleonline/ui-common/src/react/utils/fileUrl';

const DEFAULT_RESOURCE_CLASS_MAP = {
  address: 'ControleOnline\\Entity\\Address',
  addresses: 'ControleOnline\\Entity\\Address',
  card: 'ControleOnline\\Entity\\Card',
  cards: 'ControleOnline\\Entity\\Card',
  categories: 'ControleOnline\\Entity\\Category',
  category: 'ControleOnline\\Entity\\Category',
  contracts: 'ControleOnline\\Entity\\Contract',
  contract: 'ControleOnline\\Entity\\Contract',
  devices: 'ControleOnline\\Entity\\Device',
  device: 'ControleOnline\\Entity\\Device',
  display: 'ControleOnline\\Entity\\Display',
  displays: 'ControleOnline\\Entity\\Display',
  files: 'ControleOnline\\Entity\\File',
  file: 'ControleOnline\\Entity\\File',
  invoices: 'ControleOnline\\Entity\\Invoice',
  invoice: 'ControleOnline\\Entity\\Invoice',
  logs: 'ControleOnline\\Entity\\Log',
  log: 'ControleOnline\\Entity\\Log',
  order_invoice: 'ControleOnline\\Entity\\OrderInvoice',
  order_invoices: 'ControleOnline\\Entity\\OrderInvoice',
  order_invoice_tax: 'ControleOnline\\Entity\\OrderInvoiceTax',
  order_invoice_taxes: 'ControleOnline\\Entity\\OrderInvoiceTax',
  order_product: 'ControleOnline\\Entity\\OrderProduct',
  order_products: 'ControleOnline\\Entity\\OrderProduct',
  orders: 'ControleOnline\\Entity\\Order',
  order: 'ControleOnline\\Entity\\Order',
  payment_type: 'ControleOnline\\Entity\\PaymentType',
  payment_types: 'ControleOnline\\Entity\\PaymentType',
  people: 'ControleOnline\\Entity\\People',
  people_link: 'ControleOnline\\Entity\\PeopleLink',
  people_links: 'ControleOnline\\Entity\\PeopleLink',
  product: 'ControleOnline\\Entity\\Product',
  products: 'ControleOnline\\Entity\\Product',
  product_group: 'ControleOnline\\Entity\\ProductGroup',
  product_groups: 'ControleOnline\\Entity\\ProductGroup',
  status: 'ControleOnline\\Entity\\Status',
  statuses: 'ControleOnline\\Entity\\Status',
  task: 'ControleOnline\\Entity\\Task',
  tasks: 'ControleOnline\\Entity\\Task',
  user: 'ControleOnline\\Entity\\User',
  users: 'ControleOnline\\Entity\\User',
  wallet: 'ControleOnline\\Entity\\Wallet',
  wallets: 'ControleOnline\\Entity\\Wallet',
};

const IGNORED_KEYS = new Set([
  '@context',
  '@type',
  'extraData',
  'otherInformations',
]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?/;
const MONEY_FIELD_PATTERN = /(?:^|_)(?:price|total|amount|value|cost|fee|discount)(?:$|_)/i;

export const extractEntityId = entity => {
  if (!entity) return null;

  if (typeof entity === 'number' || typeof entity === 'string') {
    const matches = String(entity).match(/\d+/g);
    return matches ? Number(matches[matches.length - 1]) : null;
  }

  if (typeof entity === 'object') {
    if (entity.id !== undefined && entity.id !== null && entity.id !== '') {
      return Number(entity.id);
    }

    if (entity['@id']) {
      const matches = String(entity['@id']).match(/\d+/g);
      return matches ? Number(matches[matches.length - 1]) : null;
    }
  }

  return null;
};

const singularizeResourceName = resourceName => {
  const normalized = String(resourceName || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');

  if (!normalized) {
    return '';
  }

  if (normalized.endsWith('ies')) {
    return `${normalized.slice(0, -3)}y`;
  }

  if (normalized.endsWith('sses')) {
    return normalized.slice(0, -2);
  }

  if (normalized.endsWith('ses')) {
    return normalized.slice(0, -2);
  }

  if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
    return normalized.slice(0, -1);
  }

  return normalized;
};

const snakeToPascal = value =>
  String(value || '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

export const resolveEntityClassFromIri = (iri, classMap = {}) => {
  const normalizedIri = String(iri || '').trim();
  if (!normalizedIri) {
    return '';
  }

  const segments = normalizedIri.split('/').filter(Boolean);
  if (segments.length < 2) {
    return '';
  }

  const resourceName = segments[segments.length - 2];
  const normalizedResourceName = singularizeResourceName(resourceName);
  const combinedMap = {
    ...DEFAULT_RESOURCE_CLASS_MAP,
    ...classMap,
  };

  return (
    combinedMap[resourceName] ||
    combinedMap[normalizedResourceName] ||
    (normalizedResourceName
      ? `ControleOnline\\Entity\\${snakeToPascal(normalizedResourceName)}`
      : '')
  );
};
export const resolveEntityClassFromType = type => {
  const normalizedType = String(type || '').trim().replace(/^#/, '');
  if (!normalizedType) {
    return '';
  }

  if (normalizedType.includes('\\')) {
    return normalizedType;
  }

  return `ControleOnline\\Entity\\${normalizedType}`;
};

export const buildEntityIri = ({ entity, iri = '' }) => {
  if (typeof entity?.['@id'] === 'string' && entity['@id'].trim()) {
    return entity['@id'].trim();
  }

  return typeof iri === 'string' ? iri.trim() : '';
};

const getShortClassName = className => {
  const normalized = String(className || '').replace(/^Entity:/, '').trim();
  if (!normalized) {
    return '';
  }

  const parts = normalized.split('\\').filter(Boolean);
  return parts[parts.length - 1] || normalized;
};

const normalizeNumericValue = value => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : null;
};

const isImageFile = fileEntity =>
  /image/i.test(
    String(fileEntity?.fileType || fileEntity?.type || fileEntity?.mimeType || ''),
  );

const resolveCoverRelation = (relations = [], relationId = null) => {
  const normalizedRelationId = extractEntityId(relationId);
  const safeRelations = Array.isArray(relations) ? relations.filter(Boolean) : [];

  if (normalizedRelationId) {
    const matchedRelation = safeRelations.find(
      relation => extractEntityId(relation) === normalizedRelationId,
    );
    if (matchedRelation) {
      return matchedRelation;
    }
  }

  return safeRelations.find(relation => isImageFile(relation?.file || relation))
    || safeRelations[0]
    || null;
};

const resolveEntityFileCandidate = entity => {
  if (!entity || typeof entity !== 'object') {
    return null;
  }

  if (isImageFile(entity) || entity?.context || entity?.extension) {
    return entity;
  }

  if (entity?.file) {
    return entity.file;
  }

  if (entity?.logo) {
    return entity.logo;
  }

  if (entity?.avatar) {
    return entity.avatar;
  }

  if (entity?.background) {
    return entity.background;
  }

  const fileRelations = [
    ...((Array.isArray(entity?.productFiles) ? entity.productFiles : [])),
    ...((Array.isArray(entity?.categoryFiles) ? entity.categoryFiles : [])),
    ...((Array.isArray(entity?.files) ? entity.files : [])),
    ...((Array.isArray(entity?.attachments) ? entity.attachments : [])),
    ...((Array.isArray(entity?.images) ? entity.images : [])),
  ];

  return resolveCoverRelation(fileRelations, entity?.extraData?.imageCoverRelationId)?.file
    || null;
};

export const buildEntityKey = (className, id) =>
  className && id ? `${className}#${id}` : '';

export const parseEntityReference = value => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const matches = normalized.match(/^(?:Entity:)?([A-Za-z0-9_\\]+)#(\d+)$/);
  if (!matches) {
    return null;
  }

  return {
    className: matches[1],
    id: Number(matches[2]),
    key: buildEntityKey(matches[1], Number(matches[2])),
  };
};

export const buildEntityLabel = ({
  entity,
  className,
  id,
  fallbackLabel = '',
}) => {
  const addressSummary =
    entity && typeof entity === 'object' ? buildAddressOptionSummary(entity) : null;

  const statusText = normalizeText(
    entity?.status?.status ||
      entity?.status?.realStatus ||
      entity?.realStatus ||
      entity?.real_status ||
      entity?.status,
  );

  const preferredText = normalizeText(
    entity?.alias ||
      entity?.name ||
      entity?.nickname ||
      entity?.label ||
      entity?.title ||
      entity?.display ||
      entity?.document ||
      entity?.username ||
      entity?.device ||
      entity?.email ||
      entity?.city ||
      entity?.district ||
      entity?.street ||
      entity?.measure ||
      entity?.model ||
      entity?.context ||
      statusText ||
      addressSummary?.primary ||
      fallbackLabel,
  );

  if (preferredText) {
    return preferredText;
  }

  const shortClassName = formatHumanLabel(getShortClassName(className));
  if (shortClassName && id) {
    return `${shortClassName} #${id}`;
  }

  return shortClassName || `#${id || '--'}`;
};

export const formatLogFieldLabel = fieldName =>
  formatHumanLabel(
    String(fieldName || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim(),
  ) || 'Campo';

export const formatLogValue = value => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Nao';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    const entityReference = parseEntityReference(value);
    if (entityReference) {
      return `${formatHumanLabel(getShortClassName(entityReference.className))} #${entityReference.id}`;
    }

    if (DATE_PATTERN.test(value)) {
      return Formatter.formatDateYmdTodmY(value, value.includes(':'));
    }

    return value;
  }

  if (Array.isArray(value)) {
    const normalizedValues = value
      .map(item => formatLogValue(item))
      .filter(Boolean);

    return normalizedValues.length ? normalizedValues.join(', ') : '—';
  }

  if (typeof value === 'object') {
    return buildEntityLabel({ entity: value });
  }

  return String(value);
};

const appendSummaryField = (fields, label, rawValue, options = {}) => {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return;
  }

  const formattedValue = options.money
    ? Formatter.formatMoney(normalizeNumericValue(rawValue) || 0)
    : formatLogValue(rawValue);

  if (!formattedValue || formattedValue === '—') {
    return;
  }

  if (fields.some(field => field.label === label && field.value === formattedValue)) {
    return;
  }

  fields.push({
    key: `${label}-${fields.length}`,
    label,
    value: formattedValue,
  });
};

export const buildEntitySummaryFields = ({ entity, className }) => {
  if (!entity || typeof entity !== 'object') {
    return [];
  }

  const fields = [];
  const shortClassName = getShortClassName(className);

  if (shortClassName === 'Product') {
    appendSummaryField(fields, 'Produto', entity?.product || entity?.name);
    appendSummaryField(fields, 'Preco', entity?.price, { money: true });
    appendSummaryField(fields, 'SKU', entity?.sku);
    appendSummaryField(fields, 'Unidade', entity?.productUnit?.productUnit || entity?.productUnit?.unit);
    appendSummaryField(fields, 'Descricao', entity?.description);
    return fields;
  }

  if (shortClassName === 'OrderProduct') {
    appendSummaryField(fields, 'Produto', entity?.product?.product || entity?.product?.name);
    appendSummaryField(fields, 'Quantidade', entity?.quantity);
    appendSummaryField(fields, 'Preco unitario', entity?.unitPrice ?? entity?.price, {
      money: true,
    });
    appendSummaryField(fields, 'Total', entity?.total, { money: true });
    appendSummaryField(fields, 'Observacao', entity?.comment || entity?.observation);
    return fields;
  }

  appendSummaryField(fields, 'Nome', entity?.name || entity?.alias || entity?.product || entity?.title);
  appendSummaryField(fields, 'Status', entity?.status?.status || entity?.status?.realStatus || entity?.status);
  appendSummaryField(fields, 'Documento', entity?.document);
  appendSummaryField(fields, 'E-mail', entity?.email);
  appendSummaryField(fields, 'Telefone', entity?.phone);
  appendSummaryField(fields, 'SKU', entity?.sku);

  Object.entries(entity).forEach(([fieldName, fieldValue]) => {
    if (fields.length >= 6 || IGNORED_KEYS.has(fieldName)) {
      return;
    }

    if (typeof fieldValue === 'object' || Array.isArray(fieldValue)) {
      return;
    }

    if (MONEY_FIELD_PATTERN.test(fieldName)) {
      appendSummaryField(fields, formatLogFieldLabel(fieldName), fieldValue, {
        money: true,
      });
      return;
    }

    if (DATE_PATTERN.test(String(fieldValue || ''))) {
      appendSummaryField(fields, formatLogFieldLabel(fieldName), fieldValue);
    }
  });

  appendSummaryField(fields, 'Descricao', entity?.description);

  return fields.slice(0, 6);
};

export const resolveEntityImageUrl = entity => {
  const fileEntity = resolveEntityFileCandidate(entity);
  return resolveFileImageUrl(fileEntity);
};

const resolveRelationItems = (entity, key, config = {}) => {
  if (typeof config.extractItems === 'function') {
    const extractedItems = config.extractItems(entity);
    return Array.isArray(extractedItems)
      ? extractedItems.filter(Boolean)
      : extractedItems
        ? [extractedItems]
        : [];
  }

  const value = entity?.[key];
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
};

const buildRelationItemCandidate = ({
  entity,
  className,
  fallbackLabel,
  classMap,
  iri,
}) => {
  const id = extractEntityId(entity);
  const resolvedClassName =
    className ||
    resolveEntityClassFromType(entity?.['@type']) ||
    resolveEntityClassFromIri(entity?.['@id'], classMap) ||
    '';

  if (!id || !resolvedClassName) {
    return null;
  }

  return {
    key: buildEntityKey(resolvedClassName, id),
    id,
    className: resolvedClassName,
    entity,
    iri: buildEntityIri({ entity, iri }),
    label: buildEntityLabel({
      entity,
      className: resolvedClassName,
      id,
      fallbackLabel,
    }),
  };
};

const isEntityLikeObject = value =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  extractEntityId(value);

export const buildEntityChildren = (
  entity,
  {
    relationConfig = {},
    classMap = {},
    ancestryKeys = [],
  } = {},
) => {
  if (!entity || typeof entity !== 'object') {
    return [];
  }

  const ancestrySet = new Set(ancestryKeys.filter(Boolean));
  const candidates = [];
  const handledKeys = new Set();

  Object.entries(relationConfig || {}).forEach(([key, config]) => {
    handledKeys.add(key);

    const relationItems = resolveRelationItems(entity, key, config);
    if (!relationItems.length) {
      return;
    }

    const items = relationItems
      .map(item =>
        buildRelationItemCandidate({
          entity: item,
          className: config?.className,
          fallbackLabel: config?.itemLabel || config?.label || formatLogFieldLabel(key),
          classMap,
          iri: typeof config?.buildIri === 'function' ? config.buildIri(item) : config?.iri,
        }),
      )
      .filter(Boolean)
      .filter(item => !ancestrySet.has(item.key));

    if (!items.length) {
      return;
    }

    candidates.push({
      key,
      label: config?.label || formatLogFieldLabel(key),
      items,
      isCollection: config?.isCollection || items.length > 1,
    });
  });

  Object.entries(entity).forEach(([key, value]) => {
    if (
      handledKeys.has(key) ||
      IGNORED_KEYS.has(key) ||
      value === null ||
      value === undefined
    ) {
      return;
    }

    if (Array.isArray(value)) {
      const items = value
        .filter(isEntityLikeObject)
        .map(item =>
          buildRelationItemCandidate({
            entity: item,
            fallbackLabel: formatLogFieldLabel(key),
            classMap,
            iri: item?.['@id'],
          }),
        )
        .filter(Boolean)
        .filter(item => !ancestrySet.has(item.key));

      if (!items.length) {
        return;
      }

      candidates.push({
        key,
        label: formatLogFieldLabel(key),
        items,
        isCollection: true,
      });
      return;
    }

    if (!isEntityLikeObject(value)) {
      return;
    }

    const item = buildRelationItemCandidate({
      entity: value,
      fallbackLabel: formatLogFieldLabel(key),
      classMap,
      iri: value?.['@id'],
    });

    if (!item || ancestrySet.has(item.key)) {
      return;
    }

    candidates.push({
      key,
      label: formatLogFieldLabel(key),
      items: [item],
      isCollection: false,
    });
  });

  return candidates.sort((left, right) =>
    String(left.label || '').localeCompare(String(right.label || ''), 'pt-BR'),
  );
};
