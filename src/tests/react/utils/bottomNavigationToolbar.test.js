const assert = require('node:assert/strict')
const {test} = require('node:test')

const {
  SAFE_TOOLBAR_FALLBACK_ROUTES,
  buildSafeToolbarFallbackMenus,
  mapRuntimeMenusToNavItems,
  resolveToolbarRuntimeMenus,
} = require('../../../react/utils/bottomNavigationToolbar')

const managerPreset = {
  items: [
    {
      route: 'HomePage',
      icon: 'home',
      label: {store: 'configs', type: 'toolbar', key: 'home', fallback: 'Início'},
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
        fallback: 'Perfil',
      },
    },
  ],
  routeAliases: {
    ClientDetails: 'ClientsIndex',
    ProfilePage: 'ProfilePage',
    SettingsPage: 'ProfilePage',
  },
}

test('exposes only HomePage and ProfilePage as safe fallback routes', () => {
  assert.deepEqual(SAFE_TOOLBAR_FALLBACK_ROUTES, ['HomePage', 'ProfilePage'])
})

test('builds safe fallback from managerToolbar without business routes', () => {
  const menus = buildSafeToolbarFallbackMenus(
    managerPreset,
    'toolbar',
    null,
    'managerToolbar',
  )

  assert.equal(menus.length, 1)
  const routes = menus[0].menus.map(item => item.route)
  assert.deepEqual(routes, ['HomePage', 'ProfilePage'])
  assert.equal(routes.includes('ClientsIndex'), false)
  assert.equal(routes.includes('CrmIndex'), false)
  assert.deepEqual(
    menus[0].menus.map(item => item.label),
    ['Início', 'Perfil'],
  )
})

test('returns empty safe fallback when preset has no safe routes', () => {
  const menus = buildSafeToolbarFallbackMenus(
    {items: [{route: 'ClientsIndex', icon: 'users', label: 'Clientes'}]},
    'toolbar',
  )
  assert.deepEqual(menus, [])
})

test('prefers API toolbar menus over preset when authorized items exist', () => {
  const apiMenus = [
    {
      id: 'toolbar-mod',
      label: 'Toolbar',
      menus: [
        {
          id: 1,
          route: 'HomePage',
          icon: 'home',
          label: 'Início',
          menuType: 'toolbar',
          sortOrder: 10,
        },
        {
          id: 2,
          route: 'ClientsIndex',
          icon: 'users',
          label: 'Clientes',
          menuType: 'toolbar',
          sortOrder: 20,
        },
      ],
    },
  ]

  const resolved = resolveToolbarRuntimeMenus({
    apiMenus,
    preset: managerPreset,
    presetKey: 'managerToolbar',
    menuType: 'toolbar',
  })

  const routes = resolved.flatMap(m => m.menus.map(i => i.route))
  assert.deepEqual(routes, ['HomePage', 'ClientsIndex'])
  assert.equal(routes.includes('ProfilePage'), false)
})

test('falls back to safe routes when API menus are empty', () => {
  const resolved = resolveToolbarRuntimeMenus({
    apiMenus: [],
    preset: managerPreset,
    presetKey: 'managerToolbar',
    menuType: 'toolbar',
  })

  const routes = resolved.flatMap(m => m.menus.map(i => i.route))
  assert.deepEqual(routes, ['HomePage', 'ProfilePage'])
  assert.equal(routes.includes('ClientsIndex'), false)
  assert.equal(routes.includes('CrmIndex'), false)
})

test('falls back to safe routes when API only has non-toolbar menus', () => {
  const apiMenus = [
    {
      id: 'home-mod',
      menus: [
        {
          route: 'ProductsPage',
          label: 'Produtos',
          menuType: 'home',
          sortOrder: 1,
        },
      ],
    },
  ]

  const resolved = resolveToolbarRuntimeMenus({
    apiMenus,
    preset: managerPreset,
    menuType: 'toolbar',
  })

  const routes = resolved.flatMap(m => m.menus.map(i => i.route))
  assert.deepEqual(routes, ['HomePage', 'ProfilePage'])
})

test('returns empty when API empty and no preset (no bypass)', () => {
  const resolved = resolveToolbarRuntimeMenus({
    apiMenus: [],
    preset: null,
    menuType: 'toolbar',
  })
  assert.deepEqual(resolved, [])
})

test('maps runtime menus to nav items sorted by sortOrder', () => {
  const runtimeMenus = [
    {
      id: 'm1',
      menus: [
        {
          route: 'ClientsIndex',
          icon: 'users',
          label: 'Clientes',
          menuKey: 'clients',
          menuType: 'toolbar',
          sortOrder: 30,
        },
        {
          route: 'HomePage',
          icon: 'home',
          label: 'Início',
          menuKey: 'home',
          menuType: 'toolbar',
          sortOrder: 10,
        },
      ],
    },
  ]

  const items = mapRuntimeMenusToNavItems(runtimeMenus, 'toolbar')
  assert.deepEqual(
    items.map(i => i.route),
    ['HomePage', 'ClientsIndex'],
  )
  assert.equal(items[0].menuKey, 'home')
})

test('ignores items without route when mapping', () => {
  const items = mapRuntimeMenusToNavItems(
    [
      {
        menus: [
          {route: '', label: 'Empty', menuType: 'toolbar'},
          {route: 'HomePage', label: 'Início', menuType: 'toolbar', sortOrder: 1},
        ],
      },
    ],
    'toolbar',
  )
  assert.deepEqual(
    items.map(i => i.route),
    ['HomePage'],
  )
})
