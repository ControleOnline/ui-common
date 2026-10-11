import {useEffect} from 'react';

// Extracted bootstrap effects retain their dependency arrays and invocation order.

export function useNativeDeviceConfigSync({deviceConfigFetched, isLogged, deviceConfigPeopleIri, device, deviceRuntimeConfigSynced, runtimeDeviceType, device_config, buildDefaultDeviceConfigs, buildProviderManagedDeviceConfigs, appVersion, setDeviceRuntimeConfigSynced, deviceConfigsActions, user}) {
  useEffect(() => {
    if (
      !deviceConfigFetched ||
      !isLogged ||
      !deviceConfigPeopleIri ||
      !device?.id ||
      deviceRuntimeConfigSynced
    ) {
      return;
    }

    const isNewPdvConfig =
      runtimeDeviceType === 'PDV' &&
      !device_config?.id &&
      !device_config?.['@id'];
    const buildDeviceConfigs = isNewPdvConfig
      ? buildDefaultDeviceConfigs
      : buildProviderManagedDeviceConfigs;
    const {nextConfigs, needsUpdate} = buildDeviceConfigs({
      configs: device_config?.configs,
      appVersion,
      deviceInfo: device,
    });

    if (!needsUpdate) {
      setDeviceRuntimeConfigSynced(true);
      return;
    }

    // app-community#821: never auto-persist device_config from global bootstrap.
    // Provider-managed fields stay in memory only; API mutations only from
    // explicit device settings UI (avoids 403 on order-history / PDV|MANAGER).
    const currentItem = device_config || {};
    deviceConfigsActions.setItem({
      ...currentItem,
      configs: nextConfigs,
      device: currentItem.device || device.id,
      people: currentItem.people || deviceConfigPeopleIri,
      type: currentItem.type || runtimeDeviceType,
    });
    setDeviceRuntimeConfigSynced(true);
  }, [
    appVersion,
    device?.id,
    device?.manufacturer,
    device?.isEmulator,
    deviceConfigFetched,
    deviceConfigPeopleIri,
    deviceRuntimeConfigSynced,
    deviceConfigsActions,
    device_config,
    isLogged,
    runtimeDeviceType,
    user,
  ]);
}

export function useNativeMainConfigReset({isLogged, currentCompany, device, setMainConfigsDiscovered}) {
  useEffect(() => {
    if (!isLogged || !currentCompany?.id || !device?.id) {
      return;
    }

    setMainConfigsDiscovered(false);
  }, [isLogged, currentCompany?.id, device?.id]);
}

export function useNativeMainConfigDiscovery({isLogged, currentCompany, device, mainConfigsDiscovered, configActions, setMainConfigsDiscovered}) {
  useEffect(() => {
    if (
      !isLogged ||
      !currentCompany?.id ||
      !device?.id ||
      mainConfigsDiscovered
    ) {
      return;
    }

    configActions
      .discoveryMainConfigs({
        people: '/people/' + currentCompany.id,
      })
      .catch(() => {})
      .finally(() => {
        setMainConfigsDiscovered(true);
      });
  }, [configActions, currentCompany?.id, device?.id, isLogged, mainConfigsDiscovered]);
}

export function useNativeMainConfigSeed({isLogged, currentCompany, mainConfigsDiscovered, configActions}) {
  useEffect(() => {
    if (
      isLogged &&
      currentCompany &&
      Object.entries(currentCompany).length > 0 &&
      !mainConfigsDiscovered
    ) {
      configActions.setItems(currentCompany.configs);
    }
  }, [currentCompany, isLogged, mainConfigsDiscovered]);
}

export function useNativeTranslationBootstrap({currentRouteName, isPublicRouteActive, isLogged, hasCurrentCompany, deviceConfigFetched, expectedTranslateBootstrapKey, translateBootstrapKeyRef, companies, currentCompany, mainCompany, setActiveTranslateBootstrapKey, setTranslateReady, configuredTranslationLanguage, Translate, stores, translateStore}) {
  useEffect(() => {
    if (!currentRouteName || isPublicRouteActive) {
      return;
    }

    if (
      !isLogged ||
      !hasCurrentCompany ||
      !deviceConfigFetched ||
      !expectedTranslateBootstrapKey
    ) {
      return;
    }

    const currentConfig = JSON.parse(localStorage.getItem('config') || '{}');

    if (
      translateBootstrapKeyRef.current === expectedTranslateBootstrapKey &&
      global.t
    ) {
      global.t.companies = companies;
      global.t.currentCompany = currentCompany;
      global.t.mainCompany = mainCompany;
      setActiveTranslateBootstrapKey(expectedTranslateBootstrapKey);
      setTranslateReady(true);

      return;
    }

    setTranslateReady(false);

    if (currentConfig.language !== configuredTranslationLanguage) {
      const nextConfig = {
        ...currentConfig,
        language: configuredTranslationLanguage,
      };
      localStorage.setItem(
        'config',
        JSON.stringify(nextConfig),
      );
    }

    translateBootstrapKeyRef.current = expectedTranslateBootstrapKey;
    global.t = new Translate(
      companies,
      mainCompany,
      currentCompany,
      Object.keys(stores),
      translateStore,
    );
    setActiveTranslateBootstrapKey(expectedTranslateBootstrapKey);
    setTranslateReady(true);
    global.refreshTranslationsUI?.();
  }, [
    companies,
    configuredTranslationLanguage,
    currentCompany,
    currentRouteName,
    mainCompany,
    deviceConfigFetched,
    expectedTranslateBootstrapKey,
    hasCurrentCompany,
    isLogged,
    isPublicRouteActive,
    translateStore,
  ]);
}

export function useNativeBootstrapReady({isLogged, hasCurrentCompany, currentRouteName, isTranslateBootstrapReady, onBootstrapReady}) {
  useEffect(() => {
    if (
      !isLogged ||
      !hasCurrentCompany ||
      (currentRouteName && isTranslateBootstrapReady)
    ) {
      onBootstrapReady?.();
    }
  }, [
    currentRouteName,
    hasCurrentCompany,
    isLogged,
    isTranslateBootstrapReady,
    onBootstrapReady,
  ]);
}

export function useNativeCompanies({device, isLogged, peopleActions}) {
  useEffect(() => {
    if (
      device &&
      device.id &&
      isLogged
    ) {
      peopleActions.myCompanies();
    }
  }, [isLogged, device?.id]);
}

export function useNativeMenus({isLogged, currentCompany, actions, api, appType, normalizeRuntimeMenuResponse}) {
  useEffect(() => {
    if (!isLogged || !currentCompany?.id) {
      actions.setMenus([]);
      return undefined;
    }

    let cancelled = false;

    api
      .fetch('menus-people', {
        params: {
          myCompany: currentCompany.id,
          appType,
          menuType: 'home',
        },
      })
      .then(result => {
        if (!cancelled) {
          actions.setMenus(normalizeRuntimeMenuResponse(result, {appType}));
        }
      })
      .catch(() => {
        if (!cancelled) {
          actions.setMenus(normalizeRuntimeMenuResponse(null, {appType}));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [actions, appType, currentCompany?.id, isLogged]);
}

export function useNativeThemeFetch({api, parseThemeCss, setBaseThemeColors, actions, device, currentCompany, mainCompany}) {
  useEffect(() => {
    const fetchColors = async () => {
      try {
        const cssText = await api.fetch('themes-colors.css', {
          responseType: 'text',
        });
        const parsedColors = parseThemeCss(cssText);
        setBaseThemeColors(parsedColors);
        actions.setColors(parsedColors);
      } catch {
        setBaseThemeColors({});
      }
    };

    if (device?.id) {
      fetchColors();
    }
  }, [actions, currentCompany?.id, mainCompany?.id, device?.id]);
}

export function useNativeThemePalette({resolveDomainThemeColors, baseThemeColors, mainCompany, resolveThemePalette, runtimeColors, applyPaletteToRuntimeColors, applyThemeCssVariables, actions, currentCompany}) {
  useEffect(() => {
    const mergedThemeColors = resolveDomainThemeColors(baseThemeColors, mainCompany);

    const palette = resolveThemePalette(mergedThemeColors, runtimeColors);
    applyPaletteToRuntimeColors(palette, runtimeColors);
    applyThemeCssVariables({
      themeColors: mergedThemeColors,
      palette,
    });

    actions.setColors(mergedThemeColors);
  }, [actions, baseThemeColors, currentCompany?.id, currentCompany?.theme?.colors]);
}
