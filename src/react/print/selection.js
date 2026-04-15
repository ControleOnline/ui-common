import {parseConfigsObject} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  PDV_DEVICE_TYPE,
  findPrinterOptionByValue,
  getPrinterOptions,
  getPrinterOptionValue,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  filterDeviceConfigsByCompany,
  normalizeDeviceId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {
  PRINT_CONTEXT_DEVICE,
  PRINT_CONTEXT_DISPLAY,
} from '@controleonline/ui-common/src/react/print/jobs';

export const DISPLAY_DEVICE_LINK_CONFIG_KEY = 'display-id';
export const DISPLAY_DEVICE_PRINTER_CONFIG_KEY = 'printer';

const normalizeEntityId = value =>
  String(value || '')
    .replace(/\D+/g, '')
    .trim();

const getDeviceConfigType = deviceConfig =>
  String(deviceConfig?.type || deviceConfig?.device?.type || '')
    .trim()
    .toUpperCase();

const normalizePrinterRuntimeType = value =>
  String(value || '')
    .trim()
    .toUpperCase();

export const resolveDisplayDeviceConfig = ({
  deviceConfigs = [],
  companyId = null,
  currentDeviceId = '',
  displayId = '',
}) => {
  const normalizedDisplayId = normalizeEntityId(displayId);
  if (!normalizedDisplayId) {
    return null;
  }

  const matchingConfigs = filterDeviceConfigsByCompany(deviceConfigs, companyId)
    .filter(deviceConfig => {
      if (getDeviceConfigType(deviceConfig) !== 'DISPLAY') {
        return false;
      }

      const configs = parseConfigsObject(deviceConfig?.configs);
      return (
        normalizeEntityId(configs?.[DISPLAY_DEVICE_LINK_CONFIG_KEY]) ===
        normalizedDisplayId
      );
    });

  if (matchingConfigs.length === 0) {
    return null;
  }

  return (
    matchingConfigs.find(
      deviceConfig =>
        normalizeDeviceId(deviceConfig?.device?.device) ===
        normalizeDeviceId(currentDeviceId),
    ) || matchingConfigs[0]
  );
};

export const resolvePrintDeviceConfig = ({
  contextType = PRINT_CONTEXT_DEVICE,
  companyDeviceConfigs = [],
  currentCompanyId = null,
  currentDeviceId = '',
  displayId = '',
  runtimeDeviceConfig = null,
}) => {
  if (contextType === PRINT_CONTEXT_DISPLAY) {
    return resolveDisplayDeviceConfig({
      deviceConfigs: companyDeviceConfigs,
      companyId: currentCompanyId,
      currentDeviceId,
      displayId,
    });
  }

  if (runtimeDeviceConfig?.configs) {
    return runtimeDeviceConfig;
  }

  return (
    (Array.isArray(companyDeviceConfigs) ? companyDeviceConfigs : []).find(
      deviceConfig =>
        normalizeDeviceId(deviceConfig?.device?.device) ===
        normalizeDeviceId(currentDeviceId),
    ) || null
  );
};

export const resolveConfiguredPrinterValue = deviceConfig =>
  normalizeDeviceId(
    parseConfigsObject(deviceConfig?.configs)?.[DISPLAY_DEVICE_PRINTER_CONFIG_KEY],
  );

export const resolveValidatedPrinterValue = ({
  printerValue = '',
  printerOptions = [],
  currentDeviceId = '',
  runtimeDeviceType = '',
}) => {
  const normalizedPrinterValue = normalizeDeviceId(printerValue);
  if (!normalizedPrinterValue) {
    return '';
  }

  const matchedPrinter = findPrinterOptionByValue(
    printerOptions,
    normalizedPrinterValue,
  );
  if (matchedPrinter) {
    return normalizeDeviceId(
      getPrinterOptionValue(matchedPrinter) || matchedPrinter?.device,
    );
  }

  if (
    normalizePrinterRuntimeType(runtimeDeviceType) === PDV_DEVICE_TYPE &&
    normalizedPrinterValue === normalizeDeviceId(currentDeviceId)
  ) {
    return normalizedPrinterValue;
  }

  return '';
};

export const resolveAutoPrinterValue = ({
  printerOptions = [],
  currentDeviceId = '',
  runtimeDeviceType = '',
}) => {
  const options = Array.isArray(printerOptions) ? printerOptions : [];

  if (options.length === 1) {
    return normalizeDeviceId(
      getPrinterOptionValue(options[0]) || options[0]?.device,
    );
  }

  if (normalizePrinterRuntimeType(runtimeDeviceType) !== PDV_DEVICE_TYPE) {
    return '';
  }

  const currentDevicePrinter = options.find(
    option => normalizeDeviceId(option?.device) === normalizeDeviceId(currentDeviceId),
  );

  return normalizeDeviceId(
    getPrinterOptionValue(currentDevicePrinter) || currentDevicePrinter?.device,
  );
};

export const resolvePrintSelectionValue = ({
  transientPrinterValue = '',
  configuredPrinterValue = '',
  printerOptions = [],
  currentDeviceId = '',
  runtimeDeviceType = '',
}) =>
  resolveValidatedPrinterValue({
    printerValue: transientPrinterValue,
    printerOptions,
    currentDeviceId,
    runtimeDeviceType,
  }) ||
  resolveValidatedPrinterValue({
    printerValue: configuredPrinterValue,
    printerOptions,
    currentDeviceId,
    runtimeDeviceType,
  }) ||
  resolveAutoPrinterValue({
    printerOptions,
    currentDeviceId,
    runtimeDeviceType,
  });

export const resolvePrinterOptions = ({
  printers = [],
  companyDeviceConfigs = [],
  currentCompanyId = null,
}) =>
  getPrinterOptions({
    printers,
    deviceConfigs: companyDeviceConfigs,
    companyId: currentCompanyId,
  });

export const resolveSelectedPrinter = ({
  printerOptions = [],
  selectedPrinterValue = '',
  currentDevice = null,
  runtimeDeviceType = '',
}) => {
  const matchedPrinter = findPrinterOptionByValue(
    printerOptions,
    selectedPrinterValue,
  );

  if (matchedPrinter) {
    return matchedPrinter;
  }

  const currentDeviceId = normalizeDeviceId(currentDevice?.id || currentDevice?.device);
  if (!currentDeviceId) {
    return null;
  }

  if (normalizeDeviceId(selectedPrinterValue) !== currentDeviceId) {
    return null;
  }

  return {
    device: currentDeviceId,
    type: String(runtimeDeviceType || currentDevice?.type || '')
      .trim()
      .toUpperCase(),
    alias: currentDevice?.alias || currentDeviceId,
    selectionValue: currentDeviceId,
  };
};

export const resolvePrinterSelectionValue = printer =>
  normalizeDeviceId(getPrinterOptionValue(printer) || printer?.device);
