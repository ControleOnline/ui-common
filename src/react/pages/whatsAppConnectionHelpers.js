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

const resolveStatusIri = status => {
  if (!status) return null;
  if (typeof status === 'string') {
    if (status.startsWith('/') || status.startsWith('http')) return status;
    return null;
  }
  if (typeof status === 'object') {
    const iri = status['@id'] || status.id;
    if (iri == null) return null;
    const asString = String(iri);
    if (asString.startsWith('/') || asString.startsWith('http')) return asString;
    return `/statuses/${asString}`;
  }
  return null;
};

const resolveNumericId = item => {
  const raw = item?.id ?? item?.['@id'];
  if (raw == null) return null;
  const digits = String(raw).replace(/\D/g, '');
  return digits ? Number(digits) : null;
};

export const normalizeConnection = item => {
  const channel =
    item?.channel === CHANNEL_WHATSAPP_OFFICIAL
      ? CHANNEL_WHATSAPP_OFFICIAL
      : CHANNEL_WHATSAPP;
  return {
    id: item?.id || item?.['@id'] || `connection-${Math.random()}`,
    numericId: resolveNumericId(item),
    name: item?.name || 'Sem nome',
    status:
      (typeof item?.status === 'object'
        ? item?.status?.status || item?.status?.name
        : item?.status) || 'Pendente',
    statusIri: resolveStatusIri(item?.status),
    type: item?.type || 'Nenhum',
    channel,
    provider: channel,
    phone: item?.phone || {},
    phoneLabel: formatPhoneLabel(item?.phone),
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
  const violations = error?.violations || error?.data?.violations;
  if (Array.isArray(violations) && violations.length) {
    return violations
      .map(v => v?.message || v?.propertyPath)
      .filter(Boolean)
      .join(' · ');
  }
  return (
    error?.message ||
    error?.description ||
    error?.errmsg ||
    error?.hydra?.description ||
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
