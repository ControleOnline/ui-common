import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
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
import stores from '@stores';
import packageJson from '@package';
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

  const [translateReady, setTranslateReady] = useState(false);
  const [deviceConfigFetched, setDeviceConfigFetched] = useState(false);
  const [mainConfigsDiscovered, setMainConfigsDiscovered] = useState(false);
  const [deviceRuntimeConfigSynced, setDeviceRuntimeConfigSynced] =
    useState(false);
  const [, setTranslateVersion] = useState(0);
  const [baseThemeColors, setBaseThemeColors] = useState({});
  const [device, setDevice] = useState(
    JSON.parse(localStorage.getItem('device') || '{}'),
  );
  const packageVersion = packageJson?.version || packageJson?.default?.version;
  const appVersion = packageVersion || device?.appVersion;
  const runtimeDeviceType = resolveOperationalDeviceType({
    appType: APP_ENV.APP_TYPE,
    deviceInfo: device || {},
  });

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
      },
    });
  };

  useEffect(() => {
    if (!isLogged && (!device || !device.id)) {
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
  }, [device, deviceActions, isLogged, packageVersion, user?.id]);

  useEffect(() => {
    if (device && device.id) {
      peopleActions.defaultCompany();
    }
  }, [device?.id]);

  useEffect(() => {
    if (!isLogged || !device?.id) {
      return;
    }

    let cancelled = false;

    const syncDeviceRegistration = async () => {
      const items = await deviceActions.getItems({
        device: device.id,
        itemsPerPage: 1,
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
    device?.id,
    device?.manufacturer,
    device?.model,
    device?.systemVersion,
    isLogged,
    runtimeDeviceType,
  ]);

  useEffect(() => {
    if (currentCompany && currentCompany.id) {
      printerActions.getPrinters({ people: currentCompany.id });
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
      setDeviceRuntimeConfigSynced(false);
      deviceConfigsActions.setItem({});

      deviceConfigsActions
        .getItems({
          'device.device': device.id,
          people: '/people/' + currentCompany.id,
          type: runtimeDeviceType,
        })
        .then(data => {
          const selectedConfig = selectRuntimeDeviceConfig({
            items: data,
            deviceId: device.id,
            companyId: currentCompany.id,
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
        .catch(() => { })
        .finally(() => {
          setDeviceConfigFetched(true);
        });
    }
  }, [
    currentCompany?.id,
    device?.id,
    deviceConfigsActions,
    isLogged,
    runtimeDeviceType,
  ]);

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
      .catch(() => { })
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
    <ThemeContext.Provider value={{ colors, menus }}>
      <View
        style={[
          providerStyles.shell,
          {
            backgroundColor: colors?.background || runtimeColors.background,
          },
        ]}>
        <View style={providerStyles.content}>{children}</View>
        <RuntimeInfoFooter
          appVersion={appVersion}
          defaultCompany={defaultCompany}
          device={device}
          colors={colors}
        />
      </View>
      {device?.id && isLogged && (
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

const providerStyles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
});
