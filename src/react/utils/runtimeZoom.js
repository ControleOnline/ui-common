export const DEFAULT_RUNTIME_ZOOM_PERCENT = 100;
export const MIN_RUNTIME_ZOOM_PERCENT = 50;
export const MAX_RUNTIME_ZOOM_PERCENT = 150;

export const normalizeRuntimeZoomPercent = value => {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_RUNTIME_ZOOM_PERCENT;
  }

  const numericValue = Number(String(value).replace('%', '').trim());

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_RUNTIME_ZOOM_PERCENT;
  }

  return Math.min(
    MAX_RUNTIME_ZOOM_PERCENT,
    Math.max(MIN_RUNTIME_ZOOM_PERCENT, numericValue),
  );
};

export const resolveRuntimeZoomScale = value =>
  normalizeRuntimeZoomPercent(value) / 100;

export const buildRuntimeZoomStyle = (value, {isWeb = false} = {}) => {
  const scale = resolveRuntimeZoomScale(value);

  if (scale === 1) {
    return null;
  }

  if (isWeb) {
    return {zoom: scale};
  }

  const inverseSize = `${100 / scale}%`;

  return {
    height: inverseSize,
    transform: [{scale}],
    width: inverseSize,
  };
};
