import {Platform} from 'react-native';
import {api} from '@controleonline/ui-common/src/api';

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

export const uploadImportFile = (_context, payload = {}) => {
  const normalizedPayload = payload && typeof payload === 'object' ? payload : {};
  const file = normalizedPayload.file;
  const importType = String(normalizedPayload.importType || '').trim();
  const peopleId = extractId(normalizedPayload.peopleId || normalizedPayload.people);

  if (!file) {
    throw new Error('Arquivo de importacao nao informado.');
  }

  if (!importType) {
    throw new Error('Tipo de importacao nao informado.');
  }

  if (!peopleId) {
    throw new Error('Empresa nao identificada para a importacao.');
  }

  const formData = new FormData();
  formData.append('importType', importType);
  formData.append('people', peopleId);

  if (Platform.OS === 'web') {
    formData.append('file', file);
  } else {
    formData.append('file', {
      uri: file.uri,
      name: file.name || 'import.csv',
      type: file.mimeType || 'text/csv',
    });
  }

  return api.upload('/imports/upload', formData);
};
