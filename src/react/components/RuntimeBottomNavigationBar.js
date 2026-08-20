import React, {useEffect, useMemo, useState} from 'react';
import {useNavigationState} from '@react-navigation/native';
import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import {app_type} from '@appType';
import BottomNavigationBar from '@controleonline/ui-common/src/react/components/BottomNavigationBar';
import {
  getBottomNavigationPreset,
  resolveBottomNavigationRoute,
} from '@controleonline/ui-common/src/react/components/BottomNavigationBar.config';
import {
  normalizeAppType,
  normalizeRuntimeMenuResponse,
  resolveRuntimeMenuLabel,
} from '@controleonline/ui-common/src/react/utils/runtimeMenu';
const {
  mapRuntimeMenusToNavItems,
  resolveToolbarRuntimeMenus,
} = require('@controleonline/ui-common/src/react/utils/bottomNavigationToolbar');

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
  useModernWebChromeProps = false,
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
  const appType = normalizeAppType(app_type);

  // Always consult menus-people for role-aware toolbar; preset is fallback only.
  useEffect(() => {
    if (!currentCompany?.id || !menuType) {
      setRuntimeMenus(
        resolveToolbarRuntimeMenus({
          apiMenus: [],
          preset,
          presetKey,
          menuType,
          translate: global.t?.t,
        }),
      );
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
        if (cancelled) return;
        const apiMenus = normalizeRuntimeMenuResponse(result, {
          appType,
          allowFallback: false,
        });
        setRuntimeMenus(
          resolveToolbarRuntimeMenus({
            apiMenus,
            preset,
            presetKey,
            menuType,
            translate: global.t?.t,
          }),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setRuntimeMenus(
          resolveToolbarRuntimeMenus({
            apiMenus: [],
            preset,
            presetKey,
            menuType,
            translate: global.t?.t,
          }),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [appType, currentCompany?.id, menuType, preset, presetKey]);

  const colors = useMemo(() => {
    if (colorsOverride) {
      return colorsOverride;
    }

    return {
      ...themeColors,
      ...(currentCompany?.theme?.colors || {}),
    };
  }, [colorsOverride, currentCompany?.theme?.colors, themeColors]);

  const navItems = useMemo(() => {
    const mapper = typeof itemMapper === 'function' ? itemMapper : item => item;
    const filter = typeof itemFilter === 'function' ? itemFilter : () => true;
    const translate = global.t?.t;

    return mapRuntimeMenusToNavItems(runtimeMenus, menuType)
      .map(item => {
        const label =
          resolveRuntimeMenuLabel(
            {menuKey: item.menuKey, label: item.label},
            translate,
          ) ||
          (typeof item.label === 'string' ? item.label : '') ||
          item.menuKey ||
          item.route;

        return mapper({
          ...item,
          label,
        });
      })
      .filter(Boolean)
      .filter(filter)
      .filter(item => Boolean(item?.route));
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
      useModernWebChromeProps={useModernWebChromeProps}
    />
  );
};

export default RuntimeBottomNavigationBar;
