import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import Translate from '@controleonline/ui-common/src/utils/translate';
import { WebsocketListener } from '@controleonline/ui-common/src/react/components/WebsocketListener';
import PrintService from '@controleonline/ui-common/src/react/components/PrintService';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import { env as APP_ENV } from '@env';
import {
  applyPaletteToRuntimeColors,
  applyThemeCssVariables,
  resolveThemePalette,
} from '@controleonline/../../src/styles/branding';
import { resolveAppDomain } from '@controleonline/ui-common/src/utils/appDomain';
import { colors as runtimeColors } from '@controleonline/../../src/styles/colors';
import {
  buildScreenMetrics,
  hasScreenMetricsChanges,
} from '@controleonline/ui-common/src/react/utils/screenMetrics';
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

export const DefaultProvider = ({ children, onBootstrapReady }) => {
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
  const { isLogged } = authGetters;
  const hasCurrentCompany =
    !!currentCompany && Object.entries(currentCompany).length > 0;

  const [translateReady, setTranslateReady] = useState(false);
  const [deviceConfigFetched, setDeviceConfigFetched] = useState(false);
  const [, setTranslateVersion] = useState(0);
  const [baseThemeColors, setBaseThemeColors] = useState({});
  const [device, setDevice] = useState(
    JSON.parse(localStorage.getItem('device') || '{}'),
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

  const fetchPublicIP = async () => {
    try {
      const res = await fetch('https://api64.ipify.org?format=json');
      const data = await res.json();
      return data.ip || 'unknow';
    } catch (e) {
      return 'unknow';
    }
  };

  const fetchDeviceId = async () => {
    const ip = await fetchPublicIP();

    let appVersion = null;
    let appName = 'Web App';
    try {
      const response = await fetch('/package.json');
      if (response.ok) {
        const packageJsonData = await response.json();
        appVersion = packageJsonData.version;
        appName = packageJsonData.displayName || packageJsonData.name || appName;
      }
    } catch (e) {
      console.warn('Não foi possível carregar package.json:', e);
    }

    const ld = {
      id: ip,
      appName: appName,
      deviceType: 'web',
      systemName: 'web',
      systemVersion: 'unknow',
      manufacturer: 'unknow',
      model: 'unknow',
      batteryLevel: 'unknow',
      isEmulator: 'unknow',
      appVersion: appVersion,
      buildNumber: appVersion,
    };


    setDevice(ld);
    localStorage.setItem('device', JSON.stringify(ld));
  };

  useEffect(() => {
    if (!device || !device.id || !device.appName) {
      fetchDeviceId();
    } else {
      deviceActions.setItem(device);
    }
  }, [device]);

  useEffect(() => {
    if (device && device.id) {
      peopleActions.defaultCompany();
    }
  }, [device]);

  useEffect(() => {
    if (currentCompany && currentCompany.id) {
      printerActions.getPrinters({ people: currentCompany.id });
    }
  }, [currentCompany]);

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
  }, [currentCompany, companyConfigs, device_config]);

  useEffect(() => {
    if (
      device &&
      device.id &&
      isLogged &&
      currentCompany &&
      Object.entries(currentCompany).length > 0
    ) {
      setDeviceConfigFetched(false);
      deviceConfigsActions
        .getItems({
          'device.device': device.id,
          people: '/people/' + currentCompany.id,
        })
        .then(data => {
          if (data && data.length > 0) {
            let d = { ...data[0] };
            d.configs = JSON.parse(d.configs);
            deviceConfigsActions.setItem(d);
          }
        })
        .catch(() => { })
        .finally(() => {
          setDeviceConfigFetched(true);
        });
    }
  }, [currentCompany, isLogged, device]);

  useEffect(() => {
    if (
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
  }, [deviceConfigFetched, isLogged, currentCompany, device, device_config, deviceConfigsActions]);

  useEffect(() => {
    if (
      isLogged &&
      currentCompany &&
      Object.entries(currentCompany).length > 0
    ) {
      configActions.setItems(currentCompany.configs);
    }
  }, [currentCompany, isLogged]);

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
        const nextConfig = { ...currentConfig, language: configuredLanguage };
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
    if (device && device.id && isLogged) {
      peopleActions.myCompanies();
    }
  }, [isLogged, device]);

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1B5587" />
        <Text style={{ marginTop: 10 }}>Carregando...</Text>
      </View>
    );
  }

  return (
    device &&
    device.id && (
      <ThemeContext.Provider value={{ colors, menus }}>
        {children}
        <WebsocketListener />
        <PrintService />
      </ThemeContext.Provider>
    )
  );
};

export const useTheme = () => useContext(ThemeContext);
