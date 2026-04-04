const toRawString = value => String(value || '').trim();

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

export const resolveAppDomain = configuredDomain => {
  const configuredHost = tryParseHost(configuredDomain);
  if (configuredHost) return configuredHost;
  return tryParseHost(resolveRuntimeHost());
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
