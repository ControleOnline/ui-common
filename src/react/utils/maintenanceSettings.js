export const MAINTENANCE_ROUTINES_CONFIG_KEY = 'maintenance-routines';

const translateRoutineLabel = key => global.t?.t('configs', 'label', key);

const translateRoutineMessage = key => global.t?.t('configs', 'message', key);

const createMaintenanceRoutineItem = ({
  key,
  titleKey,
  descriptionKey,
  defaultEnabled = true,
  defaultCronExpression = '* * * * *',
}) => ({
  key,
  get title() {
    return translateRoutineLabel(titleKey);
  },
  get description() {
    return translateRoutineMessage(descriptionKey);
  },
  defaultEnabled,
  defaultCronExpression,
});

export const MAINTENANCE_ROUTINE_ITEMS = [
  createMaintenanceRoutineItem({
    key: 'cleanup_logs',
    titleKey: 'cleanup_logs',
    descriptionKey: 'cleanup_logs_description',
  }),
  createMaintenanceRoutineItem({
    key: 'open_overdue_opportunities',
    titleKey: 'open_overdue_opportunities',
    descriptionKey: 'open_overdue_opportunities_description',
  }),
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
