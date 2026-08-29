import {Platform} from 'react-native';
import {api} from '@controleonline/ui-common/src/api';

const FORBIDDEN_EXTENSIONS = new Set(['*', '*.*', '', '.', '.*']);

const extractId = value => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  const raw = typeof value === 'string' ? value : value?.id || value?.['@id'];
  const match = String(raw || '').match(/(\d+)$/);
  return match ? match[1] : '';
};

const normalizeExtension = value =>
  String(value || '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase();

const fileExtension = file => {
  const name = String(file?.name || file?.uri || '');
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
};

const sanitizeAllowedExtensions = (extensions, importType) => {
  const fallback =
    importType === 'invoice_tax' || importType === 'xml' ? ['xml', 'zip'] : ['csv'];
  const source = Array.isArray(extensions) && extensions.length > 0 ? extensions : fallback;
  const cleaned = source
    .map(normalizeExtension)
    .filter(item => item && !FORBIDDEN_EXTENSIONS.has(item) && !item.includes('*'));

  if (cleaned.length === 0) {
    throw new Error('Tipo de importacao sem extensao permitida. Importar *.* nao e permitido.');
  }

  return [...new Set(cleaned)];
};

export const uploadImportFile = (_context, payload = {}) => {
  const normalizedPayload = payload && typeof payload === 'object' ? payload : {};
  const file = normalizedPayload.file;
  const importType = String(normalizedPayload.importType || '').trim();
  const peopleId = extractId(normalizedPayload.peopleId || normalizedPayload.people);
  const allowedExtensions = sanitizeAllowedExtensions(
    normalizedPayload.allowedExtensions,
    importType,
  );

  if (!file) {
    throw new Error('Arquivo de importacao nao informado.');
  }

  if (!importType) {
    throw new Error('Tipo de importacao nao informado.');
  }

  if (!peopleId) {
    throw new Error('Empresa nao identificada para a importacao.');
  }

  const extension = fileExtension(file);
  if (!allowedExtensions.includes(extension)) {
    throw new Error(
      `Extensao nao permitida. Aceitas: ${allowedExtensions.map(item => `.${item}`).join(', ')}.`,
    );
  }

  const formData = new FormData();
  formData.append('importType', importType);
  formData.append('people', peopleId);

  if (Platform.OS === 'web') {
    formData.append('file', file);
  } else {
    formData.append('file', {
      uri: file.uri,
      name: file.name || `import.${extension || allowedExtensions[0]}`,
      type: file.mimeType || 'application/octet-stream',
    });
  }

  return api.upload('/imports/upload', formData);
};
