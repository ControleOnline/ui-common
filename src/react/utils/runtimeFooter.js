const DEVICE_RUNTIME_FOOTER_TEXT_CONFIG_KEY = 'device-runtime-footer-text';

const safeTrim = value => String(value || '').trim();

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

const isWebRuntimeDevice = device =>
  device?.deviceType === 'web' ||
  device?.systemName === 'web' ||
  safeTrim(device?.id).startsWith('web-');

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

const getRuntimeFooterStoredVersion = deviceConfig => {
  const configs = parseDeviceConfigs(deviceConfig?.configs);
  return formatRuntimeFooterVersion(configs?.['config-version']);
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
  const webHost = isWebRuntime ? getRuntimeFooterWebHost() : '';
  const nativeIdentifierCandidates = getRuntimeFooterNativeIdentifierCandidates({
    device,
    deviceConfig,
  });
  const nativeIdentifier = nativeIdentifierCandidates[0]?.value || '';
  const runtimeDetail = isWebRuntime
    ? webHost
    : nativeIdentifier;
  const displayName = runtimeDetail
    ? `${deviceName} (${runtimeDetail})`
    : deviceName;
  const primaryText = [displayName, versionLabel]
    .filter(Boolean)
    .join(' / ');

  return {
    deviceName,
    displayName,
    versionLabel,
    runtimeDetail,
    runtimeDetailSource: isWebRuntime
      ? 'location.hostname'
      : nativeIdentifierCandidates[0]?.source || '',
    primaryText,
    isWebRuntime,
    versionCandidates,
    nativeIdentifierCandidates,
    rawValues: {
      appVersionProp: safeTrim(appVersion),
      deviceId: safeTrim(device?.id),
      deviceAppVersion: safeTrim(device?.appVersion),
      deviceMetadataAppVersion: safeTrim(
        parseDeviceMetadata(device?.metadata)?.app?.version,
      ),
      storedDeviceRecordId: safeTrim(deviceConfig?.device?.id),
      storedDeviceIdentifier: safeTrim(deviceConfig?.device?.device),
      storedDeviceMetadataAppVersion: safeTrim(
        parseDeviceMetadata(deviceConfig?.device?.metadata)?.app?.version,
      ),
      storedConfigVersion: safeTrim(
        parseDeviceConfigs(deviceConfig?.configs)?.['config-version'],
      ),
      webHost,
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
  getRuntimeFooterText,
  getRuntimeFooterWebHost,
  normalizeRuntimeFooterText,
};
