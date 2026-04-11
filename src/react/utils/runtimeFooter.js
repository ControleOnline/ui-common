const safeTrim = value => String(value || '').trim();

const parseJsonStringValue = value => {
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

const parseDeviceMetadata = metadata => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === 'string') {
    const parsed = parseJsonStringValue(metadata);
    return parsed && typeof parsed === 'object' ? parsed : {};
  }

  return typeof metadata === 'object' ? metadata : {};
};

export const DEVICE_RUNTIME_FOOTER_TEXT_CONFIG_KEY = 'device-runtime-footer-text';

export const normalizeRuntimeFooterText = value => {
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

export const getRuntimeFooterText = company =>
  normalizeRuntimeFooterText(
    company?.configs?.[DEVICE_RUNTIME_FOOTER_TEXT_CONFIG_KEY],
  );

export const getRuntimeFooterDeviceName = device => {
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

export const formatRuntimeFooterVersion = version => {
  const normalizedVersion = safeTrim(version).replace(/^v/i, '');
  return normalizedVersion ? `v${normalizedVersion}` : '';
};

export const getRuntimeFooterPrimaryText = ({device, appVersion}) => {
  const deviceName = getRuntimeFooterDeviceName(device);
  const versionLabel = formatRuntimeFooterVersion(
    appVersion || device?.appVersion,
  );

  return [deviceName, versionLabel].filter(Boolean).join(' / ');
};
