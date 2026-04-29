const normalizeText = value => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const normalizeCoordinate = value => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const resolveCoordinates = value => {
  const latitude = normalizeCoordinate(value?.latitude);
  const longitude = normalizeCoordinate(value?.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {latitude, longitude};
};

export const buildNavigationMapQuery = parts =>
  (Array.isArray(parts) ? parts : [parts])
    .map(normalizeText)
    .filter(Boolean)
    .join(', ');

export const buildGoogleMapsNavigationUrl = ({
  coordinates,
  mapQuery,
  origin,
}) => {
  const destinationCoordinates = resolveCoordinates(coordinates);
  const normalizedMapQuery = normalizeText(mapQuery);

  if (destinationCoordinates) {
    const originCoordinates = resolveCoordinates(origin);
    const originParam = originCoordinates
      ? `&origin=${encodeURIComponent(
          `${originCoordinates.latitude},${originCoordinates.longitude}`,
        )}`
      : '';

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${destinationCoordinates.latitude},${destinationCoordinates.longitude}`,
    )}${originParam}&travelmode=driving`;
  }

  if (!normalizedMapQuery) {
    return '';
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    normalizedMapQuery,
  )}`;
};

export const buildWazeNavigationUrl = ({coordinates, mapQuery}) => {
  const destinationCoordinates = resolveCoordinates(coordinates);
  const normalizedMapQuery = normalizeText(mapQuery);

  if (destinationCoordinates) {
    return `https://waze.com/ul?ll=${destinationCoordinates.latitude},${destinationCoordinates.longitude}&navigate=yes`;
  }

  if (!normalizedMapQuery) {
    return '';
  }

  return `https://waze.com/ul?q=${encodeURIComponent(
    normalizedMapQuery,
  )}&navigate=yes`;
};
