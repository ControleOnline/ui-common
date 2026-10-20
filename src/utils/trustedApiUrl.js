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

module.exports = {isTrustedApiUrl, filterApiHeaders};
