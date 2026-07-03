import React, {useEffect, useMemo, useState} from 'react';
import {useNavigationState} from '@react-navigation/native';
import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import {env as APP_ENV} from '@env';
import {colors as runtimeColors} from '@controleonline/../../src/styles/colors';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import BottomNavigationBar from '@controleonline/ui-common/src/react/components/BottomNavigationBar';
import {
  getBottomNavigationPreset,
  resolveBottomNavigationRoute,
} from '@controleonline/ui-common/src/react/components/BottomNavigationBar.config';
import {
  filterRuntimeMenuModulesByType,
  normalizeAppType,
  normalizeRuntimeMenuResponse,
  resolveRuntimeMenuLabel,
} from '@controleonline/ui-common/src/react/utils/runtimeMenu';

const sortRuntimeMenuItems = (left, right) => {
  const orderDiff = Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0);
  if (orderDiff !== 0) return orderDiff;
  return String(left?.label || '').localeCompare(String(right?.label || ''));
};

const RuntimeBottomNavigationBar = ({
  activeRouteName: activeRouteNameProp,
  colors: colorsOverride,
  disabled: disabledOverride,
  itemFilter,
  itemMapper,
  menuType = 'toolbar',
  navigation,
  presetKey,
  routeAliases: routeAliasesProp,
  testID = 'bottom-navigation',
}) => {
  const state = useNavigationState(current => current);
  const activeRouteName =
    activeRouteNameProp || state?.routes?.[state.index]?.name || 'HomePage';

  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const themeGetters = themeStore?.getters || {};
  const peopleGetters = peopleStore?.getters || {};
  const currentCompany = peopleGetters.currentCompany || {};
  const themeColors = themeGetters.colors || {};
  const [runtimeMenus, setRuntimeMenus] = useState([]);
  const preset = presetKey ? getBottomNavigationPreset(presetKey) : null;
  const routeAliases = routeAliasesProp || preset?.routeAliases || {};
  const appType = normalizeAppType(APP_ENV.APP_TYPE);

  useEffect(() => {
    if (!currentCompany?.id || !menuType) {
      setRuntimeMenus([]);
      return undefined;
    }

    let cancelled = false;
    setRuntimeMenus([]);

    api
      .fetch('menus-people', {
        params: {
          myCompany: currentCompany.id,
          appType,
          menuType,
        },
      })
      .then(result => {
        if (!cancelled) {
          setRuntimeMenus(
            normalizeRuntimeMenuResponse(result, {
              appType,
              allowFallback: false,
            }),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRuntimeMenus([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appType, currentCompany?.id, menuType]);

  const colors = useMemo(() => {
    if (colorsOverride) {
      return colorsOverride;
    }

    return resolveThemePalette(
      {
        ...themeColors,
        ...(currentCompany?.theme?.colors || {}),
      },
      runtimeColors,
    );
  }, [colorsOverride, currentCompany?.theme?.colors, themeColors]);

  const navItems = useMemo(() => {
    const mapper = typeof itemMapper === 'function' ? itemMapper : item => item;
    const filter = typeof itemFilter === 'function' ? itemFilter : () => true;

    return filterRuntimeMenuModulesByType(runtimeMenus, menuType)
      .flatMap(module => (Array.isArray(module?.menus) ? module.menus : []))
      .map(item => mapper({...item}))
      .filter(Boolean)
      .filter(filter)
      .sort(sortRuntimeMenuItems)
      .map(item => ({
        route: item.route,
        icon: item.icon || 'circle',
        label: resolveRuntimeMenuLabel(item, global.t?.t),
        routeParams: item.routeParams,
        menuType: item.menuType,
      }))
      .filter(item => Boolean(item.route));
  }, [itemFilter, itemMapper, menuType, runtimeMenus]);

  const resolvedActiveRoute = resolveBottomNavigationRoute(
    routeAliases,
    activeRouteName,
  );
  const knownRoute = navItems.some(item => item.route === resolvedActiveRoute);
  const effectiveActiveRoute = knownRoute
    ? resolvedActiveRoute
    : navItems[0]?.route || activeRouteName;

  const isDisabled =
    typeof disabledOverride === 'boolean'
      ? disabledOverride
      : !currentCompany || Object.keys(currentCompany).length === 0;

  return (
    <BottomNavigationBar
      activeRouteName={effectiveActiveRoute}
      colors={colors}
      disabled={isDisabled}
      items={navItems}
      navigation={navigation}
      testID={testID}
    />
  );
};

export default RuntimeBottomNavigationBar;
