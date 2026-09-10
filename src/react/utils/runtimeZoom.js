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

export const buildRuntimeZoomStyle = (
  value,
  {isWeb = false, viewport = null} = {},
) => {
  const scale = resolveRuntimeZoomScale(value);

  if (scale === 1) {
    return null;
  }

  if (isWeb) {
    return {zoom: scale};
  }

  const inverseScale = 1 / scale;
  const nativeBase = {
    transform: [{scale}],
    transformOrigin: 'top left',
    alignSelf: 'flex-start',
  };

  const viewportWidth = Number(viewport?.width);
  const viewportHeight = Number(viewport?.height);

  if (
    Number.isFinite(viewportWidth) &&
    Number.isFinite(viewportHeight) &&
    viewportWidth > 0 &&
    viewportHeight > 0
  ) {
    return {
      ...nativeBase,
      width: viewportWidth * inverseScale,
      height: viewportHeight * inverseScale,
    };
  }

  return {
    ...nativeBase,
    width: `${100 * inverseScale}%`,
    height: `${100 * inverseScale}%`,
  };
};
