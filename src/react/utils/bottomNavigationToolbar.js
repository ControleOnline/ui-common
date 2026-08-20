/**
 * Toolbar bottom-nav helpers: role-aware menus + safe fallback.
 * Preset is never a permission bypass — only Home/Profile on empty/failed API.
 * CommonJS so unit tests can run with node --test like runtimeLanguage.
 */

/** Routes allowed in the controlled fallback (never business routes). */
const SAFE_TOOLBAR_FALLBACK_ROUTES = Object.freeze([
  'HomePage',
  'ProfilePage',
]);

const SAFE_ROUTE_SET = new Set(SAFE_TOOLBAR_FALLBACK_ROUTES);

const normalizeMenuType = (value, fallback = 'home') => {
  const normalized = String(value == null ? '' : value)
    .trim()
    .toLowerCase();
  return normalized || fallback;
};

const filterMenusByType = (menus, menuType) => {
  const normalizedMenuType =
    menuType === null || menuType === undefined || String(menuType).trim() === ''
      ? null
      : normalizeMenuType(menuType, '');

  const modules = Array.isArray(menus)
    ? menus.map(module => ({
        ...module,
        menus: Array.isArray(module?.menus)
          ? module.menus.map(menu => ({...menu}))
          : [],
      }))
    : [];

  if (!normalizedMenuType) {
    return modules;
  }

  return modules
    .map(module => ({
      ...module,
      menus: module.menus.filter(
        menu => normalizeMenuType(menu?.menuType, '') === normalizedMenuType,
      ),
    }))
    .filter(module => module.menus.length > 0);
};

const resolvePresetLabel = (translate, descriptor) => {
  if (!descriptor || typeof descriptor === 'string') {
    return descriptor || '';
  }

  const translated = translate?.(
    descriptor.store,
    descriptor.type,
    descriptor.key,
  );

  return translated || descriptor.fallback || descriptor.key || '';
};

/**
 * Build a minimal safe toolbar module list from a navigation preset.
 * Only HomePage + ProfilePage are kept so fallback cannot expose unauthorized
 * business routes (Clientes, Oportunidades, etc.).
 */
const buildSafeToolbarFallbackMenus = (
  preset,
  menuType = 'toolbar',
  translate,
  presetKey = 'safe-toolbar-fallback',
) => {
  const items = Array.isArray(preset?.items) ? preset.items : [];
  const safeItems = items.filter(item => SAFE_ROUTE_SET.has(item?.route));

  if (safeItems.length === 0) {
    return [];
  }

  const menus = safeItems.map((item, index) => ({
    ...item,
    menuType,
    sortOrder: Number(item?.sortOrder || (index + 1) * 10),
    label: resolvePresetLabel(translate, item?.label),
  }));

  return [
    {
      id: presetKey || 'safe-toolbar-fallback',
      label: preset?.label || '',
      icon: preset?.icon || '',
      menus,
    },
  ];
};

/**
 * Prefer API toolbar menus when present; otherwise safe preset fallback.
 * Does not use the full business preset as a permission bypass.
 */
const resolveToolbarRuntimeMenus = ({
  apiMenus,
  preset,
  presetKey,
  menuType = 'toolbar',
  translate,
} = {}) => {
  const filtered = filterMenusByType(apiMenus || [], menuType);
  const hasAuthorizedItems = filtered.some(
    module => Array.isArray(module?.menus) && module.menus.length > 0,
  );

  if (hasAuthorizedItems) {
    return filtered;
  }

  if (preset) {
    return buildSafeToolbarFallbackMenus(
      preset,
      menuType,
      translate,
      presetKey || 'safe-toolbar-fallback',
    );
  }

  return [];
};

/**
 * Flatten toolbar menus into bottom-nav item shape (route/icon/label/...).
 */
const mapRuntimeMenusToNavItems = (runtimeMenus, menuType) =>
  filterMenusByType(runtimeMenus || [], menuType)
    .flatMap(module => (Array.isArray(module?.menus) ? module.menus : []))
    .map(item => ({
      route: item.route,
      icon: item.icon || 'circle',
      label: item.label,
      menuKey: item.menuKey,
      routeParams: item.routeParams,
      menuType: item.menuType || menuType,
      sortOrder: Number(item?.sortOrder || 0),
    }))
    .filter(item => Boolean(item.route))
    .sort((left, right) => {
      const orderDiff = left.sortOrder - right.sortOrder;
      if (orderDiff !== 0) return orderDiff;
      return String(left.label || left.menuKey || '').localeCompare(
        String(right.label || right.menuKey || ''),
      );
    });

module.exports = {
  SAFE_TOOLBAR_FALLBACK_ROUTES,
  buildSafeToolbarFallbackMenus,
  mapRuntimeMenusToNavItems,
  resolveToolbarRuntimeMenus,
};
