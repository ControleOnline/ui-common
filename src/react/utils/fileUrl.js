import {env as APP_ENV} from '@env';
import {buildAssetUrl} from '@controleonline/../../src/styles/branding';
import {
  resolveAppDomain,
  resolveCompanyDomain,
} from '@controleonline/ui-common/src/utils/appDomain';

const IMAGE_PATH_PATTERN = /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:\?|$)/i;
const FILE_DOWNLOAD_PATTERN = /(?:^|\/)files\/[^/?#]+\/download(?:[?#]|$)/i;

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

const isDownloadLikeUrl = value =>
  FILE_DOWNLOAD_PATTERN.test(normalizeText(value));

const stripDomainQueryParams = url => {
  const normalizedUrl = normalizeText(url);
  if (!normalizedUrl) {
    return '';
  }

  const hashIndex = normalizedUrl.indexOf('#');
  const hash = hashIndex >= 0 ? normalizedUrl.slice(hashIndex) : '';
  const urlWithoutHash =
    hashIndex >= 0 ? normalizedUrl.slice(0, hashIndex) : normalizedUrl;
  const queryIndex = urlWithoutHash.indexOf('?');
  const base =
    queryIndex >= 0 ? urlWithoutHash.slice(0, queryIndex) : urlWithoutHash;
  const query = queryIndex >= 0 ? urlWithoutHash.slice(queryIndex + 1) : '';
  const params = query
    ? query
        .split('&')
        .map(item => item.trim())
        .filter(Boolean)
        .filter(item => {
          const [rawKey] = item.split('=');
          const key = decodeURIComponent(rawKey || '').toLowerCase();
          return key !== 'app-domain' && key !== 'appdomain';
        })
    : [];

  return `${base}${params.length ? `?${params.join('&')}` : ''}${hash}`;
};

const ensureAbsoluteUrl = url => {
  const normalizedUrl = normalizeText(url);
  if (!normalizedUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(normalizedUrl) || /^\/\//.test(normalizedUrl)) {
    return buildAssetUrl(normalizedUrl) || normalizedUrl;
  }

  const apiEntryPoint = normalizeText(APP_ENV?.API_ENTRYPOINT).replace(
    /\/$/,
    '',
  );
  const normalizedPath = normalizedUrl.startsWith('/')
    ? normalizedUrl
    : `/${normalizedUrl}`;

  return apiEntryPoint ? `${apiEntryPoint}${normalizedPath}` : normalizedPath;
};

const resolveDownloadHost = ({company = null, appDomain = ''} = {}) => {
  const fallbackDomain =
    normalizeText(appDomain) || resolveAppDomain(APP_ENV?.DOMAIN);
  return resolveCompanyDomain(company, fallbackDomain);
};

const buildBackendDownloadUrl = (fileId, options = {}) => {
  const normalizedId = String(fileId || '').trim();
  if (!normalizedId) {
    return '';
  }

  const host = resolveDownloadHost(options);
  const relativeUrl = `/files/${normalizedId}/download`;

  return buildTenantDownloadUrl(relativeUrl, host);
};

const buildTenantDownloadUrl = (url, host) => {
  const absoluteUrl = ensureAbsoluteUrl(stripDomainQueryParams(url));
  const normalizedHost = normalizeText(host);
  if (!absoluteUrl || !normalizedHost) {
    return absoluteUrl;
  }

  if (/^https?:\/\//i.test(absoluteUrl)) {
    const match = stripDomainQueryParams(absoluteUrl).match(
      /^(https?:\/\/[^/?#]+)\/(?:[^/]+\/)?files\/([^/?#]+)\/download([^#]*)(#.*)?$/i,
    );

    return match
      ? `${match[1]}/${encodeURIComponent(normalizedHost)}/files/${match[2]}/download${match[3] || ''}${match[4] || ''}`
      : stripDomainQueryParams(absoluteUrl);
  }

  const hashIndex = absoluteUrl.indexOf('#');
  const hash = hashIndex >= 0 ? absoluteUrl.slice(hashIndex) : '';
  const urlWithoutHash = hashIndex >= 0 ? absoluteUrl.slice(0, hashIndex) : absoluteUrl;
  const queryIndex = urlWithoutHash.indexOf('?');
  const path = queryIndex >= 0 ? urlWithoutHash.slice(0, queryIndex) : urlWithoutHash;
  const query = queryIndex >= 0 ? urlWithoutHash.slice(queryIndex) : '';
  const match = path.match(/^\/(?:[^/]+\/)?files\/([^/]+)\/download$/i);

  return match
    ? `/${encodeURIComponent(normalizedHost)}/files/${match[1]}/download${query}${hash}`
    : stripDomainQueryParams(absoluteUrl);
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

export const resolveDefaultFileSource = (
  file,
  {company = null, appDomain = '', headers = {}} = {},
) => {
  const normalizedFile = unwrapFile(file);
  const host = resolveDownloadHost({company, appDomain});

  if (!normalizedFile) {
    return null;
  }

  if (typeof normalizedFile === 'number') {
    const uri = buildBackendDownloadUrl(normalizedFile, {company, appDomain});

    return uri
      ? {
          uri,
          headers: host ? {...headers, 'app-domain': host} : {...headers},
        }
      : null;
  }

  if (typeof normalizedFile === 'string') {
    const normalizedValue = normalizeText(normalizedFile);
    if (!normalizedValue) {
      return null;
    }

    if (isDownloadLikeUrl(normalizedValue)) {
      const uri = buildTenantDownloadUrl(normalizedValue, host);

      return uri
        ? {
            uri,
            headers: host ? {...headers, 'app-domain': host} : {...headers},
          }
        : null;
    }

    const numericId = extractFileId(normalizedValue);
    if (numericId && !IMAGE_PATH_PATTERN.test(normalizedValue)) {
      const uri = buildBackendDownloadUrl(numericId, {company, appDomain});

      return uri
        ? {
            uri,
            headers: host ? {...headers, 'app-domain': host} : {...headers},
          }
        : null;
    }

    const directUrl = resolveDirectFileUrl(normalizedValue);

    return directUrl
      ? {
          uri: directUrl,
          headers: {...headers},
        }
      : null;
  }

  if (typeof normalizedFile === 'object' && !Array.isArray(normalizedFile)) {
    const sourceHeaders =
      normalizedFile?.headers && typeof normalizedFile.headers === 'object'
        ? normalizedFile.headers
        : {};
    const fileId = extractFileId(normalizedFile);
    const directUrl = resolveDirectFileUrl(normalizedFile);
    const isBackendDownload =
      Boolean(fileId) ||
      isDownloadLikeUrl(directUrl) ||
      isDownloadLikeUrl(normalizedFile?.uri) ||
      isDownloadLikeUrl(normalizedFile?.url) ||
      isDownloadLikeUrl(normalizedFile?.path);
    const uriBase =
      directUrl ||
      (fileId ? buildBackendDownloadUrl(fileId, {company, appDomain}) : '');

    if (!uriBase) {
      return null;
    }

    const uri = isBackendDownload
      ? buildTenantDownloadUrl(uriBase, host)
      : uriBase;

    return {
      uri,
      headers:
        isBackendDownload && host
          ? {...sourceHeaders, ...headers, 'app-domain': host}
          : {...sourceHeaders, ...headers},
    };
  }

  return null;
};

export const resolveDefaultFileUrl = (file, options = {}) =>
  resolveDefaultFileSource(file, options)?.uri || '';

// Centraliza a resolucao de imagem/arquivo do backend em uma unica regra.
export const resolveFileImageUrl = (file, options = {}) =>
  resolveDefaultFileUrl(file, options);

export const resolveFileDownloadUrl = resolveFileImageUrl;
