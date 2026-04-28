export const MAINTENANCE_ROUTINES_CONFIG_KEY = 'maintenance-routines';

export const MAINTENANCE_ROUTINE_ITEMS = [
  {
    key: 'cleanup_logs',
    title: 'Limpeza de logs',
    description:
      'Executa a politica de retencao dos logs e remove registros expirados.',
    defaultEnabled: true,
    defaultCronExpression: '* * * * *',
  },
  {
    key: 'open_overdue_opportunities',
    title: 'Oportunidades vencidas para aberto',
    description:
      'Move oportunidades de CRM de pendente para aberto quando a data de retorno ja passou.',
    defaultEnabled: true,
    defaultCronExpression: '* * * * *',
  },
];

export const normalizeMaintenanceRoutines = value => {
  let parsed = value;

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = {};
    }
  }

  const source = parsed && typeof parsed === 'object' ? parsed : {};

  return MAINTENANCE_ROUTINE_ITEMS.reduce((accumulator, item) => {
    const routine =
      source[item.key] && typeof source[item.key] === 'object'
        ? source[item.key]
        : {};

    const cronExpression = String(
      routine.cronExpression || item.defaultCronExpression,
    ).trim();

    accumulator[item.key] = {
      enabled:
        routine.enabled === undefined
          ? item.defaultEnabled
          : Boolean(routine.enabled),
      cronExpression: cronExpression || item.defaultCronExpression,
    };

    return accumulator;
  }, {});
};

export const isLikelyCronExpression = value =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length === 5;
