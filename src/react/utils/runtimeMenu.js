export const normalizeAppType = value => {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized || 'MANAGER';
};

export const normalizeRuntimeMenuResponse = result => {
  const modules =
    result?.response?.data?.modules ||
    result?.data?.modules ||
    result?.modules ||
    {};

  return Object.values(modules)
    .map(module => ({
      ...module,
      menus: (Array.isArray(module?.menus) ? module.menus : [])
        .map(menu => ({
          ...menu,
          routeParams: menu?.routeParams && typeof menu.routeParams === 'object'
            ? menu.routeParams
            : {},
          sortOrder: Number(menu?.sortOrder || 0),
        }))
        .sort((left, right) => {
          const orderDiff = Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0);
          if (orderDiff !== 0) return orderDiff;
          return String(left?.label || '').localeCompare(String(right?.label || ''));
        }),
    }))
    .filter(module => module.menus.length > 0);
};

export const getRuntimeMenuRoutes = menus =>
  new Set(
    (Array.isArray(menus) ? menus : [])
      .flatMap(module => (Array.isArray(module?.menus) ? module.menus : []))
      .map(menu => menu?.route)
      .filter(Boolean),
  );

export const userHasRole = (user, role) =>
  Array.isArray(user?.roles) && user.roles.includes(role);
