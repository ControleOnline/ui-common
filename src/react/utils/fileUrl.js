import {env as APP_ENV} from '@env';
import {filterApiHeaders} from '../../utils/trustedApiUrl';
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

/**
 * Environment / platform hosts (staging, dev, localhost) are not tenant domains.
 * Injecting them into /{host}/files/{id}/download produces URLs like
 * https://s.controleonline.com/staging.controleonline.com/files/... → 403.
 * Keep app-domain header only; do not path-inject environment hosts.
 * app-community#432
 */
const resolveApiEntrypointHost = () => {
  const entry = normalizeText(APP_ENV?.API_ENTRYPOINT);
  if (!entry) {
    return '';
  }

  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(entry)
      ? entry
      : `https://${entry}`;
    return new URL(withProtocol).host.toLowerCase();
  } catch (error) {
    return entry
      .replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//, '')
      .replace(/\/.*$/, '')
      .toLowerCase();
  }
};

/**
 * API host must never be used as /{host}/files/{id}/download segment.
 * Backend File.domain often stores the API host (api.controleonline.com);
 * using it produces broken URLs like:
 *   https://api.controleonline.com/api.controleonline.com/files/8408/download
 * Tenant white-labels need:
 *   https://api.controleonline.com/erp.jaguncos.com.br/files/8408/download
 * app-community#1160
 */
const isApiEntrypointHost = host => {
  const normalized = normalizeText(host).toLowerCase();
  if (!normalized) {
    return false;
  }

  const apiHost = resolveApiEntrypointHost();
  if (apiHost && normalized === apiHost) {
    return true;
  }

  if (
    normalized === 'api.controleonline.com' ||
    normalized === 'api.controleonline.com.br'
  ) {
    return true;
  }

  // Generic api.* hosts are infrastructure, not tenant app-domains.
  if (/^api\./i.test(normalized)) {
    return true;
  }

  return false;
};

const isEnvironmentLikeHost = host => {
  const normalized = normalizeText(host).toLowerCase();
  if (!normalized) return false;
  if (
    normalized === 'localhost' ||
    normalized.startsWith('localhost:') ||
    normalized === '127.0.0.1' ||
    normalized.startsWith('127.0.0.1:')
  ) {
    return true;
  }
  // staging.*, dev.*, *.staging.*, etc.
  if (
    /^(staging|dev|local|test|qa)([.-]|$)/i.test(normalized) ||
    /\.(staging|dev|local|test)\./i.test(normalized) ||
    normalized.endsWith('.local')
  ) {
    return true;
  }
  // Explicit known platform hosts used as ENV DOMAIN, not company domains
  if (
    normalized === 'staging.controleonline.com' ||
    normalized === 'dev.controleonline.com' ||
    normalized === 'manager.controleonline.com' ||
    normalized === 'pos.controleonline.com'
  ) {
    return true;
  }
  return false;
};

/**
 * Prefer File.domain only when it is a real tenant host.
 * Ignore API entrypoint and environment/platform hosts (app-community#1160).
 */
const pickDownloadHost = (fileDomain, fallbackHost) => {
  const candidate = normalizeText(fileDomain);
  if (
    candidate &&
    !isApiEntrypointHost(candidate) &&
    !isEnvironmentLikeHost(candidate)
  ) {
    return candidate;
  }

  const fallback = normalizeText(fallbackHost);
  if (fallback && !isApiEntrypointHost(fallback)) {
    return fallback;
  }

  // Last resort: runtime host (web multi-tenant) or configured DOMAIN.
  return resolveAppDomain(APP_ENV?.DOMAIN) || fallback;
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

  // Do not path-inject environment/platform hosts (app-community#432).
  // Bare /files/{id}/download remains for staging/manager/dev; tenant hosts
  // (erp.jaguncos.com.br, loja..., etc.) still get /{appDomain}/files/... .
  // Never path-inject the API entrypoint host (app-community#1160).
  if (isEnvironmentLikeHost(normalizedHost) || isApiEntrypointHost(normalizedHost)) {
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

const resolveFileSource = (
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

    // Prefer FileService domain only when it is a tenant host, never the API host.
    // file.domain often comes as api.controleonline.com (app-community#1160).
    const downloadHost = pickDownloadHost(normalizedFile?.domain, host);

    const uri = isBackendDownload
      ? buildTenantDownloadUrl(uriBase, downloadHost)
      : uriBase;

    return {
      uri,
      headers:
        isBackendDownload && downloadHost
          ? {...sourceHeaders, ...headers, 'app-domain': downloadHost}
          : {...sourceHeaders, ...headers},
    };
  }

  return null;
};

export const resolveDefaultFileSource = (file, options = {}) => {
  const source = resolveFileSource(file, options);
  return source ? {...source, headers: filterApiHeaders(source.uri, source.headers, APP_ENV?.API_ENTRYPOINT)} : null;
};

export const resolveDefaultFileUrl = (file, options = {}) =>
  resolveDefaultFileSource(file, options)?.uri || '';

// Centraliza a resolucao de imagem/arquivo do backend em uma unica regra.
export const resolveFileImageUrl = (file, options = {}) =>
  resolveDefaultFileUrl(file, options);

export const resolveFileDownloadUrl = resolveFileImageUrl;
