export const LOG_ERROR_EMAIL_ENABLED_KEY = 'log-error-email-enabled';
export const LOG_ERROR_EMAIL_RECIPIENTS_KEY = 'log-error-email-recipients';
export const LOG_POLICY_CONFIG_KEY = 'log-policy';

export const LOG_POLICY_ITEMS = [
  {
    key: 'backend_error',
    title: 'Erros do backend',
    description:
      'Registra excecoes e falhas HTTP do backend. E o grupo principal para erros 500.',
  },
  {
    key: 'entity',
    title: 'Historico de entidades',
    description:
      'Mantem os diffs de criacao, alteracao e remocao das entidades do sistema.',
  },
  {
    key: 'generic',
    title: 'Logs genericos',
    description:
      'Agrupa logs tecnicos de integracao, workers e eventos que nao sao timeline de entidade.',
  },
  {
    key: 'operation_patterns',
    title: 'Padroes operacionais',
    description:
      'Mantem registros tecnicos ligados a padroes e diagnosticos operacionais do sistema.',
  },
  {
    key: 'frontend_debug',
    title: 'Debug do front-end',
    description:
      'Recebe logs enviados pelo React para apoio de debug e investigacao remota.',
  },
];

export const DEFAULT_LOG_POLICY = LOG_POLICY_ITEMS.reduce((accumulator, item) => {
  accumulator[item.key] = {
    enabled: true,
    retentionDays: null,
  };

  return accumulator;
}, {});

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

const normalizeBoolean = value => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return ['1', 'true', 'yes', 'on'].includes(
    String(value || '').trim().toLowerCase(),
  );
};

const normalizeRetentionDays = value => {
  const normalizedValue = String(value || '').replace(/\D+/g, '').trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

export const normalizeLogAlertRecipients = value => {
  const parsedValue = parseJsonValue(value, value);
  const source = Array.isArray(parsedValue)
    ? parsedValue
    : String(parsedValue || '').split(/[\n,;]+/);

  return Array.from(
    new Set(
      source
        .map(item => String(item || '').trim().toLowerCase())
        .filter(Boolean)
        .filter(item => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)),
    ),
  );
};

export const findInvalidLogAlertRecipients = value => {
  const parsedValue = parseJsonValue(value, value);
  const source = Array.isArray(parsedValue)
    ? parsedValue
    : String(parsedValue || '').split(/[\n,;]+/);

  return Array.from(
    new Set(
      source
        .map(item => String(item || '').trim().toLowerCase())
        .filter(Boolean)
        .filter(item => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)),
    ),
  );
};

export const normalizeLogPolicy = value => {
  const parsedValue = parseJsonValue(value, {});
  const safeValue =
    parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
      ? parsedValue
      : {};

  return LOG_POLICY_ITEMS.reduce((accumulator, item) => {
    const config = safeValue[item.key] || {};

    accumulator[item.key] = {
      enabled:
        config.enabled === undefined
          ? DEFAULT_LOG_POLICY[item.key].enabled
          : normalizeBoolean(config.enabled),
      retentionDays: normalizeRetentionDays(config.retentionDays),
    };

    return accumulator;
  }, {});
};

export const formatRecipientsForInput = value =>
  normalizeLogAlertRecipients(value).join('\n');
