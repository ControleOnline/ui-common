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

const unwrapConfigScalar = value => {
  if (value === null || value === undefined) {
    return value;
  }

  let current = value;
  for (let i = 0; i < 3; i += 1) {
    if (typeof current === 'string') {
      const trimmed = current.trim();
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        const parsed = parseJsonStringValue(trimmed);
        if (parsed !== trimmed) {
          current = parsed;
          continue;
        }
      }
      return current;
    }

    if (current && typeof current === 'object' && !Array.isArray(current)) {
      if (current.configValue !== undefined) {
        current = current.configValue;
        continue;
      }
      if (current.value !== undefined) {
        current = current.value;
        continue;
      }
      if (current.config_value !== undefined) {
        current = current.config_value;
        continue;
      }
    }

    break;
  }

  return current;
};

const normalizeRuntimeFooterText = value => {
  if (value === null || value === undefined) {
    return '';
  }

  const scalar = unwrapConfigScalar(value);
  if (scalar === null || scalar === undefined) {
    return '';
  }
  if (typeof scalar === 'object') {
    return '';
  }

  return safeTrim(String(scalar).replace(/\r\n?/g, '\n'))
    .split('\n')
    .map(line => safeTrim(line).replace(/\s+/g, ' '))
    .filter(Boolean)
    .join('\n');
};

const resolveConfigValue = configs => {
  if (configs == null) {
    return undefined;
  }

  if (Array.isArray(configs)) {
    const hit = configs.find(
      e =>
        safeTrim(e?.configKey || e?.key || e?.name || e?.config_key) ===
        DEVICE_RUNTIME_FOOTER_TEXT_CONFIG_KEY,
    );
    return hit?.value ?? hit?.configValue ?? hit?.config_value;
  }

  const parsed = parseObjectValue(configs);
  return parsed?.[DEVICE_RUNTIME_FOOTER_TEXT_CONFIG_KEY];
};

const getRuntimeFooterText = (company, extraConfigs) => {
  for (const configs of [company?.configs, extraConfigs]) {
    const normalized = normalizeRuntimeFooterText(resolveConfigValue(configs));
    if (normalized) {
      return normalized;
    }
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
