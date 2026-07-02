const translateLabel = (translate, descriptor) => {
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

export const resolveBottomNavigationItems = (items = [], translate) =>
  (Array.isArray(items) ? items : []).map(item => ({
    ...item,
    label: translateLabel(translate, item?.label),
  }));

export const resolveBottomNavigationRoute = (routeAliases = {}, routeName) =>
  routeAliases?.[routeName] || routeName || '';

export const BOTTOM_NAVIGATION_PRESETS = {
  crmToolbar: {
    items: [
      {
        route: 'HomePage',
        icon: 'home',
        label: {
          store: 'users',
          type: 'label',
          key: 'home',
          fallback: 'Home',
        },
      },
      {
        route: 'CrmIndex',
        icon: 'target',
        label: {
          store: 'users',
          type: 'label',
          key: 'crm',
          fallback: 'CRM',
        },
      },
      {
        route: 'ClientsIndex',
        icon: 'users',
        label: {
          store: 'users',
          type: 'label',
          key: 'clients',
          fallback: 'Clients',
        },
      },
      {
        route: 'ProfilePage',
        icon: 'user',
        label: {
          store: 'users',
          type: 'label',
          key: 'profile',
          fallback: 'Profile',
        },
      },
    ],
    routeAliases: {
      HomePage: 'HomePage',
      CrmIndex: 'CrmIndex',
      ContractsIndex: 'CrmIndex',
      ProposalsIndex: 'CrmIndex',
      ComissionsPage: 'CrmIndex',
      CrmConversation: 'CrmIndex',
      ContractDetails: 'CrmIndex',
      ClientsIndex: 'ClientsIndex',
      ClientDetails: 'ClientsIndex',
      FranchiseesIndex: 'ClientsIndex',
      ProfilePage: 'ProfilePage',
      SettingsPage: 'ProfilePage',
    },
  },
  managerToolbar: {
    items: [
      {
        route: 'HomePage',
        icon: 'home',
        label: {
          store: 'configs',
          type: 'toolbar',
          key: 'home',
          fallback: 'Home',
        },
      },
      {
        route: 'CrmIndex',
        icon: 'dollar-sign',
        label: {
          store: 'configs',
          type: 'toolbar',
          key: 'opportunities',
          fallback: 'Oportunidades',
        },
      },
      {
        route: 'ClientsIndex',
        icon: 'users',
        label: {
          store: 'configs',
          type: 'toolbar',
          key: 'customers',
          fallback: 'Clientes',
        },
      },
      {
        route: 'ProfilePage',
        icon: 'user',
        label: {
          store: 'configs',
          type: 'toolbar',
          key: 'profile',
          fallback: 'Profile',
        },
      },
    ],
    routeAliases: {
      HomePage: 'HomePage',
      CrmIndex: 'CrmIndex',
      ContractsIndex: 'CrmIndex',
      ProposalsIndex: 'CrmIndex',
      ComissionsPage: 'CrmIndex',
      CrmConversation: 'CrmIndex',
      ContractDetails: 'CrmIndex',
      ClientsIndex: 'ClientsIndex',
      ClientDetails: 'ClientsIndex',
      FranchiseesIndex: 'ClientsIndex',
      ProfilePage: 'ProfilePage',
      SettingsPage: 'ProfilePage',
      OrderHistoryPage: 'CrmIndex',
      InventoriesPage: 'CrmIndex',
      ProductsPage: 'CrmIndex',
    },
  },
  managerDock: {
    items: [
      {route: 'HomePage', icon: 'home', label: 'Home'},
      {route: 'CrmIndex', icon: 'dollar-sign', label: 'Oportunidades'},
      {route: 'ClientsIndex', icon: 'users', label: 'Clientes'},
      {route: 'ProfilePage', icon: 'user', label: 'Perfil'},
    ],
    routeAliases: {
      ClientDetails: 'ClientsIndex',
      EmployeesIndex: 'ClientsIndex',
      FranchiseesIndex: 'ClientsIndex',
    },
  },
  deliveryDock: {
    items: [
      {route: 'HomePage', icon: 'home', label: 'Home'},
      {route: 'DeliveryOrdersPage', icon: 'shopping-bag', label: 'Pedidos'},
      {
        route: 'DeliveryReceivablesPage',
        icon: 'dollar-sign',
        label: 'Recebiveis',
      },
      {route: 'DeliveryCompaniesPage', icon: 'users', label: 'Empresas'},
      {route: 'DeliveryRateTablesPage', icon: 'list', label: 'Tabelas'},
    ],
    routeAliases: {
      OrderDetails: 'DeliveryOrdersPage',
      OrderLogisticsPage: 'DeliveryOrdersPage',
      DeliveryVehicleSetupPage: 'DeliveryRateTablesPage',
      DeliveryRateTableFormPage: 'DeliveryRateTablesPage',
      DeliveryRateTableCompaniesPage: 'DeliveryRateTablesPage',
      DeliveryCourierSchedulesPage: 'DeliveryCompaniesPage',
      DeliveryCourierScheduleFormPage: 'DeliveryCompaniesPage',
      DeliveryCourierPresencePage: 'DeliveryCompaniesPage',
      DeliveryCourierPresenceHistoryPage: 'DeliveryCompaniesPage',
    },
  },
  ppcDock: {
    items: [
      {route: 'HomePage', icon: 'home', label: 'Home'},
      {route: 'DisplayList', icon: 'monitor', label: 'Displays'},
      {route: 'ProfilePage', icon: 'user', label: 'Profile'},
    ],
    routeAliases: {},
  },
  posToolbar: {
    items: [
      {
        route: 'HomePage',
        icon: 'home',
        label: {
          store: 'orders',
          type: 'label',
          key: 'home',
          fallback: 'Home',
        },
      },
      {
        route: 'OrderHistoryPage',
        icon: 'shopping-bag',
        label: {
          store: 'orders',
          type: 'label',
          key: 'orders',
          fallback: 'Orders',
        },
      },
      {
        route: 'CashRegisterIndex',
        icon: 'credit-card',
        label: {
          store: 'orders',
          type: 'title',
          key: 'cashRegister',
          fallback: 'Cash register',
        },
      },
      {
        route: 'ProfilePage',
        icon: 'user',
        label: {
          store: 'orders',
          type: 'label',
          key: 'profile',
          fallback: 'Profile',
        },
      },
    ],
    routeAliases: {},
  },
};

export const getBottomNavigationPreset = variant =>
  BOTTOM_NAVIGATION_PRESETS[variant] || BOTTOM_NAVIGATION_PRESETS.managerDock;
