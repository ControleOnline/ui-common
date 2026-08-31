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

const normalizeRuntimeFooterText = value => {
  if (value === null || value === undefined) {
    return '';
  }
  const parsedValue =
    typeof value === 'string' ? parseJsonStringValue(value) : value;
  if (parsedValue && typeof parsedValue === 'object') {
    return '';
  }
  return safeTrim(String(parsedValue).replace(/\r\n?/g, '\n'))
    .split('\n')
    .map(line => safeTrim(line).replace(/\s+/g, ' '))
    .filter(Boolean)
    .join('\n');
};

const resolveConfigValue = configs => {
  if (configs == null) return undefined;
  if (Array.isArray(configs)) {
    const hit = configs.find(
      e =>
        safeTrim(e?.configKey || e?.key || e?.name || e?.config_key) ===
        DEVICE_RUNTIME_FOOTER_TEXT_CONFIG_KEY,
    );
    return hit?.value ?? hit?.configValue ?? hit?.config_value;
  }
  return parseObjectValue(configs)?.[DEVICE_RUNTIME_FOOTER_TEXT_CONFIG_KEY];
};

const getRuntimeFooterText = (company, extraConfigs) => {
  for (const configs of [company?.configs, extraConfigs]) {
    const normalized = normalizeRuntimeFooterText(resolveConfigValue(configs));
    if (normalized) return normalized;
  }
  return '';
};

const getRuntimeFooterTextLines = value => {
  const normalizedText =
    typeof value === 'string'
      ? normalizeRuntimeFooterText(value)
      : getRuntimeFooterText(value);
  return normalizedText ? normalizedText.split('\n').filter(Boolean) : [];
};

const getRuntimeFooterRotationEntries = ({companyFooterText, primaryText}) =>
  [...getRuntimeFooterTextLines(companyFooterText), safeTrim(primaryText)].filter(
    Boolean,
  );

module.exports = {
  DEVICE_RUNTIME_FOOTER_TEXT_CONFIG_KEY,
  getRuntimeFooterRotationEntries,
  getRuntimeFooterText,
  getRuntimeFooterTextLines,
  normalizeRuntimeFooterText,
  parseObjectValue,
  parseJsonStringValue,
  safeTrim,
};
