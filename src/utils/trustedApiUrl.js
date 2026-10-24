const isTrustedApiUrl = (uri, apiEntryPoint) => {
  try {
    const base = new URL(String(apiEntryPoint || ''));
    const target = new URL(String(uri || ''), `${base.href.replace(/\/$/, '')}/`);
    const prefix = base.pathname.replace(/\/$/, '');
    return ['http:', 'https:'].includes(base.protocol)
      && target.origin === base.origin && !target.username && !target.password
      && (!prefix || target.pathname === prefix || target.pathname.startsWith(`${prefix}/`));
  } catch { return false; }
};

// ERP credentials belong only to the configured API, never an image/CDN origin.
const filterApiHeaders = (uri, headers = {}, apiEntryPoint) => {
  if (isTrustedApiUrl(uri, apiEntryPoint)) return {...headers};
  return Object.fromEntries(Object.entries(headers).filter(([key]) =>
    !/^(api[-_]?(token|key)|authorization|proxy-authorization|cookie|app-domain|device)$/i.test(key)));
};

// Normalize only file downloads on the configured API authority; trust checks still
// validate the final origin/path before attaching session headers.
const resolveApiFileProtocol = (uri, apiEntryPoint) => {
  const image = String(uri || '');
  const imageOrigin = image.match(/^https?:\/\/([^/]+)/i);
  const apiOrigin = String(apiEntryPoint || '').match(/^https?:\/\/([^/]+)/i);
  if (!imageOrigin || !apiOrigin || imageOrigin[1] !== apiOrigin[1]
      || !/\/files\/[^/?#]+\/download(?:[?#]|$)/i.test(image)) return image;
  return apiOrigin[0] + image.slice(imageOrigin[0].length);
};
module.exports = {isTrustedApiUrl, filterApiHeaders, resolveApiFileProtocol};
