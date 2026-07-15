const LEGACY_ROUTE_ALIASES = {
  displayList: 'DisplayList',
  displayDetails: 'DisplayDetails',
};

export const resolveMenuRouteName = routeName => {
  const normalizedRouteName = String(routeName || '').trim();

  if (!normalizedRouteName) {
    return '';
  }

  return LEGACY_ROUTE_ALIASES[normalizedRouteName] || normalizedRouteName;
};

export const resolveMenuRouteParams = routeParams => {
  if (
    routeParams &&
    typeof routeParams === 'object' &&
    !Array.isArray(routeParams)
  ) {
    return routeParams;
  }

  return {};
};

export default {
  resolveMenuRouteName,
  resolveMenuRouteParams,
};
