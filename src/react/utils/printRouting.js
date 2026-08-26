export const COMPANY_DEVICE_CONFIGS_CACHE_TTL_MS = 30 * 1000;

export const PRINT_ROUTE_MISSING_DESTINATION =
  'Não foi possível rotear a impressão: nenhum device de impressão configurado.';

const normalizeDeviceId = value => String(value || '').trim();
const normalizeDeviceType = value => String(value || '').trim().toUpperCase();

export const PDV_RUNTIME_TYPE = 'PDV';
export const DISPLAY_RUNTIME_TYPE = 'DISPLAY';

export const resolvePrinterDeviceId = printer =>
  normalizeDeviceId(printer?.device || printer?.deviceId);

/**
 * Device ids whose open spools this runtime should poll/print.
 * Managed network printers expose `device` (not only `deviceId`).
 */
export const resolveSpoolDeviceIdsForRuntime = ({
  runtimeDeviceId = '',
  runtimeDeviceType = '',
  isWebRuntime = false,
  managedPrinters = [],
  includeLocalDevice = true,
} = {}) => {
  const normalizedRuntimeId = normalizeDeviceId(runtimeDeviceId);
  if (!normalizedRuntimeId || isWebRuntime) {
    return [];
  }

  const managedIds = (Array.isArray(managedPrinters) ? managedPrinters : [])
    .map(resolvePrinterDeviceId)
    .filter(Boolean);

  const type = normalizeDeviceType(runtimeDeviceType);

  if (type === PDV_RUNTIME_TYPE) {
    return Array.from(
      new Set(
        [
          ...(includeLocalDevice ? [normalizedRuntimeId] : []),
          ...managedIds,
        ].filter(Boolean),
      ),
    );
  }

  if (type === DISPLAY_RUNTIME_TYPE) {
    return Array.from(new Set(managedIds));
  }

  return [];
};

export const resolvePrintRoutingError = ({
  targetDeviceId = '',
  selectedPrinter = null,
} = {}) => {
  const resolvedTarget = normalizeDeviceId(
    targetDeviceId || selectedPrinter?.device || selectedPrinter?.deviceId,
  );
  return resolvedTarget ? '' : PRINT_ROUTE_MISSING_DESTINATION;
};
