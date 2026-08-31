import { Linking, Platform } from 'react-native';

export const ROUTE_PROVIDER_MAP = {
  UberIntegrationPage: 'uber',
  AsaasIntegrationPage: 'asaas',
  ClickSignIntegrationPage: 'clicksign',
  ReceitaFederalIntegrationPage: 'receita-federal',
};

export const routeNameToPath = routeName =>
  String(routeName || '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

export const normalizeTextValue = value => {
  let text = String(value ?? '').trim();
  if (
    (text.startsWith('"') && text.endsWith('"') && text.length >= 2) ||
    (text.startsWith("'") && text.endsWith("'") && text.length >= 2)
  ) {
    text = text.slice(1, -1).trim();
  }
  return text;
};

export const formatApiError = error => {
  if (!error) return 'Nao foi possivel carregar a configuracao da integracao.';
  if (typeof error === 'string') return error;
  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel carregar a configuracao da integracao.';
};

export const getConfigFields = providerConfig => {
  if (!providerConfig) return [];
  if (Array.isArray(providerConfig.tabs) && providerConfig.tabs.length > 0) {
    return providerConfig.tabs.flatMap(tab => tab.fields || []);
  }
  return providerConfig.fields || [];
};

export const mergeTabValues = (fields, source, current = {}) => {
  const sourceMap = Array.isArray(source)
    ? source.reduce((acc, item) => {
        const key = String(item?.configKey || '').trim();
        if (key) acc[key] = item?.configValue;
        return acc;
      }, {})
    : source && typeof source === 'object' ? source : {};

  const next = { ...current };
  (fields || []).forEach(field => {
    next[field.key] = Object.prototype.hasOwnProperty.call(sourceMap, field.key)
      ? normalizeTextValue(sourceMap[field.key])
      : normalizeTextValue(next[field.key]);
  });
  return next;
};

export const buildFieldValues = (providerConfig, source) =>
  mergeTabValues(getConfigFields(providerConfig), source, {});

export const resolveProviderId = ({ route, currentCompany, embedded = false }) => {
  const fromRoute = String(route?.params?.companyId || route?.params?.clientId || '').replace(/\D/g, '');
  if (fromRoute) return fromRoute;
  if (embedded) return '';
  return String(currentCompany?.id || '').replace(/\D/g, '');
};

export const isConnectedValue = value =>
  value === true || value === 1 || value === '1' || String(value).trim().toLowerCase() === 'true';

export const toConfigRequestValue = value => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return normalizeTextValue(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const extractAuthorizationUrl = response => normalizeTextValue(
  response?.member?.[0]?.authorization_url || response?.member?.[0]?.auth_url ||
  response?.member?.[0]?.url || response?.authorization_url || response?.auth_url ||
  response?.url || response?.data?.authorization_url || response?.data?.auth_url || response?.data?.url,
);

export const formatUberOAuthError = error => {
  const normalized = normalizeTextValue(error).toLowerCase();
  if (normalized === 'invalid_scope') {
    return 'O Uber nao liberou o scope pos_provisioning para este app. Esse app precisa estar aprovado/whitelisted no dashboard do Uber.';
  }
  if (normalized === 'access_denied') return 'O login do Uber foi cancelado.';
  return normalizeTextValue(error) || 'Nao foi possivel concluir a conexao com o Uber.';
};

export const openAuthorizationUrl = async authUrl => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.location?.assign === 'function') {
    window.location.assign(authUrl);
    return;
  }
  await Linking.openURL(authUrl);
};

export const isMethodNotAllowed = error => {
  const status = Number(error?.status || error?.code || error?.body?.status || 0);
  const message = String(error?.message || '').toLowerCase();
  return status === 404 || status === 405 || message.includes('method not allowed');
};
