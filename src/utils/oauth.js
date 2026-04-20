export const OAUTH_GOOGLE_CLIENT_ID_CONFIG_KEY = 'OAUTH_GOOGLE_CLIENT_ID';

const normalizeConfigTextValue = value => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return '';
    }

    try {
      const parsedValue = JSON.parse(trimmedValue);
      if (typeof parsedValue === 'string') {
        return parsedValue.trim();
      }
    } catch {}

    return trimmedValue;
  }

  return String(value).trim();
};

const isConfigMap = value =>
  value && typeof value === 'object' && !Array.isArray(value);

export const resolveGoogleOauthClientId = configs => {
  if (!isConfigMap(configs)) {
    return '';
  }

  return normalizeConfigTextValue(
    configs[OAUTH_GOOGLE_CLIENT_ID_CONFIG_KEY],
  );
};

export const resolveCompanyGoogleOauthClientId = company =>
  resolveGoogleOauthClientId(company?.configs);
