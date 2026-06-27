import { getDeviceTypeLabel } from '@controleonline/ui-common/src/react/utils/printerDevices';

const DEVICE_RUNTIME_FOOTER_TEXT_CONFIG_KEY = 'device-runtime-footer-text';

const safeTrim = value => String(value || '').trim();

const POS_OPERATION_MODE_LABELS = {
  counter: 'Balcão',
  waiter: 'Garçom',
  totem: 'Totem',
  'single-item': 'Venda única',
  cashier: 'PDV',
};

const normalizeOperationModeKey = value =>
  safeTrim(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]/g, '-');

const parseJsonStringValue = value => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const parseObjectValue = value => {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    const parsed = parseJsonStringValue(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  }

  return typeof value === 'object' ? value : {};
};

const parseDeviceMetadata = metadata => parseObjectValue(metadata);
const parseDeviceConfigs = configs => parseObjectValue(configs);

const normalizeRuntimeFooterText = value => {
  if (value === null || value === undefined) {
    return '';
  }

  const parsedValue =
    typeof value === 'string' ? parseJsonStringValue(value) : value;

  if (parsedValue && typeof parsedValue === 'object') {
    return '';
  }

  const normalized = safeTrim(parsedValue);

  return normalized.replace(/\s+/g, ' ');
};

const getRuntimeFooterText = company =>
  normalizeRuntimeFooterText(
    company?.configs?.[DEVICE_RUNTIME_FOOTER_TEXT_CONFIG_KEY],
  );

const isWebRuntimeDevice = device => {
  const metadata = parseDeviceMetadata(device?.metadata);
  const runtime = safeTrim(metadata?.runtime).toLowerCase();
  const systemName = safeTrim(
    device?.systemName || metadata?.system?.name,
  ).toLowerCase();
  const hardwareType = safeTrim(
    device?.deviceType || metadata?.system?.hardwareType,
  ).toLowerCase();
  const identifier = safeTrim(device?.device || device?.id).toLowerCase();

  return (
    runtime === 'web' ||
    systemName === 'web' ||
    hardwareType === 'web' ||
    identifier.startsWith('web-')
  );
};

const getRuntimeFooterDeviceName = device => {
  if (isWebRuntimeDevice(device)) {
    return 'web';
  }

  const metadata = parseDeviceMetadata(device?.metadata);

  return (
    safeTrim(device?.alias) ||
    safeTrim(device?.name) ||
    safeTrim(metadata?.system?.name) ||
    safeTrim(metadata?.system?.model) ||
    safeTrim(device?.appName) ||
    safeTrim(device?.deviceType) ||
    safeTrim(device?.id)
  );
};

const formatRuntimeFooterVersion = version => {
  const normalizedVersion = safeTrim(version).replace(/^v/i, '');
  return normalizedVersion ? `v${normalizedVersion}` : '';
};

const getRuntimeFooterWebHost = () => {
  const hostname = safeTrim(globalThis?.location?.hostname);

  if (!hostname) {
    return '';
  }

  if (['localhost', '::1', '[::1]'].includes(hostname)) {
    return '127.0.0.1';
  }

  return hostname;
};

const getRuntimeFooterWebIdentifierCandidates = ({device, deviceConfig}) => {
  const deviceMetadata = parseDeviceMetadata(device?.metadata);
  const storedDeviceMetadata = parseDeviceMetadata(deviceConfig?.device?.metadata);
  const candidates = [
    {
      value: safeTrim(storedDeviceMetadata?.network?.publicIp),
      source: 'device_config.device.metadata.network.publicIp',
    },
    {
      value: safeTrim(deviceMetadata?.network?.publicIp),
      source: 'device.metadata.network.publicIp',
    },
    {
      value: safeTrim(device?.externalIp),
      source: 'device.externalIp',
    },
    {
      value: getRuntimeFooterWebHost(),
      source: 'location.hostname',
    },
  ];
  const seenValues = new Set();

  return candidates.filter(candidate => {
    if (!candidate.value || seenValues.has(candidate.value)) {
      return false;
    }

    seenValues.add(candidate.value);
    return true;
  });
};

const getRuntimeFooterStoredVersion = deviceConfig => {
  const configs = parseDeviceConfigs(deviceConfig?.configs);
  return formatRuntimeFooterVersion(configs?.['config-version']);
};

const getRuntimeFooterOperationalTypeInfo = ({device, deviceConfig} = {}) => {
  const runtimeType = safeTrim(device?.type);

  if (runtimeType) {
    return {
      source: 'device.type',
      value: runtimeType.toUpperCase(),
    };
  }

  const storedType = safeTrim(deviceConfig?.device?.type);

  if (storedType) {
    return {
      source: 'device_config.device.type',
      value: storedType.toUpperCase(),
    };
  }

  return {
    source: '',
    value: '',
  };
};

const getRuntimeFooterOperationalTypeLabel = ({device, deviceConfig} = {}) => {
  const operationalTypeInfo = getRuntimeFooterOperationalTypeInfo({
    device,
    deviceConfig,
  });

  return operationalTypeInfo.value
    ? getDeviceTypeLabel(operationalTypeInfo.value)
    : '';
};

const getRuntimeFooterOperationModeLabel = ({deviceConfig} = {}) => {
  const configs = parseDeviceConfigs(deviceConfig?.configs);
  const normalizedMode = normalizeOperationModeKey(
    configs?.['pos-operation-mode'],
  );

  return POS_OPERATION_MODE_LABELS[normalizedMode] || '';
};

const getRuntimeFooterOperationalSummary = ({device, deviceConfig} = {}) => {
  const operationalTypeLabel = getRuntimeFooterOperationalTypeLabel({
    device,
    deviceConfig,
  });

  if (!operationalTypeLabel) {
    return '';
  }

  if (operationalTypeLabel !== 'PDV') {
    return operationalTypeLabel;
  }

  const operationModeLabel = getRuntimeFooterOperationModeLabel({
    deviceConfig,
  });

  if (
    !operationModeLabel ||
    operationModeLabel.toUpperCase() === operationalTypeLabel.toUpperCase()
  ) {
    return operationalTypeLabel;
  }

  return `${operationalTypeLabel} • ${operationModeLabel}`;
};

const getRuntimeFooterVersionCandidates = ({device, appVersion, deviceConfig}) => {
  const deviceMetadata = parseDeviceMetadata(device?.metadata);
  const storedDeviceMetadata = parseDeviceMetadata(deviceConfig?.device?.metadata);
  const configs = parseDeviceConfigs(deviceConfig?.configs);
  const candidates = [
    {
      label: formatRuntimeFooterVersion(storedDeviceMetadata?.app?.version),
      rawValue: safeTrim(storedDeviceMetadata?.app?.version),
      source: 'device_config.device.metadata.app.version',
    },
    {
      label: formatRuntimeFooterVersion(deviceMetadata?.app?.version),
      rawValue: safeTrim(deviceMetadata?.app?.version),
      source: 'device.metadata.app.version',
    },
    {
      label: formatRuntimeFooterVersion(device?.appVersion),
      rawValue: safeTrim(device?.appVersion),
      source: 'device.appVersion',
    },
    {
      label: formatRuntimeFooterVersion(appVersion),
      rawValue: safeTrim(appVersion),
      source: 'appVersion',
    },
    {
      label: formatRuntimeFooterVersion(configs?.['config-version']),
      rawValue: safeTrim(configs?.['config-version']),
      source: 'device_config.configs.config-version',
    },
  ];
  const seenLabels = new Set();

  return candidates.filter(candidate => {
    if (!candidate.label || seenLabels.has(candidate.label)) {
      return false;
    }

    seenLabels.add(candidate.label);
    return true;
  });
};

const getRuntimeFooterNativeIdentifierCandidates = ({device, deviceConfig}) => {
  const candidates = [
    {
      value: safeTrim(deviceConfig?.device?.device),
      source: 'device_config.device.device',
    },
    {
      value: safeTrim(device?.id),
      source: 'device.id',
    },
    {
      value: safeTrim(deviceConfig?.device?.id),
      source: 'device_config.device.id',
    },
  ];
  const seenValues = new Set();

  return candidates.filter(candidate => {
    if (!candidate.value || seenValues.has(candidate.value)) {
      return false;
    }

    seenValues.add(candidate.value);
    return true;
  });
};

const getRuntimeFooterDebugInfo = ({device, appVersion, deviceConfig}) => {
  const deviceName = getRuntimeFooterDeviceName(device);
  const versionCandidates = getRuntimeFooterVersionCandidates({
    device,
    appVersion,
    deviceConfig,
  });
  const versionLabel = versionCandidates[0]?.label || '';
  const isWebRuntime = isWebRuntimeDevice(device);
  const operationalTypeInfo = getRuntimeFooterOperationalTypeInfo({
    device,
    deviceConfig,
  });
  const operationalTypeLabel = operationalTypeInfo.value
    ? getDeviceTypeLabel(operationalTypeInfo.value)
    : '';
  const operationModeLabel =
    operationalTypeLabel === 'PDV'
      ? getRuntimeFooterOperationModeLabel({deviceConfig})
      : '';
  const operationalSummary = getRuntimeFooterOperationalSummary({
    device,
    deviceConfig,
  });
  const webIdentifierCandidates = isWebRuntime
    ? getRuntimeFooterWebIdentifierCandidates({
      device,
      deviceConfig,
    })
    : [];
  const webIdentifier = webIdentifierCandidates[0]?.value || '';
  const nativeIdentifierCandidates = getRuntimeFooterNativeIdentifierCandidates({
    device,
    deviceConfig,
  });
  const nativeIdentifier = nativeIdentifierCandidates[0]?.value || '';
  const runtimeDetail = operationalSummary
    ? operationalTypeLabel === 'PDV' &&
      operationModeLabel &&
      operationModeLabel.toUpperCase() !== operationalTypeLabel.toUpperCase()
      ? operationModeLabel
      : operationalTypeLabel
    : isWebRuntime
      ? webIdentifier
      : nativeIdentifier;
  const runtimeDetailSource = operationalSummary
    ? operationalTypeLabel === 'PDV' &&
      operationModeLabel &&
      operationModeLabel.toUpperCase() !== operationalTypeLabel.toUpperCase()
      ? 'device_config.configs.pos-operation-mode'
      : operationalTypeInfo.source
    : isWebRuntime
      ? webIdentifierCandidates[0]?.source || ''
      : nativeIdentifierCandidates[0]?.source || '';
  const displayName = operationalSummary || deviceName;
  const primaryText = [displayName, versionLabel]
    .filter(Boolean)
    .join(' / ');

  return {
    deviceName,
    displayName,
    operationalSummary,
    operationalTypeLabel,
    operationModeLabel,
    versionLabel,
    runtimeDetail,
    runtimeDetailSource,
    primaryText,
    isWebRuntime,
    versionCandidates,
    webIdentifierCandidates,
    nativeIdentifierCandidates,
    rawValues: {
      appVersionProp: safeTrim(appVersion),
      deviceId: safeTrim(device?.id),
      deviceType: safeTrim(device?.type),
      deviceExternalIp: safeTrim(device?.externalIp),
      deviceAppVersion: safeTrim(device?.appVersion),
      deviceMetadataAppVersion: safeTrim(
        parseDeviceMetadata(device?.metadata)?.app?.version,
      ),
      deviceMetadataPublicIp: safeTrim(
        parseDeviceMetadata(device?.metadata)?.network?.publicIp,
      ),
      storedDeviceRecordId: safeTrim(deviceConfig?.device?.id),
      storedDeviceType: safeTrim(deviceConfig?.device?.type),
      storedDeviceIdentifier: safeTrim(deviceConfig?.device?.device),
      storedDeviceMetadataAppVersion: safeTrim(
        parseDeviceMetadata(deviceConfig?.device?.metadata)?.app?.version,
      ),
      storedDeviceMetadataPublicIp: safeTrim(
        parseDeviceMetadata(deviceConfig?.device?.metadata)?.network?.publicIp,
      ),
      storedConfigVersion: safeTrim(
        parseDeviceConfigs(deviceConfig?.configs)?.['config-version'],
      ),
      operationMode: normalizeOperationModeKey(
        parseDeviceConfigs(deviceConfig?.configs)?.['pos-operation-mode'],
      ),
      operationModeLabel,
      operationalType: safeTrim(operationalTypeInfo.value),
      webHost: getRuntimeFooterWebHost(),
    },
  };
};

const getRuntimeFooterPrimaryText = params =>
  getRuntimeFooterDebugInfo(params).primaryText;

module.exports = {
  DEVICE_RUNTIME_FOOTER_TEXT_CONFIG_KEY,
  formatRuntimeFooterVersion,
  getRuntimeFooterDebugInfo,
  getRuntimeFooterDeviceName,
  getRuntimeFooterNativeIdentifierCandidates,
  getRuntimeFooterPrimaryText,
  getRuntimeFooterStoredVersion,
  getRuntimeFooterVersionCandidates,
  getRuntimeFooterWebIdentifierCandidates,
  getRuntimeFooterText,
  getRuntimeFooterWebHost,
  normalizeRuntimeFooterText,
};
