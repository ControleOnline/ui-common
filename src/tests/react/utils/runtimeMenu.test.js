/* global describe, expect, it */

import {
  getRuntimeMenuRoutes,
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
});
