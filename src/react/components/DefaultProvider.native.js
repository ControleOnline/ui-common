import {useNativeTranslationRefresh, useNativeTranslationReset, useNativeAppLifecycle, useNativeNativeVersion, useNativeNativeDeviceIdentity, useNativeMainCompany, useNativeDeviceConfigReset, useNativeDeviceRegistration, useNativePrinters, useNativePaymentTypes, useNativeDeviceConfigFetch} from './DefaultProvider.native.lifecycle';
import {useNativeDeviceConfigSync, useNativeMainConfigReset, useNativeMainConfigDiscovery, useNativeMainConfigSeed, useNativeTranslationBootstrap, useNativeBootstrapReady, useNativeCompanies, useNativeMenus, useNativeThemeFetch, useNativeThemePalette} from './DefaultProvider.native.configuration';
import {resolveDomainThemeColors} from './resolveDomainThemeColors';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {View, AppState, Platform, useWindowDimensions} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Translate from '@controleonline/ui-common/src/utils/translate';
import {WebsocketListener} from '@controleonline/ui-common/src/react/components/WebsocketListener';
import BackgroundRuntimeBridge from '@controleonline/ui-common/src/react/components/BackgroundRuntimeBridge';
import DeviceAlertSoundService from '@controleonline/ui-common/src/react/components/DeviceAlertSoundService';
import KioskModeBridge from '@controleonline/ui-common/src/react/components/KioskModeBridge';
import LauncherModeBridge from '@controleonline/ui-common/src/react/components/LauncherModeBridge';
import DeliveryPushBridge from '@controleonline/ui-common/src/react/components/DeliveryPushBridge';
import ManagerPushBridge from '@controleonline/ui-common/src/react/components/ManagerPushBridge';
import PrintService from '@controleonline/ui-common/src/react/components/PrintService';
import RemoteCheckoutService from '@controleonline/ui-common/src/react/components/RemoteCheckoutService';
import ProductCatalogCacheService from '@controleonline/ui-common/src/react/components/ProductCatalogCacheService';
import RuntimeInfoFooter from '@controleonline/ui-common/src/react/components/RuntimeInfoFooter';
import {isPublicRoute} from '../router/publicRoutes';
import {api} from '@controleonline/ui-common/src/api';
import {app_type} from '@appType';
import {env as APP_ENV} from '@env';
const {
  buildTranslationBootstrapKey,
  isTranslationBootstrapReady,
  resolveConfiguredLanguage,
} = require('../utils/runtimeLanguage');
import {
  applyPaletteToRuntimeColors,
  applyThemeCssVariables,
  resolveThemePalette,
} from '@controleonline/../../src/styles/branding';
import {colors as runtimeColors} from '@controleonline/../../src/styles/colors';
import {
  buildDefaultDeviceConfigs,
  buildProviderManagedDeviceConfigs,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {canAdministerCompany} from '@controleonline/ui-common/src/react/utils/companyAuthority';
import {
  buildDeviceRegistrationPayload,
  buildLocalRuntimeDevice,
  hasDeviceRecordChanges,
  resolveOperationalDeviceType,
} from '@controleonline/ui-common/src/react/utils/deviceRuntime';
import {
  filterWalletPaymentTypesByAllowedIds,
  getPaymentGateway,
  resolveDevicePaymentTypeIds,
  selectPosWalletPaymentTypes,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {
  normalizeRuntimeMenuResponse,
} from '@controleonline/ui-common/src/react/utils/runtimeMenu';
import {
  buildRuntimeZoomStyle,
} from '@controleonline/ui-common/src/react/utils/runtimeZoom';
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
export const DefaultProvider = ({
  children,
  currentRouteName = '',
  onBootstrapReady,
}) => {
  const appType = String(app_type || '').toUpperCase();
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
  const {currentCompany, mainCompany, companies} = peopleGetters;
  const {item: device_config} = deviceConfigsGetters;
  const {isLogged, sessionChecked, user} = authGetters;
  const hasCurrentCompany =
    !!currentCompany && Object.entries(currentCompany).length > 0;
  const [translateReady, setTranslateReady] = useState(false);
  const [activeTranslateBootstrapKey, setActiveTranslateBootstrapKey] =
    useState('');
  const [deviceConfigFetched, setDeviceConfigFetched] = useState(false);
  const [mainConfigsDiscovered, setMainConfigsDiscovered] = useState(false);
  const [deviceRuntimeConfigSynced, setDeviceRuntimeConfigSynced] =
    useState(false);
  const [appState, setAppState] = useState(AppState.currentState || 'active');
  const [, setTranslateVersion] = useState(0);
  const [baseThemeColors, setBaseThemeColors] = useState({});
  const [bottomNavigationCount, setBottomNavigationCount] = useState(0);
  const translateBootstrapKeyRef = useRef('');
  const lastDeviceConfigPeopleIriRef = useRef('');
  const [device, setDevice] = useState(
    JSON.parse(localStorage.getItem('device') || '{}'),
  );
  const packageVersion = packageJson?.version || packageJson?.default?.version;
  const appVersion = packageVersion || device?.appVersion;
  const runtimeDeviceType = resolveOperationalDeviceType({
    appType: app_type,
    deviceInfo: device || {},
  });
  const {width: windowWidth, height: windowHeight} = useWindowDimensions();
  const runtimeUiScaleStyle = useMemo(
    () =>
      buildRuntimeZoomStyle(APP_ENV?.ZOOM, {
        viewport: {width: windowWidth, height: windowHeight},
      }),
    [windowHeight, windowWidth],
  );
  const deviceConfigPeopleIri = resolveDeviceConfigPeopleIri({
    appType,
    currentCompany,
    user,
  });
  const isPublicRouteActive = isPublicRoute(currentRouteName);
  const currentTranslationConfig = JSON.parse(
    localStorage.getItem('config') || '{}',
  );
  const currentTranslationSession = JSON.parse(
    localStorage.getItem('session') || '{}',
  );
  const configuredTranslationLanguage = resolveConfiguredLanguage({
    currentCompany,
    mainCompany,
    currentConfig: currentTranslationConfig,
    sessionData: currentTranslationSession,
  });
  const expectedTranslateBootstrapKey = isLogged && hasCurrentCompany
    ? buildTranslationBootstrapKey({
        language: configuredTranslationLanguage,
        currentCompanyId: normalizeEntityId(currentCompany?.id),
        mainCompanyId: normalizeEntityId(mainCompany?.id),
      })
    : '';
  const requiresTranslateBootstrap = Boolean(
    isLogged &&
      hasCurrentCompany &&
      currentRouteName &&
      !isPublicRouteActive,
  );
  const isTranslateBootstrapReady = isTranslationBootstrapReady({
    activeKey: activeTranslateBootstrapKey,
    expectedKey: expectedTranslateBootstrapKey,
    required: requiresTranslateBootstrap,
    ready: translateReady,
    translator: global.t,
  });
  const shouldRunForegroundRealtimeServices =
    Platform.OS !== 'android' || appState === 'active';
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
            mainCompany,
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
      mainCompany,
      device,
      isShopClientApp,
      menus,
      registerBottomNavigation,
    ],
  );
  const runtimeBridges = (
    <>
      <LauncherModeBridge appState={appState} />
      <KioskModeBridge appState={appState} />
      <BackgroundRuntimeBridge appState={appState} />
      <DeliveryPushBridge device={device} setDevice={setDevice} />
      <ManagerPushBridge device={device} setDevice={setDevice} />
    </>
  );

  useNativeTranslationRefresh({setTranslateVersion});

  useNativeTranslationReset({isLogged, isPublicRouteActive, setTranslateReady, setActiveTranslateBootstrapKey, translateBootstrapKeyRef, translateActions});

  useNativeAppLifecycle({AppState, setAppState});

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
        appType: app_type,
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
  useNativeNativeVersion({DeviceInfo, device, fetchDeviceId});

  useNativeNativeDeviceIdentity({device, fetchDeviceId, deviceActions});

  useNativeMainCompany({device, peopleActions});

  useNativeDeviceConfigReset({deviceConfigPeopleIri, lastDeviceConfigPeopleIriRef, setDeviceConfigFetched, setDeviceRuntimeConfigSynced, deviceConfigsActions});

  useNativeDeviceRegistration({sessionChecked, isLogged, deviceConfigPeopleIri, device, deviceConfigFetched, currentCompany, canAdministerCompany, mainCompany, user, deviceActions, runtimeDeviceType, buildDeviceRegistrationPayload, app_type, hasDeviceRecordChanges, setDevice});

  useNativePrinters({isShopClientApp, sessionChecked, isLogged, currentCompany, printerActions});

  useNativePaymentTypes({isShopClientApp, companyConfigs, currentCompany, device_config, paymentTypeActions, mainConfigsDiscovered, api, selectPosWalletPaymentTypes, getPaymentGateway});

  useNativeDeviceConfigFetch({device, isLogged, currentCompany, setDeviceConfigFetched, setDeviceRuntimeConfigSynced, deviceConfigsActions, runtimeDeviceType, parseConfigsObject});

  useNativeDeviceConfigSync({deviceConfigFetched, isLogged, deviceConfigPeopleIri, device, deviceRuntimeConfigSynced, runtimeDeviceType, device_config, buildDefaultDeviceConfigs, buildProviderManagedDeviceConfigs, appVersion, setDeviceRuntimeConfigSynced, deviceConfigsActions, user});

  useNativeMainConfigReset({isLogged, currentCompany, device, setMainConfigsDiscovered});

  useNativeMainConfigDiscovery({isLogged, currentCompany, device, mainConfigsDiscovered, configActions, setMainConfigsDiscovered});

  useNativeMainConfigSeed({isLogged, currentCompany, mainConfigsDiscovered, configActions});

  useNativeTranslationBootstrap({currentRouteName, isPublicRouteActive, isLogged, hasCurrentCompany, deviceConfigFetched, expectedTranslateBootstrapKey, translateBootstrapKeyRef, companies, currentCompany, mainCompany, setActiveTranslateBootstrapKey, setTranslateReady, configuredTranslationLanguage, Translate, stores, translateStore});


  useNativeBootstrapReady({isLogged, hasCurrentCompany, currentRouteName, isTranslateBootstrapReady, onBootstrapReady});


  useNativeCompanies({device, isLogged, peopleActions});

  useNativeMenus({isLogged, currentCompany, actions, api, appType, normalizeRuntimeMenuResponse});

  useNativeThemeFetch({api, parseThemeCss, setBaseThemeColors, actions, device, currentCompany, mainCompany});

  useNativeThemePalette({resolveDomainThemeColors, baseThemeColors, mainCompany, resolveThemePalette, runtimeColors, applyPaletteToRuntimeColors, applyThemeCssVariables, actions, currentCompany});

  if (requiresTranslateBootstrap && !isTranslateBootstrapReady) {
    return <View style={providerStyles.loadingContainer} />;
  }

  return (
    <>
      {runtimeBridges}
      {device &&
        device.id && (
          <ThemeContext.Provider value={themeContextValue}>
            <View
              style={[
                providerStyles.shell,
                {
                  backgroundColor: colors?.background || runtimeColors.background,
                },
              ]}>
              <View style={[providerStyles.content, runtimeUiScaleStyle]}>{children}</View>
              {!isShopClientApp && bottomNavigationCount === 0 && (
                <RuntimeInfoFooter
                  appVersion={appVersion}
                  mainCompany={mainCompany}
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
