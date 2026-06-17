import {Platform} from 'react-native';
import {env} from '@env';
import {File, Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {api} from '@controleonline/ui-common/src/api';
import {resolveAppDomain} from '@controleonline/ui-common/src/utils/appDomain';

const normalizeId = value => String(value || '').replace(/\D+/g, '').trim();

const slugifyFileName = value => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'catalogo';
};

const extractFilenameFromDisposition = value => {
  const utf8Match = String(value || '').match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]).trim();
  }

  const fallbackMatch = String(value || '').match(/filename="?([^";]+)"?/i);
  return fallbackMatch?.[1]?.trim() || null;
};

const extractDownloadErrorMessage = async response => {
  const fallback = 'Nao foi possivel baixar o CSV normalizado.';

  try {
    const payload = await response.text();
    if (!payload) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(payload);
      return parsed?.error || parsed?.description || parsed?.message || fallback;
    } catch (error) {
      return payload;
    }
  } catch (error) {
    return fallback;
  }
};

export const buildNormalizedCatalogFileName = companyName =>
  `catalogo-normalizado-${slugifyFileName(companyName)}.csv`;

export const buildNormalizedCatalogDownloadUrl = ({
  apiEntrypoint,
  companyId,
  context,
}) => {
  const searchParams = new URLSearchParams();
  searchParams.set('company', String(companyId));
  searchParams.set('context', String(context || 'products').trim() || 'products');

  return `${apiEntrypoint}/products/catalog/download-normalized?${searchParams.toString()}`;
};

export const downloadNormalizedCatalog = async ({
  companyId,
  companyName,
  context,
} = {}) => {
  const normalizedCompanyId = normalizeId(companyId);
  if (!normalizedCompanyId) {
    throw new Error('Empresa nao selecionada.');
  }

  const apiEntrypoint = String(env.API_ENTRYPOINT || '').replace(/\/$/, '');
  if (!apiEntrypoint) {
    throw new Error('API_ENTRYPOINT nao configurado.');
  }

  const baseFileName = buildNormalizedCatalogFileName(
    companyName || normalizedCompanyId,
  );

  const headers = {
    Accept: 'text/csv',
    'App-Domain': resolveAppDomain(env.DOMAIN),
  };

  const token = await api.getToken();
  if (token) {
    headers['API-TOKEN'] = token;
  }

  const response = await fetch(
    buildNormalizedCatalogDownloadUrl({
      apiEntrypoint,
      companyId: normalizedCompanyId,
      context,
    }),
    {
      method: 'GET',
      headers,
    },
  );

  if (!response.ok) {
    throw new Error(await extractDownloadErrorMessage(response));
  }

  const fileName =
    extractFilenameFromDisposition(response.headers.get('content-disposition')) ||
    baseFileName;
  const blob = await response.blob();

  if (Platform.OS === 'web') {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

    return {
      fileName,
      shared: false,
      savedUri: null,
    };
  }

  const file = new File(Paths.cache, fileName);
  file.create({intermediates: true, overwrite: true});
  file.write(new Uint8Array(await blob.arrayBuffer()));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Compartilhar catalogo normalizado',
    });

    return {
      fileName,
      shared: true,
      savedUri: file.uri,
    };
  }

  return {
    fileName,
    shared: false,
    savedUri: file.uri,
  };
};
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores e evitar chamadas HTTP diretas quando o store ja resolver isso.
