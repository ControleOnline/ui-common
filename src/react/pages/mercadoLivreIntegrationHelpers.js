import {Platform} from 'react-native';

const tt = (type, key) => global.t?.t('configs', type, key);

export const normalizeTextValue = value => String(value ?? '').trim();

export const isConnected = value =>
  value === true ||
  value === 1 ||
  value === '1' ||
  String(value).trim().toLowerCase() === 'true';

export const formatApiError = error =>
  error?.message ||
  error?.description ||
  error?.error ||
  tt('marketplace_error', 'mercadoLivreLoad') ||
  'Nao foi possivel carregar a integracao Mercado Livre.';

const MERCADO_LIVRE_OAUTH_QUERY_KEYS = [
  'code',
  'state',
  'error',
  'error_description',
  'mercadolivre_connected',
  'mercadolivre_error',
  'mercadolivre_message',
];

export const resolveFrontOAuthRedirectUri = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return undefined;
  }

  const url = new URL(window.location.href);
  MERCADO_LIVRE_OAUTH_QUERY_KEYS.forEach(key => url.searchParams.delete(key));
  url.hash = '';

  return url.toString();
};

export const replaceFrontOAuthStatus = statusParams => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  MERCADO_LIVRE_OAUTH_QUERY_KEYS.forEach(key => url.searchParams.delete(key));
  Object.entries(statusParams || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  window.history.replaceState({}, document.title, url.toString());
};

export const formatOAuthStatusError = (error, message) => {
  const messageText = normalizeTextValue(message);
  if (messageText) {
    return `${
      tt('marketplace_error', 'mercadoLivreConnectWithMessage') ||
      'Nao foi possivel conectar o Mercado Livre:'
    } ${messageText}`;
  }

  const errorText = normalizeTextValue(error);
  if (!errorText) {
    return (
      tt('marketplace_error', 'mercadoLivreConnect') ||
      'Nao foi possivel conectar o Mercado Livre.'
    );
  }

  return `${
    tt('marketplace_error', 'mercadoLivreConnect') ||
    'Nao foi possivel conectar o Mercado Livre.'
  } (${errorText}).`;
};

