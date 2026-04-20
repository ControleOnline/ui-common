export const CIELO_CONFIG_KEY = 'CIELO';
export const NEW_RELIC_CONFIG_KEY = 'NEW_RELIC';
export const SPOTIFY_CONFIG_KEY = 'SPOTIFY';

export const DEFAULT_CIELO_CONFIG = {
  ACCESS_TOKEN: '',
  CLIENT_ID: '',
  EMAIL: '',
};

export const DEFAULT_NEW_RELIC_CONFIG = {
  LICENSE_KEY: '',
  APPLICATION_ID: '',
  ACCOUNT_ID: '',
  TRUST_KEY: '',
  BEACON: 'bam.nr-data.net',
  ERROR_BEACON: 'bam.nr-data.net',
};

export const DEFAULT_SPOTIFY_CONFIG = {
  CLIENT_ID: '',
  CLIENT_SECRET: '',
};

const isConfigMap = value =>
  value && typeof value === 'object' && !Array.isArray(value);

const parseJsonValue = (value, fallback) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return value;
};

const normalizeTextValue = value => String(value || '').trim();

export const resolveIntegrationConfig = (configs, configKey, defaults) => {
  if (!isConfigMap(defaults)) {
    return {};
  }

  const rawConfig = isConfigMap(configs)
    ? parseJsonValue(configs[configKey], {})
    : {};
  const source = isConfigMap(rawConfig) ? rawConfig : {};

  return Object.keys(defaults).reduce((accumulator, fieldKey) => {
    accumulator[fieldKey] = normalizeTextValue(
      source[fieldKey] !== undefined ? source[fieldKey] : defaults[fieldKey],
    );
    return accumulator;
  }, {});
};

export const resolveCieloConfig = configs =>
  resolveIntegrationConfig(configs, CIELO_CONFIG_KEY, DEFAULT_CIELO_CONFIG);

export const resolveNewRelicConfig = configs =>
  resolveIntegrationConfig(
    configs,
    NEW_RELIC_CONFIG_KEY,
    DEFAULT_NEW_RELIC_CONFIG,
  );

export const resolveSpotifyConfig = configs =>
  resolveIntegrationConfig(
    configs,
    SPOTIFY_CONFIG_KEY,
    DEFAULT_SPOTIFY_CONFIG,
  );
