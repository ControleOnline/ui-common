const parseJsonValue = (value, fallback) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
};

const normalizeTextConfig = (value, fallback = '') => {
  const parsed = parseJsonValue(value, fallback);

  if (parsed === null || parsed === undefined) {
    return fallback;
  }

  return String(parsed).trim();
};

export const GOOGLE_MAPS_WEB_API_KEY_CONFIG_KEY = 'web-google-maps-api-key';
export const GOOGLE_MAPS_ANDROID_API_KEY_CONFIG_KEY =
  'android-google-maps-api-key';

export const resolveGoogleMapsSettings = configs => {
  const configMap =
    configs && typeof configs === 'object' && !Array.isArray(configs)
      ? configs
      : {};

  const webGoogleMapsApiKey = normalizeTextConfig(
    configMap[GOOGLE_MAPS_WEB_API_KEY_CONFIG_KEY],
  );

  const androidGoogleMapsApiKey = normalizeTextConfig(
    configMap[GOOGLE_MAPS_ANDROID_API_KEY_CONFIG_KEY],
  );

  return {
    webGoogleMapsApiKey,
    androidGoogleMapsApiKey,
  };
};
