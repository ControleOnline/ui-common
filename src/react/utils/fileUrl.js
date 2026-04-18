import { env as APP_ENV } from '@env';
import { buildAssetUrl } from '@controleonline/../../src/styles/branding';
import {
  resolveAppDomain,
  resolveCompanyDomain,
} from '@controleonline/ui-common/src/utils/appDomain';

const IMAGE_PATH_PATTERN = /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:\?|$)/i;

const normalizeText = value => String(value || '').trim();

const unwrapFile = file => {
  if (!file || typeof file !== 'object' || Array.isArray(file)) {
    return file;
  }

  if (file.file) {
    return unwrapFile(file.file);
  }

  return file;
};

const resolveDirectFileUrl = file => {
  if (!file) {
    return '';
  }

  if (typeof file === 'string') {
    const normalizedFile = normalizeText(file);
    if (
      /^https?:\/\//i.test(normalizedFile) ||
      /^\/\//.test(normalizedFile) ||
      /\/download(?:\?|$)/i.test(normalizedFile) ||
      IMAGE_PATH_PATTERN.test(normalizedFile)
    ) {
      return buildAssetUrl(normalizedFile) || normalizedFile;
    }

    return '';
  }

  if (typeof file === 'object' && !Array.isArray(file)) {
    return buildAssetUrl(file) || '';
  }

  return '';
};

export const extractFileId = file => {
  const normalizedFile = unwrapFile(file);

  if (!normalizedFile) {
    return null;
  }

  if (typeof normalizedFile === 'number') {
    return normalizedFile;
  }

  if (typeof normalizedFile === 'string') {
    const matches = normalizedFile.match(/\d+/g);
    return matches ? Number(matches[matches.length - 1]) : null;
  }

  if (typeof normalizedFile === 'object') {
    const rawValue =
      normalizedFile?.id ||
      normalizedFile?.['@id'] ||
      normalizedFile?.fileId ||
      normalizedFile?.file_id ||
      '';

    return extractFileId(rawValue);
  }

  return null;
};

// Centraliza a resolucao de imagem/arquivo do backend em uma unica regra.
export const resolveFileImageUrl = (file, {company = null, appDomain = ''} = {}) => {
  const normalizedFile = unwrapFile(file);
  const directUrl = resolveDirectFileUrl(normalizedFile);
  if (directUrl) {
    return directUrl;
  }

  const fileId = extractFileId(normalizedFile);
  if (!fileId) {
    return '';
  }

  const fallbackDomain = normalizeText(appDomain) || resolveAppDomain(APP_ENV?.DOMAIN);
  const host = resolveCompanyDomain(company, fallbackDomain);
  const query = host ? `?app-domain=${encodeURIComponent(host)}` : '';
  const relativeUrl = `/files/${fileId}/download${query}`;
  const apiEntryPoint = normalizeText(APP_ENV?.API_ENTRYPOINT).replace(/\/$/, '');

  return apiEntryPoint ? `${apiEntryPoint}${relativeUrl}` : relativeUrl;
};

export const resolveFileDownloadUrl = resolveFileImageUrl;
