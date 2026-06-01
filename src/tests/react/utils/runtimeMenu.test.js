/* global describe, expect, it */

import {
  getRuntimeMenuRoutes,
  normalizeRuntimeMenuIcon,
  normalizeRuntimeMenuResponse,
  userHasRole,
} from '../../../react/utils/runtimeMenu';

describe('runtimeMenu', () => {
  it('normalizes legacy menu response modules into sorted arrays', () => {
    const result = normalizeRuntimeMenuResponse({
      response: {
        data: {
          modules: {
            2: {
              id: 2,
              label: 'Config',
              menus: [
                {id: 20, label: 'B', route: 'BRoute', sortOrder: 20},
                {id: 10, label: 'A', route: 'ARoute', sortOrder: 10},
              ],
            },
          },
        },
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0].menus.map(item => item.route)).toEqual(['ARoute', 'BRoute']);
    expect(result[0].menus[0].routeParams).toEqual({});
  });

  it('builds route sets and checks super admin role', () => {
    const menus = normalizeRuntimeMenuResponse({
      modules: {
        1: {
          menus: [
            {route: 'HomePage'},
            {route: 'MenuAccessConfigPage'},
          ],
        },
      },
    });

    expect(getRuntimeMenuRoutes(menus).has('MenuAccessConfigPage')).toBe(true);
    expect(userHasRole({roles: ['ROLE_SUPER']}, 'ROLE_SUPER')).toBe(true);
    expect(userHasRole({roles: ['ROLE_MANAGER']}, 'ROLE_SUPER')).toBe(false);
  });

  it('normalizes snake_case menu_key into menuKey for runtime usage', () => {
    const menus = normalizeRuntimeMenuResponse({
      modules: {
        1: {
          menus: [
            {menu_key: 'menu_access', route: 'MenuAccessConfigPage'},
          ],
        },
      },
    });

    expect(menus[0].menus[0].menuKey).toBe('menu_access');
  });

  it('converts legacy material icon names into feather-compatible names', () => {
    expect(normalizeRuntimeMenuIcon('shopping_cart')).toBe('shopping-cart');
    expect(normalizeRuntimeMenuIcon('account_balance')).toBe('dollar-sign');

    const menus = normalizeRuntimeMenuResponse({
      modules: {
        1: {
          icon: 'account_balance',
          menus: [
            {
              icon: 'shopping_cart',
              route: 'OrderHistoryPage',
            },
          ],
        },
      },
    });

    expect(menus[0].icon).toBe('dollar-sign');
    expect(menus[0].menus[0].icon).toBe('shopping-cart');
  });

  it('falls back to the manager core menu when the runtime menu is empty', () => {
    const menus = normalizeRuntimeMenuResponse({}, {appType: 'MANAGER'});

    expect(menus).toHaveLength(4);
    expect(menus.map(module => module.label)).toEqual([
      'Financeiro',
      'Operacoes',
      'Comercial',
      'Configuracoes',
    ]);
    expect(menus[0].menus[0]).toMatchObject({
      label: 'Financeiro',
      menuKey: 'financial_hub',
      route: 'FinancialHubPage',
    });
    expect(menus[1].menus[0]).toMatchObject({
      label: 'Pedidos',
      menuKey: 'orders',
      route: 'OrderHistoryPage',
    });
    expect(menus[2].menus[0]).toMatchObject({
      label: 'Cadastro de clientes',
      menuKey: 'clients',
      route: 'ClientsIndex',
    });
    expect(menus[2].menus[1]).toMatchObject({
      label: 'Cadastro de franquias',
      menuKey: 'franchisees',
      route: 'FranchiseesIndex',
    });
    expect(menus[3].menus.map(item => item.route)).toEqual([
      'DevicesIndex',
      'ConfiguratorPage',
    ]);
  });

  it('does not invent a fallback menu for non-manager apps', () => {
    expect(
      normalizeRuntimeMenuResponse({}, {appType: 'SHOP'}),
    ).toEqual([]);
  });
});
