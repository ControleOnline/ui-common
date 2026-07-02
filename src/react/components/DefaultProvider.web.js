import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import Translate from '@controleonline/ui-common/src/utils/translate';
import { WebsocketListener } from '@controleonline/ui-common/src/react/components/WebsocketListener';
import DeviceAlertSoundService from '@controleonline/ui-common/src/react/components/DeviceAlertSoundService';
import PrintService from '@controleonline/ui-common/src/react/components/PrintService';
import RemoteCheckoutService from '@controleonline/ui-common/src/react/components/RemoteCheckoutService';
import ProductCatalogCacheService from '@controleonline/ui-common/src/react/components/ProductCatalogCacheService';
import RuntimeInfoFooter from '@controleonline/ui-common/src/react/components/RuntimeInfoFooter';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import { env as APP_ENV } from '@env';
import { isPublicRoute } from '@controleonline/ui-login/src/react/router/publicRoutes';
const { resolveConfiguredLanguage } = require('../utils/runtimeLanguage');
import {
  applyPaletteToRuntimeColors,
  applyThemeCssVariables,
  resolveThemePalette,
} from '@controleonline/../../src/styles/branding';
import { resolveAppDomain } from '@controleonline/ui-common/src/utils/appDomain';
import { colors as runtimeColors } from '@controleonline/../../src/styles/colors';
import {
  buildProviderManagedDeviceConfigs,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  buildDeviceRegistrationPayload,
  buildLocalRuntimeDevice,
  getOrCreateWebDeviceInstanceId,
  hasDeviceRecordChanges,
  resolveOperationalDeviceType,
} from '@controleonline/ui-common/src/react/utils/deviceRuntime';
import {
  filterWalletPaymentTypesByAllowedIds,
  resolveDevicePaymentTypeIds,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {normalizeRuntimeMenuResponse} from '@controleonline/ui-common/src/react/utils/runtimeMenu';
import stores from '@stores';
import packageJson from '@package';
import providerStyles from './DefaultProvider.styles';
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

const normalizeDeviceId = value =>
  String(value?.device || value?.id || value || '').trim();

const normalizeEntityId = value =>
  String(value?.id || value || '')
    .replace(/\D/g, '')
    .trim();

const resolveDeviceConfigPeopleIri = ({appType, currentCompany, user}) => {
  const normalizedAppType = String(appType || '').trim().toUpperCase();
  const currentPeopleId = normalizeEntityId(
    user?.people ?? user?.peopleId ?? user?.person ?? user?.personId ?? '',
  );
  const currentCompanyId = normalizeEntityId(currentCompany?.id);

  if (normalizedAppType === 'DELIVERY' && currentPeopleId) {
    return `/people/${currentPeopleId}`;
  }

  if (currentCompanyId) {
    return `/people/${currentCompanyId}`;
  }

  return '';
};

const normalizeRuntimeIp = value => String(value || '').trim();

const getRuntimeIpFromResponse = response =>
  normalizeRuntimeIp(response?.member?.[0]?.ip || response?.ip);

const getRuntimeIpFromDeviceInfo = deviceInfo =>
  normalizeRuntimeIp(
    deviceInfo?.externalIp ||
      deviceInfo?.metadata?.network?.publicIp ||
      deviceInfo?.metadata?.browser?.publicIp,
  );

const selectRuntimeDeviceConfig = ({
  items = [],
  deviceId,
  companyId,
  runtimeDeviceType,
}) => {
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  const normalizedCompanyId = normalizeEntityId(companyId);
  const normalizedType = String(runtimeDeviceType || '')
    .trim()
    .toUpperCase();

  return (Array.isArray(items) ? items : [])
    .filter(item => {
      const itemDeviceId = normalizeDeviceId(item?.device);
      const itemCompanyId = normalizeEntityId(item?.people);
      const itemType = String(item?.type || item?.device?.type || '')
        .trim()
        .toUpperCase();

      if (normalizedDeviceId && itemDeviceId !== normalizedDeviceId) {
        return false;
      }

      if (normalizedCompanyId && itemCompanyId !== normalizedCompanyId) {
        return false;
      }

      if (normalizedType && itemType && itemType !== normalizedType) {
        return false;
      }

      return true;
    })
    .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))[0] || null;
};

export const DefaultProvider = ({ children, onBootstrapReady }) => {
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

  const { items: companyConfigs } = configsGetters;
  const { colors, menus } = getters;
  const { currentCompany, defaultCompany, companies } = peopleGetters;
  const { item: device_config } = deviceConfigsGetters;
  const { isLogged, user } = authGetters;
  const hasCurrentCompany =
    !!currentCompany && Object.entries(currentCompany).length > 0;

  const [translateReady, setTranslateReady] = useState(true);
  const [deviceConfigFetched, setDeviceConfigFetched] = useState(false);
  const [mainConfigsDiscovered, setMainConfigsDiscovered] = useState(false);
  const [deviceRuntimeConfigSynced, setDeviceRuntimeConfigSynced] =
    useState(false);
  const [currentRouteName, setCurrentRouteName] = useState('');
  const [, setTranslateVersion] = useState(0);
  const [baseThemeColors, setBaseThemeColors] = useState({});
  const [bottomNavigationCount, setBottomNavigationCount] = useState(0);
  const translateBootstrapKeyRef = useRef('');
  const lastDeviceConfigPeopleIriRef = useRef('');
  const [device, setDevice] = useState(
    JSON.parse(localStorage.getItem('device') || '{}'),
  );
  const [webRuntimeIp, setWebRuntimeIp] = useState(() =>
    getRuntimeIpFromDeviceInfo(
      JSON.parse(localStorage.getItem('device') || '{}'),
    ),
  );
  const packageVersion = packageJson?.version || packageJson?.default?.version;
  const appVersion = packageVersion || device?.appVersion;
  const runtimeDeviceType = resolveOperationalDeviceType({
    appType: APP_ENV.APP_TYPE,
    deviceInfo: device || {},
  });
  const deviceConfigPeopleIri = resolveDeviceConfigPeopleIri({
    appType,
    currentCompany,
    user,
  });
  const isPublicRouteActive = isPublicRoute(currentRouteName);

  const registerBottomNavigation = useCallback(() => {
    setBottomNavigationCount(current => current + 1);

    let released = false;

    return () => {
      if (released) {
        return;
      }

      released = true;
      setBottomNavigationCount(current => Math.max(0, current - 1));
    };
  }, []);

  const themeContextValue = useMemo(
    () => ({
      colors,
      menus,
      runtimeFooter: isShopClientApp
        ? null
        : {
            appVersion,
            colors,
            defaultCompany,
            device,
          },
      bottomChrome: {
        hasBottomNavigation: bottomNavigationCount > 0,
        registerBottomNavigation,
      },
    }),
    [
      appVersion,
      bottomNavigationCount,
      colors,
      defaultCompany,
      device,
      isShopClientApp,
      menus,
      registerBottomNavigation,
    ],
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
    if (
      !deviceConfigPeopleIri ||
      lastDeviceConfigPeopleIriRef.current === deviceConfigPeopleIri
    ) {
      return;
    }

    lastDeviceConfigPeopleIriRef.current = deviceConfigPeopleIri;
    setDeviceConfigFetched(false);
    setDeviceRuntimeConfigSynced(false);
    deviceConfigsActions.setItem({});
  }, [deviceConfigPeopleIri, deviceConfigsActions]);

  useEffect(() => {
    if (!isLogged) {
      return;
    }

    let cancelled = false;

    api
      .fetch('runtime/ip', {
        method: 'GET',
      })
      .then(response => {
        const nextRuntimeIp = getRuntimeIpFromResponse(response);
        if (!nextRuntimeIp || cancelled) {
          return;
        }

        setWebRuntimeIp(currentIp =>
          currentIp === nextRuntimeIp ? currentIp : nextRuntimeIp,
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isLogged, user?.id]);

  const buildWebDevice = () => {
    const webDeviceId = getOrCreateWebDeviceInstanceId();
    if (!webDeviceId) {
      return null;
    }

    const nextAppName =
      packageJson?.displayName ||
      packageJson?.default?.displayName ||
      packageJson?.name ||
      packageJson?.default?.name ||
      'Web App';

    return buildLocalRuntimeDevice({
      appType: APP_ENV.APP_TYPE,
      deviceInfo: {
        id: webDeviceId,
        appName: nextAppName,
        deviceType: 'web',
        systemName: 'web',
        systemVersion: 'web',
        manufacturer: 'web',
        model: 'browser',
        batteryLevel: 'unknow',
        isEmulator: false,
        appVersion: packageVersion || '1.0.0',
        buildNumber: packageVersion || '1.0.0',
        externalIp: webRuntimeIp || null,
      },
    });
  };

  useEffect(() => {
    if (!isLogged && !isShopClientApp && (!device || !device.id)) {
      return;
    }

    const nextDevice = buildWebDevice();
    if (!nextDevice) {
      if (device && device.id) {
        deviceActions.setItem(device);
      }
      return;
    }

    const shouldRefreshDevice =
      !device?.id ||
      device.id !== nextDevice.id ||
      device.appVersion !== nextDevice.appVersion ||
      device.appName !== nextDevice.appName ||
      device.type !== nextDevice.type ||
      JSON.stringify(device.metadata || {}) !==
        JSON.stringify(nextDevice.metadata || {});

    if (shouldRefreshDevice) {
      setDevice(nextDevice);
      localStorage.setItem('device', JSON.stringify(nextDevice));
      deviceActions.setItem(nextDevice);
      localStorage.removeItem('master-device');
      return;
    }

    deviceActions.setItem(device);
  }, [device, deviceActions, isLogged, isShopClientApp, packageVersion, user?.id, webRuntimeIp]);

  useEffect(() => {
    if (isShopClientApp || device?.id) {
      peopleActions.defaultCompany().catch(() => {});
    }
  }, [device?.id, isShopClientApp, peopleActions]);

  useEffect(() => {
    if (!isLogged || !device?.id) {
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
          metadata: existingDevice?.metadata || nextDevice.metadata,
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
        metadata: savedDevice.metadata || nextDevice.metadata,
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
    device?.externalIp,
    device?.id,
    device?.manufacturer,
    device?.model,
    device?.systemVersion,
    isLogged,
    runtimeDeviceType,
  ]);

  useEffect(() => {
    if (isShopClientApp || !isLogged || !currentCompany?.id) {
      return;
    }

    printerActions
      .ensureCompanyPrintersLoaded({people: currentCompany.id})
      .catch(() => {});
  }, [currentCompany?.id, isLogged, isShopClientApp, printerActions]);

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
    if (!device?.id || !isLogged || !deviceConfigPeopleIri) {
      return;
    }

    setDeviceConfigFetched(false);
    setDeviceRuntimeConfigSynced(false);
    deviceConfigsActions.setItem({});

    deviceConfigsActions
      .getItems({
        'device.device': device.id,
        people: deviceConfigPeopleIri,
        type: runtimeDeviceType,
      })
      .then(data => {
        const selectedConfig = selectRuntimeDeviceConfig({
          items: data,
          deviceId: device.id,
          companyId: deviceConfigPeopleIri,
          runtimeDeviceType,
        });

        if (selectedConfig) {
          const nextItem = {
            ...selectedConfig,
            configs: parseConfigsObject(selectedConfig?.configs),
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
  }, [
    device?.id,
    deviceConfigPeopleIri,
    deviceConfigsActions,
    isLogged,
    runtimeDeviceType,
  ]);

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
        people: deviceConfigPeopleIri,
        type: runtimeDeviceType,
      })
      .catch(() => { })
      .finally(() => {
        setDeviceRuntimeConfigSynced(true);
      });
  }, [
    appVersion,
    device?.id,
    device?.manufacturer,
    device?.isEmulator,
    deviceConfigFetched,
    deviceConfigPeopleIri,
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
      .catch(() => { })
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
      const nextConfig = { ...currentConfig, language: configuredLanguage };
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
    if (device && device.id && isLogged) {
      peopleActions.myCompanies();
    }
  }, [isLogged, device?.id]);

  useEffect(() => {
    const fetchColors = async () => {
      const appDomain = resolveAppDomain(APP_ENV.DOMAIN);
      const params = appDomain ? { 'app-domain': appDomain } : undefined;

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

  useEffect(() => {
    const companyThemeColors = isShopClientApp
      ? defaultCompany?.theme?.colors || {}
      : currentCompany?.theme?.colors || defaultCompany?.theme?.colors || {};
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
  }, [
    actions,
    baseThemeColors,
    currentCompany?.id,
    currentCompany?.theme?.colors,
    defaultCompany?.id,
    defaultCompany?.theme?.colors,
    isShopClientApp,
  ]);

  return (
      <ThemeContext.Provider value={themeContextValue}>
        <View
          style={[
            providerStyles.shell,
            {
              backgroundColor: colors?.background || runtimeColors.background,
            },
          ]}>
          <View style={providerStyles.content}>{children}</View>
        {!isShopClientApp && bottomNavigationCount === 0 && (
          <RuntimeInfoFooter
            appVersion={appVersion}
            defaultCompany={defaultCompany}
            device={device}
            colors={colors}
          />
        )}
      </View>
      {!isShopClientApp && device?.id && isLogged && (
        <>
          <WebsocketListener />
          <DeviceAlertSoundService />
          <ProductCatalogCacheService />
          <RemoteCheckoutService />
          <PrintService />
        </>
      )}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
