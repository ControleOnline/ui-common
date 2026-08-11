const INVALID_DOMAIN_VALUES = new Set(['undefined', 'null', 'false']);

const toRawString = value => {
  const raw = String(value || '').trim();
  return INVALID_DOMAIN_VALUES.has(raw.toLowerCase()) ? '' : raw;
};

const tryParseHost = value => {
  const raw = toRawString(value);
  if (!raw) return '';

  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw)
      ? raw
      : `https://${raw}`;
    const parsed = new URL(withProtocol);
    return parsed.host || '';
  } catch (error) {
    return raw
      .replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//, '')
      .replace(/\/.*$/, '')
      .trim();
  }
};

export const resolveRuntimeHost = () => {
  if (typeof location === 'undefined') return '';
  return toRawString(location?.host || '');
};

/**
 * App-Domain header value.
 * Browser (web multi-tenant): always prefer window.location.host so custom
 * domains (e.g. erpjaguncos.com.br) resolve the correct tenant.
 * Native / no location: fall back to configured DOMAIN from env.
 */
export const resolveAppDomain = configuredDomain => {
  const runtimeHost = tryParseHost(resolveRuntimeHost());
  if (runtimeHost) return runtimeHost;
  return tryParseHost(configuredDomain);
};

export const resolveCompanyDomain = (company, fallbackDomain = '') => {
  const candidates = [
    company?.domain,
    company?.host,
    company?.hostname,
    company?.website,
    company?.site,
    company?.url,
    company?.extraData?.domain,
    company?.extraData?.hostname,
  ];

  for (const value of candidates) {
    const normalized = tryParseHost(value);
    if (normalized) return normalized;
  }

  return tryParseHost(fallbackDomain);
};
