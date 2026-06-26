import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {View, AppState, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Translate from '@controleonline/ui-common/src/utils/translate';
import {WebsocketListener} from '@controleonline/ui-common/src/react/components/WebsocketListener';
import BackgroundRuntimeBridge from '@controleonline/ui-common/src/react/components/BackgroundRuntimeBridge';
import DeviceAlertSoundService from '@controleonline/ui-common/src/react/components/DeviceAlertSoundService';
import KioskModeBridge from '@controleonline/ui-common/src/react/components/KioskModeBridge';
import ManagerPushBridge from '@controleonline/ui-common/src/react/components/ManagerPushBridge';
import PrintService from '@controleonline/ui-common/src/react/components/PrintService';
import RemoteCheckoutService from '@controleonline/ui-common/src/react/components/RemoteCheckoutService';
import ProductCatalogCacheService from '@controleonline/ui-common/src/react/components/ProductCatalogCacheService';
import RuntimeInfoFooter from '@controleonline/ui-common/src/react/components/RuntimeInfoFooter';
import {isPublicRoute} from '@controleonline/ui-login/src/react/router/publicRoutes';
import {api} from '@controleonline/ui-common/src/api';
import {env as APP_ENV} from '@env';
const {resolveConfiguredLanguage} = require('../utils/runtimeLanguage');
import {
  applyPaletteToRuntimeColors,
  applyThemeCssVariables,
  resolveThemePalette,
} from '@controleonline/../../src/styles/branding';
import {resolveAppDomain} from '@controleonline/ui-common/src/utils/appDomain';
import {colors as runtimeColors} from '@controleonline/../../src/styles/colors';
import {
  buildProviderManagedDeviceConfigs,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  buildDeviceRegistrationPayload,
  buildLocalRuntimeDevice,
  hasDeviceRecordChanges,
  resolveOperationalDeviceType,
} from '@controleonline/ui-common/src/react/utils/deviceRuntime';
import {
  filterWalletPaymentTypesByAllowedIds,
  resolveDevicePaymentTypeIds,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {normalizeRuntimeMenuResponse} from '@controleonline/ui-common/src/react/utils/runtimeMenu';
import packageJson from '@package';
import providerStyles from './DefaultProvider.styles';

import {useStore} from '@store';
import stores from '@stores';
const ThemeContext = createContext();

const parseThemeCss = cssText => {
  const parsedColors = {};
  const matches = String(cssText || '').match(/--([\w-]+)\s*:\s*([^;}{]+)\s*;/g) || [];

  matches.forEach(match => {
    const clean = match.trim().replace(/^--/, '').replace(/;$/, '');
    const splitIndex = clean.indexOf(':');
    if (splitIndex <= 0) return;

    const key = clean.slice(0, splitIndex).trim();
    const value = clean.slice(splitIndex + 1).trim();
    if (!key || !value) return;
    parsedColors[key] = value;
  });

  return parsedColors;
};

const normalizeEntityId = value =>
  String(value?.id || value || '')
    .replace(/\D/g, '')
    .trim();

export const DefaultProvider = ({children, onBootstrapReady}) => {
  const appType = String(APP_ENV.APP_TYPE || '').toUpperCase();
  const isShopClientApp = appType === 'SHOP';
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const actions = themeStore.actions;
  const authStore = useStore('auth');
  const authGetters = authStore.getters;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const peopleActions = peopleStore.actions;

  const deviceStore = useStore('device');
  const deviceActions = deviceStore.actions;

  const device_configStore = useStore('device_config');
  const deviceConfigsGetters = device_configStore.getters;
  const deviceConfigsActions = device_configStore.actions;

  const configsStore = useStore('configs');
  const configActions = configsStore.actions;
  const configsGetters = configsStore.getters;
  const printerStore = useStore('printer');
  const printerActions = printerStore.actions;
  const walletPaymentTypeStore = useStore('walletPaymentType');
  const paymentTypeActions = walletPaymentTypeStore.actions;
  const translateStore = useStore('translate');
  const translateActions = translateStore.actions;
  const {items: companyConfigs} = configsGetters;
  const {colors, menus} = getters;
  const {currentCompany, defaultCompany, companies} = peopleGetters;
  const {item: device_config} = deviceConfigsGetters;
  const {isLogged, sessionChecked} = authGetters;
  const hasCurrentCompany =
    !!currentCompany && Object.entries(currentCompany).length > 0;
  const [translateReady, setTranslateReady] = useState(true);
  const [deviceConfigFetched, setDeviceConfigFetched] = useState(false);
  const [mainConfigsDiscovered, setMainConfigsDiscovered] = useState(false);
  const [deviceRuntimeConfigSynced, setDeviceRuntimeConfigSynced] =
    useState(false);
  const [currentRouteName, setCurrentRouteName] = useState('');
  const [appState, setAppState] = useState(AppState.currentState || 'active');
  const [, setTranslateVersion] = useState(0);
  const [baseThemeColors, setBaseThemeColors] = useState({});
  const translateBootstrapKeyRef = useRef('');
  const [device, setDevice] = useState(
    JSON.parse(localStorage.getItem('device') || '{}'),
  );
  const packageVersion = packageJson?.version || packageJson?.default?.version;
  const appVersion = packageVersion || device?.appVersion;
  const runtimeDeviceType = resolveOperationalDeviceType({
    appType: APP_ENV.APP_TYPE,
    deviceInfo: device || {},
  });
  const isPublicRouteActive = isPublicRoute(currentRouteName);
  const shouldRunForegroundRealtimeServices =
    Platform.OS !== 'android' || appState === 'active';
  const runtimeBridges = (
    <>
      <KioskModeBridge appState={appState} />
      <BackgroundRuntimeBridge appState={appState} />
      <ManagerPushBridge device={device} setDevice={setDevice} />
    </>
  );

  useEffect(() => {
    global.refreshTranslationsUI = () => {
      setTranslateVersion(version => version + 1);
    };

    return () => {
      if (global.refreshTranslationsUI) {
        delete global.refreshTranslationsUI;
      }
    };
  }, []);

  useEffect(() => {
    global.setRuntimeRouteName = routeName => {
      const normalizedRouteName = String(routeName || '').trim();

      setCurrentRouteName(previousRouteName =>
        previousRouteName === normalizedRouteName
          ? previousRouteName
          : normalizedRouteName,
      );
    };

    return () => {
      if (global.setRuntimeRouteName) {
        delete global.setRuntimeRouteName;
      }
    };
  }, []);

  useEffect(() => {
    if (isLogged && !isPublicRouteActive) {
      return;
    }

    setTranslateReady(true);
    translateBootstrapKeyRef.current = '';
    translateActions.setMessages({});
    translateActions.setPendingMessages?.({});

    if (global.t) {
      delete global.t;
    }
  }, [isLogged, isPublicRouteActive]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      setAppState(nextState || 'active');
    });

    return () => {
      subscription?.remove?.();
    };
  }, []);

  const fetchDeviceId = async () => {
    const uniqueId = await DeviceInfo.getUniqueId();
    const deviceId = await DeviceInfo.getDeviceId();
    const appName = DeviceInfo.getApplicationName();
    const systemName = await DeviceInfo.getSystemName();
    const systemVersion = await DeviceInfo.getSystemVersion();
    const manufacturer = await DeviceInfo.getManufacturer();
    const model = await DeviceInfo.getModel();
    const batteryLevel = await DeviceInfo.getBatteryLevel();
    const isEmulator = await DeviceInfo.isEmulator();
    const appVersion = await DeviceInfo.getVersion();
    const buildNumber = await DeviceInfo.getBuildNumber();
    let ld = null;
    if (uniqueId) {
      ld = buildLocalRuntimeDevice({
        appType: APP_ENV.APP_TYPE,
        deviceInfo: {
          id: uniqueId,
          appName: appName,
          deviceType: deviceId,
          systemName: systemName,
          systemVersion: systemVersion,
          manufacturer: manufacturer,
          model: model,
          batteryLevel: batteryLevel,
          isEmulator: isEmulator,
          appVersion: appVersion,
          buildNumber: buildNumber,
          metadata: device?.metadata,
        },
      });
      setDevice(ld);
      localStorage.setItem('device', JSON.stringify(ld));
    } else {
      setTimeout(() => {
        fetchDeviceId();
      }, 300);
    }
  };
  useEffect(() => {
    const checkVersion = async () => {
      const appVersion = await DeviceInfo.getVersion();
      if (
        device &&
        ((device.appVersion && device.appVersion != appVersion) || !device.appName)
      ) {
        fetchDeviceId();
      }
    };
    checkVersion();
  }, [device]);

  useEffect(() => {
    if (!device || !device.id) {
      fetchDeviceId();
    } else {
      deviceActions.setItem(device);
    }
  }, [device]);

  useEffect(() => {
    if (device && device.id) {
      peopleActions.defaultCompany();
    }
  }, [device?.id]);

  useEffect(() => {
    if (!sessionChecked || !isLogged || !device?.id) {
      return;
    }

    let cancelled = false;

    const syncDeviceRegistration = async () => {
      const items = await deviceActions.getItems({
        device: device.id,
      });

      if (cancelled) {
        return;
      }

      const existingDevice =
        Array.isArray(items) && items.length > 0 ? items[0] : null;
      const nextDevice = buildDeviceRegistrationPayload({
        deviceInfo: device,
        appType: APP_ENV.APP_TYPE,
        existingDevice,
      });

      if (!hasDeviceRecordChanges({existingDevice, nextDevice})) {
        const nextLocalDevice = {
          ...device,
          entityId: existingDevice?.id || device?.entityId || null,
          entityIri:
            existingDevice?.['@id'] ||
            device?.entityIri ||
            (existingDevice?.id ? `/devices/${existingDevice.id}` : null),
          alias: existingDevice?.alias || nextDevice.alias,
          type: device?.type || runtimeDeviceType,
          metadata: {
            ...(existingDevice?.metadata || {}),
            ...(nextDevice.metadata || {}),
          },
        };

        if (JSON.stringify(nextLocalDevice) !== JSON.stringify(device)) {
          setDevice(nextLocalDevice);
          localStorage.setItem('device', JSON.stringify(nextLocalDevice));
          deviceActions.setItem(nextLocalDevice);
        }
        return;
      }

      const savedDevice = await deviceActions.save(nextDevice);
      if (cancelled || !savedDevice) {
        return;
      }

      const nextLocalDevice = {
        ...device,
        entityId: savedDevice?.id || device?.entityId || null,
        entityIri:
          savedDevice?.['@id'] ||
          device?.entityIri ||
          (savedDevice?.id ? `/devices/${savedDevice.id}` : null),
        alias: savedDevice.alias || nextDevice.alias,
        type: device?.type || runtimeDeviceType,
        metadata: {
          ...(savedDevice?.metadata || {}),
          ...(nextDevice.metadata || {}),
        },
      };

      if (JSON.stringify(nextLocalDevice) !== JSON.stringify(device)) {
        setDevice(nextLocalDevice);
        localStorage.setItem('device', JSON.stringify(nextLocalDevice));
        deviceActions.setItem(nextLocalDevice);
      }
    };

    syncDeviceRegistration().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    device?.appVersion,
    device?.batteryLevel,
    device?.buildNumber,
    device?.deviceType,
    device?.id,
    device?.metadata,
    device?.manufacturer,
    device?.model,
    device?.systemVersion,
    isLogged,
    sessionChecked,
    runtimeDeviceType,
  ]);

  useEffect(() => {
    if (isShopClientApp || !sessionChecked || !isLogged || !currentCompany?.id) {
      return;
    }

    printerActions
      .ensureCompanyPrintersLoaded({people: currentCompany.id})
      .catch(() => {});
  }, [currentCompany?.id, isLogged, isShopClientApp, printerActions, sessionChecked]);

  useEffect(() => {
    const paymentConfigSource = isShopClientApp
      ? Object.keys(companyConfigs || {}).length > 0
        ? companyConfigs
        : currentCompany?.configs
      : device_config?.configs;

    if (!currentCompany?.id || !paymentConfigSource) {
      paymentTypeActions.setItems([]);
      return;
    }

    let isMounted = true;

    api
      .fetch('wallet_payment_types', {
        params: {
          people: `/people/${currentCompany.id}`,
        },
      })
      .then(response => {
        if (!isMounted) {
          return;
        }

        const walletPaymentTypes = Array.isArray(response?.member)
          ? response.member
          : Array.isArray(response?.['hydra:member'])
            ? response['hydra:member']
            : Array.isArray(response)
              ? response
              : [];
        const allowedPaymentTypeIds = resolveDevicePaymentTypeIds(
          paymentConfigSource,
          walletPaymentTypes,
        );

        paymentTypeActions.setItems(
          filterWalletPaymentTypesByAllowedIds(
            walletPaymentTypes,
            allowedPaymentTypeIds,
          ),
        );
      })
      .catch(() => {
        if (isMounted) {
          paymentTypeActions.setItems([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    companyConfigs,
    currentCompany?.configs,
    currentCompany?.id,
    device_config?.configs,
    isShopClientApp,
    paymentTypeActions,
  ]);

  useEffect(() => {
    if (
      device &&
      device.id &&
      isLogged &&
      currentCompany &&
      Object.entries(currentCompany).length > 0
    ) {
      setDeviceConfigFetched(false);
      setDeviceRuntimeConfigSynced(false);
      deviceConfigsActions
        .getItems({
          'device.device': device.id,
          people: '/people/' + currentCompany.id,
          type: runtimeDeviceType,
        })
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const nextItem = {
              ...data[0],
              configs: parseConfigsObject(data[0]?.configs),
            };
            deviceConfigsActions.setItem(nextItem);
            return;
          }

          deviceConfigsActions.setItem({});
        })
        .catch(() => {})
        .finally(() => {
          setDeviceConfigFetched(true);
        });
    }
  }, [currentCompany?.id, isLogged, device?.id, runtimeDeviceType]);

  useEffect(() => {
    if (
      !deviceConfigFetched ||
      !isLogged ||
      !currentCompany?.id ||
      !device?.id ||
      deviceRuntimeConfigSynced
    ) {
      return;
    }

    const {nextConfigs, needsUpdate} = buildProviderManagedDeviceConfigs({
      configs: device_config?.configs,
      appVersion,
      deviceInfo: device,
    });

    if (!needsUpdate) {
      setDeviceRuntimeConfigSynced(true);
      return;
    }

    deviceConfigsActions
      .addDeviceConfigs({
        device: device.id,
        configs: JSON.stringify(nextConfigs),
        people: '/people/' + currentCompany.id,
        type: runtimeDeviceType,
      })
      .catch(() => {})
      .finally(() => {
        setDeviceRuntimeConfigSynced(true);
      });
  }, [
    appVersion,
    currentCompany?.id,
    device?.id,
    device?.manufacturer,
    device?.isEmulator,
    deviceConfigFetched,
    deviceRuntimeConfigSynced,
    deviceConfigsActions,
    device_config?.configs,
    isLogged,
    runtimeDeviceType,
  ]);

  useEffect(() => {
    if (!isLogged || !currentCompany?.id || !device?.id) {
      return;
    }

    setMainConfigsDiscovered(false);
  }, [isLogged, currentCompany?.id, device?.id]);

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

  useEffect(() => {
    if (
      !currentRouteName ||
      isPublicRouteActive
    ) {
      return;
    }

    if (
      !isLogged ||
      !currentCompany ||
      Object.entries(currentCompany).length === 0 ||
      !deviceConfigFetched
    ) {
      return;
    }

    const currentConfig = JSON.parse(localStorage.getItem('config') || '{}');
    const sessionData = JSON.parse(localStorage.getItem('session') || '{}');
    const currentCompanyId = normalizeEntityId(currentCompany?.id);
    const defaultCompanyId = normalizeEntityId(defaultCompany?.id);
    const configuredLanguage = resolveConfiguredLanguage({
      currentCompany,
      defaultCompany,
      currentConfig,
      sessionData,
    });
    const nextTranslateBootstrapKey = [
      configuredLanguage,
      currentCompanyId,
      defaultCompanyId,
    ].join('::');

    if (translateBootstrapKeyRef.current === nextTranslateBootstrapKey) {
      if (global.t) {
        global.t.companies = companies;
        global.t.currentCompany = currentCompany;
        global.t.defaultCompany = defaultCompany;
      }

      return;
    }

    if (currentConfig.language !== configuredLanguage) {
      const nextConfig = {...currentConfig, language: configuredLanguage};
      localStorage.setItem(
        'config',
        JSON.stringify(nextConfig),
      );
    }

    translateBootstrapKeyRef.current = nextTranslateBootstrapKey;
    global.t = new Translate(
      companies,
      defaultCompany,
      currentCompany,
      Object.keys(stores),
      translateStore,
    );
    setTranslateReady(true);
    global.refreshTranslationsUI?.();
    global.t.discoveryAll().catch(() => {});
  }, [
    companies,
    currentCompany,
    currentRouteName,
    defaultCompany,
    deviceConfigFetched,
    isLogged,
    isPublicRouteActive,
    translateActions,
  ]);


  useEffect(() => {
    if (!isLogged || translateReady || !hasCurrentCompany) {
      onBootstrapReady?.();
    }
  }, [isLogged, translateReady, hasCurrentCompany, onBootstrapReady]);


  useEffect(() => {
    if (
      device &&
      device.id &&
      isLogged
    ) {
      peopleActions.myCompanies();
    }
  }, [isLogged, device?.id]);

  useEffect(() => {
    const fetchColors = async () => {
      const appDomain = resolveAppDomain(APP_ENV.DOMAIN);
      const params = appDomain ? {'app-domain': appDomain} : undefined;

      try {
        const cssText = await api.fetch('themes-colors.css', {
          responseType: 'text',
          params,
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
  }, [actions, currentCompany?.id, defaultCompany?.id, device?.id]);

  useEffect(() => {
    if (!isLogged || !currentCompany?.id || !appType) {
      actions.setMenus([]);
      return;
    }

    let cancelled = false;

    api
      .fetch('menus-people', {
        params: {
          myCompany: currentCompany.id,
          appType,
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

  useEffect(() => {
    const companyThemeColors =
      currentCompany?.theme?.colors || defaultCompany?.theme?.colors || {};
    const mergedThemeColors = {
      ...(baseThemeColors || {}),
      ...(companyThemeColors || {}),
    };

    const palette = resolveThemePalette(mergedThemeColors, runtimeColors);
    applyPaletteToRuntimeColors(palette, runtimeColors);
    applyThemeCssVariables({
      themeColors: mergedThemeColors,
      palette,
    });

    actions.setColors(mergedThemeColors);
  }, [actions, baseThemeColors, currentCompany?.id, currentCompany?.theme?.colors]);
  return (
    <>
      {runtimeBridges}
      {device &&
        device.id && (
          <ThemeContext.Provider value={{colors, menus}}>
            <View
              style={[
                providerStyles.shell,
                {
                  backgroundColor: colors?.background || runtimeColors.background,
                },
              ]}>
              <View style={providerStyles.content}>{children}</View>
              {!isShopClientApp && (
                <RuntimeInfoFooter
                  appVersion={appVersion}
                  defaultCompany={defaultCompany}
                  device={device}
                  colors={colors}
                />
              )}
            </View>
            {!isShopClientApp && (
              <>
                {shouldRunForegroundRealtimeServices && (
                  <>
                    <WebsocketListener />
                    <DeviceAlertSoundService />
                    <ProductCatalogCacheService />
                    <RemoteCheckoutService />
                    <PrintService />
                  </>
                )}
              </>
            )}
          </ThemeContext.Provider>
        )}
    </>
  );
};

export const useTheme = () => useContext(ThemeContext);
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
