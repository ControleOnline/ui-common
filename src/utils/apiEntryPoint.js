import {Platform} from 'react-native';

const ANDROID_EMULATOR_HOST = '10.0.2.2';
const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const normalizeText = value => String(value || '').trim();

const replaceLocalhostHost = value => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return '';
  }

  try {
    const parsed = new URL(normalizedValue);
    if (
      Platform.OS === 'android' &&
      LOCALHOST_HOSTS.has(String(parsed.hostname || '').trim().toLowerCase())
    ) {
      parsed.hostname = ANDROID_EMULATOR_HOST;
      return parsed.toString();
    }

    return normalizedValue;
  } catch {
    return normalizedValue;
  }
};

export const resolveApiEntryPoint = value =>
  replaceLocalhostHost(value).replace(/\/$/, '');
