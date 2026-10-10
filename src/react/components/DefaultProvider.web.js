import {useWebTranslationRefresh, useWebTranslationReset, useWebDeviceConfigReset, useWebRuntimeIp, useWebWebDeviceIdentity, useWebMainCompany, useWebDeviceRegistration, useWebPrinters, useWebPaymentTypes} from './DefaultProvider.web.lifecycle';
import {useWebDeviceConfigFetch, useWebDeviceConfigSync, useWebMainConfigReset, useWebMainConfigDiscovery, useWebMainConfigSeed, useWebTranslationBootstrap, useWebBootstrapReady, useWebCompanies, useWebMenus, useWebThemeFetch, useWebThemePalette} from './DefaultProvider.web.configuration';
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
import { View } from 'react-native';
import Translate from '@controleonline/ui-common/src/utils/translate';
import { WebsocketListener } from '@controleonline/ui-common/src/react/components/WebsocketListener';
import DeviceAlertSoundService from '@controleonline/ui-common/src/react/components/DeviceAlertSoundService';
import PrintService from '@controleonline/ui-common/src/react/components/PrintService';
import RemoteCheckoutService from '@controleonline/ui-common/src/react/components/RemoteCheckoutService';
import ProductCatalogCacheService from '@controleonline/ui-common/src/react/components/ProductCatalogCacheService';
import RuntimeInfoFooter from '@controleonline/ui-common/src/react/components/RuntimeInfoFooter';
import {shouldShowRuntimeFooter} from '@controleonline/ui-common/src/react/utils/runtimeFooter';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import {app_type} from '@appType';
import {env as APP_ENV} from '@env';
import { isPublicRoute } from '../router/publicRoutes';
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
import { colors as runtimeColors } from '@controleonline/../../src/styles/colors';
import {
  buildDefaultDeviceConfigs,
  buildProviderManagedDeviceConfigs,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {canAdministerCompany} from '@controleonline/ui-common/src/react/utils/companyAuthority';
import {
  buildDeviceRegistrationPayload,
  buildLocalRuntimeDevice,
  getOrCreateWebDeviceInstanceId,
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

  const { items: companyConfigs } = configsGetters;
  const { colors, menus } = getters;
  const { currentCompany, mainCompany, companies } = peopleGetters;
  const { item: device_config } = deviceConfigsGetters;
  const { isLogged, user } = authGetters;
  const hasCurrentCompany =
    !!currentCompany && Object.entries(currentCompany).length > 0;

  const [translateReady, setTranslateReady] = useState(false);
  const [activeTranslateBootstrapKey, setActiveTranslateBootstrapKey] =
    useState('');
  const [deviceConfigFetched, setDeviceConfigFetched] = useState(false);
  const [mainConfigsDiscovered, setMainConfigsDiscovered] = useState(false);
  const [deviceRuntimeConfigSynced, setDeviceRuntimeConfigSynced] =
    useState(false);
  const [, setTranslateVersion] = useState(0);
  const [baseThemeColors, setBaseThemeColors] = useState({});
  const [bottomNavigationCount, setBottomNavigationCount] = useState(0);
  const translateBootstrapKeyRef = useRef('');
  const lastDeviceConfigPeopleIriRef = useRef('');
  const walletPaymentTypeRequestRef = useRef({key: '', promise: null});
  const walletPaymentTypeLoadedKeyRef = useRef('');
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
    appType: app_type,
    deviceInfo: device || {},
  });
  const runtimeUiScaleStyle = useMemo(
    () => buildRuntimeZoomStyle(APP_ENV?.ZOOM, {isWeb: true}),
    [],
  );
  const deviceConfigPeopleIri = resolveDeviceConfigPeopleIri({
    appType,
    currentCompany,
    user,
  });
  const isPublicRouteActive = isPublicRoute(currentRouteName);
  const showRuntimeFooter = shouldShowRuntimeFooter(currentRouteName);
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

  useWebTranslationRefresh({setTranslateVersion});

  useWebTranslationReset({isLogged, isPublicRouteActive, setTranslateReady, setActiveTranslateBootstrapKey, translateBootstrapKeyRef, translateActions});

  useWebDeviceConfigReset({deviceConfigPeopleIri, lastDeviceConfigPeopleIriRef, setDeviceConfigFetched, setDeviceRuntimeConfigSynced, deviceConfigsActions});

  useWebRuntimeIp({isLogged, api, getRuntimeIpFromResponse, setWebRuntimeIp, user});

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
      appType: app_type,
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

  // Sync web device identity once per signature. Calling setItem on every
  // effect pass (even when unchanged) re-entered the store after logout→login
  // and produced React #185 (app-community#827).
  const lastWebDeviceSyncRef = useRef('');
  useWebWebDeviceIdentity({isLogged, isShopClientApp, buildWebDevice, lastWebDeviceSyncRef, setDevice, deviceActions, packageVersion, user, webRuntimeIp});

  useWebMainCompany({isShopClientApp, device, peopleActions});

  useWebDeviceRegistration({isLogged, device, currentCompany, canAdministerCompany, mainCompany, user, deviceActions, buildDeviceRegistrationPayload, app_type, hasDeviceRecordChanges, runtimeDeviceType, setDevice});

  useWebPrinters({isShopClientApp, isLogged, currentCompany, printerActions});

  useWebPaymentTypes({isShopClientApp, companyConfigs, currentCompany, device_config, walletPaymentTypeRequestRef, walletPaymentTypeLoadedKeyRef, paymentTypeActions, mainConfigsDiscovered, resolveDevicePaymentTypeIds, api, selectPosWalletPaymentTypes, getPaymentGateway});

  useWebDeviceConfigFetch({device, isLogged, deviceConfigPeopleIri, setDeviceConfigFetched, setDeviceRuntimeConfigSynced, deviceConfigsActions, runtimeDeviceType, selectRuntimeDeviceConfig, parseConfigsObject});

  useWebDeviceConfigSync({deviceConfigFetched, isLogged, deviceConfigPeopleIri, device, deviceRuntimeConfigSynced, runtimeDeviceType, device_config, buildDefaultDeviceConfigs, buildProviderManagedDeviceConfigs, appVersion, setDeviceRuntimeConfigSynced, deviceConfigsActions, user});

  useWebMainConfigReset({isLogged, currentCompany, device, setMainConfigsDiscovered});

  useWebMainConfigDiscovery({isLogged, currentCompany, device, mainConfigsDiscovered, configActions, setMainConfigsDiscovered});

  useWebMainConfigSeed({isLogged, currentCompany, mainConfigsDiscovered, configActions});

  useWebTranslationBootstrap({currentRouteName, isPublicRouteActive, isLogged, hasCurrentCompany, deviceConfigFetched, expectedTranslateBootstrapKey, translateBootstrapKeyRef, companies, currentCompany, mainCompany, setActiveTranslateBootstrapKey, setTranslateReady, configuredTranslationLanguage, Translate, stores, translateStore});

  useWebBootstrapReady({isLogged, hasCurrentCompany, currentRouteName, isTranslateBootstrapReady, onBootstrapReady});

  useWebCompanies({device, isLogged, peopleActions});

  useWebMenus({isLogged, currentCompany, actions, api, appType, normalizeRuntimeMenuResponse});

  useWebThemeFetch({api, parseThemeCss, setBaseThemeColors, actions, currentCompany, mainCompany, device});

  useWebThemePalette({resolveDomainThemeColors, baseThemeColors, mainCompany, resolveThemePalette, runtimeColors, applyPaletteToRuntimeColors, applyThemeCssVariables, actions, currentCompany, isShopClientApp});

  if (requiresTranslateBootstrap && !isTranslateBootstrapReady) {
    return <View style={providerStyles.loadingContainer} />;
  }

  return (
      <ThemeContext.Provider value={themeContextValue}>
        <View
          style={[
            providerStyles.shell,
            {
              backgroundColor: colors?.background || runtimeColors.background,
            },
          ]}>
          <View style={[providerStyles.content, runtimeUiScaleStyle]}>{children}</View>
              {!isShopClientApp && showRuntimeFooter && bottomNavigationCount === 0 && (
                <RuntimeInfoFooter
                  appVersion={appVersion}
                  mainCompany={mainCompany}
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
