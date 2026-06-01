export const normalizeAppType = value => {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized || 'MANAGER';
};

const RUNTIME_MENU_ICON_ALIASES = {
  shopping_cart: 'shopping-cart',
  account_balance: 'dollar-sign',
  account_balance_wallet: 'credit-card',
};

const MANAGER_RUNTIME_MENU_FALLBACK = [
  {
    id: 'manager-financeiro',
    label: 'Financeiro',
    icon: 'dollar-sign',
    menus: [
      {
        id: 'financial_hub',
        menuKey: 'financial_hub',
        label: 'Financeiro',
        route: 'FinancialHubPage',
        icon: 'dollar-sign',
        color: '#0284C7',
        sortOrder: 10,
      },
    ],
  },
  {
    id: 'manager-operacoes',
    label: 'Operacoes',
    icon: 'shopping-bag',
    menus: [
      {
        id: 'orders',
        menuKey: 'orders',
        label: 'Pedidos',
        route: 'OrderHistoryPage',
        icon: 'shopping-bag',
        color: '#0EA5E9',
        sortOrder: 20,
      },
    ],
  },
  {
    id: 'manager-comercial',
    label: 'Comercial',
    icon: 'users',
    menus: [
      {
        id: 'clients',
        menuKey: 'clients',
        label: 'Cadastro de clientes',
        route: 'ClientsIndex',
        icon: 'users',
        color: '#16A34A',
        sortOrder: 30,
      },
      {
        id: 'franchisees',
        menuKey: 'franchisees',
        label: 'Cadastro de franquias',
        route: 'FranchiseesIndex',
        icon: 'map-pin',
        color: '#0EA5E9',
        sortOrder: 35,
      },
    ],
  },
  {
    id: 'manager-configuracoes',
    label: 'Configuracoes',
    icon: 'settings',
    menus: [
      {
        id: 'devices',
        menuKey: 'devices',
        label: 'Dispositivos',
        route: 'DevicesIndex',
        icon: 'credit-card',
        color: '#F59E0B',
        sortOrder: 40,
      },
      {
        id: 'configurator',
        menuKey: 'configurator',
        label: 'Configurador',
        route: 'ConfiguratorPage',
        icon: 'settings',
        color: '#64748B',
        sortOrder: 50,
      },
    ],
  },
];

const cloneRuntimeMenuModules = modules =>
  (Array.isArray(modules) ? modules : []).map(module => ({
    ...module,
    menus: Array.isArray(module?.menus)
      ? module.menus.map(menu => ({
          ...menu,
        }))
      : [],
  }));

export const normalizeRuntimeMenuIcon = value => {
  const normalized = String(value || '').trim();
  if (!normalized) return '';

  return RUNTIME_MENU_ICON_ALIASES[normalized.toLowerCase()] || normalized;
};

export const normalizeRuntimeMenuResponse = (result, {appType} = {}) => {
  const modules =
    result?.response?.data?.modules ||
    result?.data?.modules ||
    result?.modules ||
    {};

  const normalizedModules = Object.values(modules)
    .map(module => ({
      ...module,
      icon: normalizeRuntimeMenuIcon(module?.icon),
      menus: (Array.isArray(module?.menus) ? module.menus : [])
        .map(menu => ({
          ...menu,
          icon: normalizeRuntimeMenuIcon(menu?.icon),
          menuKey: String(menu?.menuKey || menu?.menu_key || '').trim(),
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

  if (normalizedModules.length > 0) {
    return normalizedModules;
  }

  const normalizedAppType = String(appType || '').trim().toUpperCase();

  if (normalizedAppType === 'MANAGER') {
    return cloneRuntimeMenuModules(MANAGER_RUNTIME_MENU_FALLBACK);
  }

  return [];
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
