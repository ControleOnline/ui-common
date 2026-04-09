import React, {createContext, useContext, useEffect, useState} from 'react';
import {View, ActivityIndicator, Text} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Translate from '@controleonline/ui-common/src/utils/translate';
import {WebsocketListener} from '@controleonline/ui-common/src/react/components/WebsocketListener';
import DeviceAlertSoundService from '@controleonline/ui-common/src/react/components/DeviceAlertSoundService';
import PrintService from '@controleonline/ui-common/src/react/components/PrintService';
import RemoteCheckoutService from '@controleonline/ui-common/src/react/components/RemoteCheckoutService';
import ProductCatalogCacheService from '@controleonline/ui-common/src/react/components/ProductCatalogCacheService';
import {api} from '@controleonline/ui-common/src/api';
import {env as APP_ENV} from '@env';
import {
  applyPaletteToRuntimeColors,
  applyThemeCssVariables,
  resolveThemePalette,
} from '@controleonline/../../src/styles/branding';
import {resolveAppDomain} from '@controleonline/ui-common/src/utils/appDomain';
import {colors as runtimeColors} from '@controleonline/../../src/styles/colors';
import {
  buildScreenMetrics,
  hasScreenMetricsChanges,
} from '@controleonline/ui-common/src/react/utils/screenMetrics';
import {
  buildDefaultDeviceConfigs,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import packageJson from '@package';

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

export const DefaultProvider = ({children, onBootstrapReady}) => {
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
  const {isLogged} = authGetters;
  const hasCurrentCompany =
    !!currentCompany && Object.entries(currentCompany).length > 0;
  const [translateReady, setTranslateReady] = useState(false);
  const [deviceConfigFetched, setDeviceConfigFetched] = useState(false);
  const [mainConfigsDiscovered, setMainConfigsDiscovered] = useState(false);
  const [deviceDefaultsInitialized, setDeviceDefaultsInitialized] =
    useState(false);
  const [, setTranslateVersion] = useState(0);
  const [baseThemeColors, setBaseThemeColors] = useState({});
  const [device, setDevice] = useState(
    JSON.parse(localStorage.getItem('device') || '{}'),
  );
  const packageVersion = packageJson?.version || packageJson?.default?.version;
  const appVersion = packageVersion || device?.appVersion;

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
      ld = {
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
      };
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
    if (currentCompany && currentCompany.id) {
      printerActions.getPrinters({people: currentCompany.id});
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    if (
      companyConfigs &&
      device_config?.configs &&
      Object.entries(device_config.configs).length > 0 &&
      device_config.configs['pos-gateway']
    ) {
      let wallets = [];

      if (
        companyConfigs[
          'pos-' + device_config.configs['pos-gateway'] + '-wallet'
        ]
      ) {
        wallets.push(
          companyConfigs[
            'pos-' + device_config.configs['pos-gateway'] + '-wallet'
          ],
        );
      }

      if (companyConfigs['pos-cash-wallet']) {
        wallets.push(companyConfigs['pos-cash-wallet']);
      }

      paymentTypeActions.getItems({
        people: '/people/' + currentCompany.id,
        wallet: wallets,
      });
    }
  }, [currentCompany?.id, companyConfigs, device_config?.configs]);

  useEffect(() => {
    if (
      device &&
      device.id &&
      isLogged &&
      currentCompany &&
      Object.entries(currentCompany).length > 0
    ) {
      setDeviceConfigFetched(false);
      setDeviceDefaultsInitialized(false);
      deviceConfigsActions
        .getItems({
          'device.device': device.id,
          people: '/people/' + currentCompany.id,
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
  }, [currentCompany?.id, isLogged, device?.id]);

  useEffect(() => {
    if (
      !deviceDefaultsInitialized ||
      !deviceConfigFetched ||
      !isLogged ||
      !currentCompany?.id ||
      !device?.id
    ) {
      return;
    }

    const nextMetrics = buildScreenMetrics();

    const currentConfigs = device_config?.configs || {};
    const hasChanges = hasScreenMetricsChanges(currentConfigs, nextMetrics);

    if (!hasChanges) {
      return;
    }

    deviceConfigsActions.addDeviceConfigs({
      configs: JSON.stringify({
        ...currentConfigs,
        ...nextMetrics,
      }),
      people: '/people/' + currentCompany.id,
    });
  }, [
    deviceDefaultsInitialized,
    deviceConfigFetched,
    isLogged,
    currentCompany?.id,
    device?.id,
    device_config?.configs,
    deviceConfigsActions,
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
      !deviceConfigFetched ||
      !isLogged ||
      !currentCompany?.id ||
      !device?.id ||
      deviceDefaultsInitialized
    ) {
      return;
    }

    const {nextConfigs, needsUpdate} = buildDefaultDeviceConfigs({
      configs: device_config?.configs,
      appVersion,
      deviceInfo: device,
    });

    if (!needsUpdate) {
      setDeviceDefaultsInitialized(true);
      return;
    }

    deviceConfigsActions
      .addDeviceConfigs({
        configs: JSON.stringify(nextConfigs),
        people: '/people/' + currentCompany.id,
      })
      .catch(() => {})
      .finally(() => {
        setDeviceDefaultsInitialized(true);
      });
  }, [
    appVersion,
    currentCompany?.id,
    device?.id,
    device?.manufacturer,
    device?.isEmulator,
    deviceConfigFetched,
    deviceDefaultsInitialized,
    deviceConfigsActions,
    device_config?.configs,
    isLogged,
  ]);

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
      isLogged &&
      currentCompany &&
      Object.entries(currentCompany).length > 0 &&
      deviceConfigFetched
    ) {
      const currentConfig = JSON.parse(localStorage.getItem('config') || '{}');
      const sessionData = JSON.parse(localStorage.getItem('session') || '{}');
      const configuredLanguage =
        currentConfig?.language ||
        sessionData?.language ||
        'pt-BR';

      if (currentConfig.language !== configuredLanguage) {
        const nextConfig = {...currentConfig, language: configuredLanguage};
        localStorage.setItem(
          'config',
          JSON.stringify(nextConfig),
        );
      }

      global.t = new Translate(
        companies,
        defaultCompany,
        currentCompany,
        Object.keys(stores),
        translateActions,
      );

      global.t.discoveryAll().then(() => {
        setTranslateReady(true);
      });
    }
  }, [currentCompany, defaultCompany, deviceConfigFetched, isLogged]);


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
      } catch (error) {
        setBaseThemeColors({});
      }
    };

    if (device?.id) {
      fetchColors();
    }
  }, [actions, currentCompany?.id, defaultCompany?.id, device?.id]);

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
  if (!translateReady && isLogged && hasCurrentCompany) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#1B5587" />
        <Text style={{marginTop: 10}}>Carregando...</Text>
      </View>
    );
  }
  return (
    device &&
    device.id && (
      <ThemeContext.Provider value={{colors, menus}}>
        {children}
        <WebsocketListener />
        <DeviceAlertSoundService />
        <ProductCatalogCacheService />
        <RemoteCheckoutService />
        <PrintService />
      </ThemeContext.Provider>
    )
  );
};

export const useTheme = () => useContext(ThemeContext);
