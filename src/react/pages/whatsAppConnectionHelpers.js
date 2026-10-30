export const CHANNEL_WHATSAPP = 'whatsapp';
export const CHANNEL_WHATSAPP_OFFICIAL = 'whatsapp_official';

/** @deprecated use CHANNEL_* */
export const PROVIDER_UNOFFICIAL = CHANNEL_WHATSAPP;
/** @deprecated use CHANNEL_* */
export const PROVIDER_OFFICIAL = CHANNEL_WHATSAPP_OFFICIAL;

export const extractDigits = value => String(value || '').replace(/\D/g, '');

export const formatPhoneLabel = phone => {
  const ddd = String(phone?.ddd || '').trim();
  const digits = extractDigits(phone?.phone || '');
  if (!ddd && !digits) return 'Nao informado';
  if (!digits) return `(${ddd})`;
  if (digits.length <= 4) return ddd ? `(${ddd}) ${digits}` : digits;
  const lastFour = digits.slice(-4);
  const firstPart = digits.slice(0, -4);
  return ddd ? `(${ddd}) ${firstPart}-${lastFour}` : `${firstPart}-${lastFour}`;
};

export const normalizeConnection = item => {
  const channel =
    item?.channel === CHANNEL_WHATSAPP_OFFICIAL
      ? CHANNEL_WHATSAPP_OFFICIAL
      : CHANNEL_WHATSAPP;
  return {
    id: item?.id || item?.['@id'] || `connection-${Math.random()}`,
    name: item?.name || 'Sem nome',
    status: item?.status?.status || item?.status || 'Pendente',
    type: item?.type || 'Nenhum',
    channel,
    /** alias used by list UI */
    provider: channel === CHANNEL_WHATSAPP_OFFICIAL ? CHANNEL_WHATSAPP_OFFICIAL : CHANNEL_WHATSAPP,
    phone: item?.phone || {},
    phoneLabel: formatPhoneLabel(item?.phone),
    channelConfig: item?.channelConfig || item?.channel_config || null,
  };
};

export const toArray = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

export const formatApiError = error => {
  if (!error) return 'Nao foi possivel concluir a operacao.';
  if (typeof error === 'string') return error;
  return (
    error?.message ||
    error?.description ||
    error?.errmsg ||
    'Nao foi possivel concluir a operacao.'
  );
};

export const buildOfficialChannelConfig = ({
  accessToken,
  phoneNumberId,
  apiVersion,
}) => {
  const config = {
    access_token: String(accessToken || '').trim(),
    phone_number_id: String(phoneNumberId || '').trim(),
  };
  const version = String(apiVersion || '').trim();
  if (version) config.api_version = version;
  return config;
};

export const maskToken = token => {
  const value = String(token || '');
  if (value.length <= 8) return value ? '••••••••' : '';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
};
