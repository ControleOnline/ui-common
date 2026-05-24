import React, {useEffect, useMemo, useRef} from 'react';
import {NativeModules} from 'react-native';
import {env as APP_ENV} from '@env';
import {useStore} from '@store';
import DeviceInfo from 'react-native-device-info';
import {resolveAppDomain} from '@controleonline/ui-common/src/utils/appDomain';
import {isWebRuntimeDevice} from '@controleonline/ui-common/src/react/utils/deviceRuntime';
import {normalizeDeviceId} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {
  DEVICE_ALERT_SOUND_ENABLED_KEY,
  DEVICE_ALERT_SOUND_URL_KEY,
  DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY,
  isTruthyValue,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  isManagerAppType,
  resolveManagerOrderNotificationPreferences,
} from '@controleonline/ui-common/src/react/utils/managerOrderNotifications';
import {syncBackgroundRuntimeRegistration} from '@controleonline/ui-common/src/react/utils/backgroundRuntimeRegistration';
import {
  DEFAULT_NETWORK_PRINTER_PORT,
  DISPLAY_DEVICE_TYPE,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  PDV_DEVICE_TYPE,
  getManagedPrinterDevices,
  getPrinterHost,
  normalizeDeviceType,
  normalizePrinterPort,
} from '@controleonline/ui-common/src/react/utils/printerDevices';

const backgroundRuntimeModule = NativeModules?.BackgroundRuntime;

const safeTrim = value => String(value || '').trim();
const readSessionToken = () => {
  try {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    return safeTrim(session?.token || session?.api_key);
  } catch {
    return '';
  }
};

const BackgroundRuntimeBridge = () => {
  const authStore = useStore('auth');
  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const deviceConfigStore = useStore('device_config');

  const {isLogged, user} = authStore.getters;
  const {currentCompany} = peopleStore.getters;
  const {item: runtimeDevice} = deviceStore.getters;
  const {
    item: runtimeDeviceConfig,
    items: companyDeviceConfigs = [],
  } = deviceConfigStore.getters;

  const lastRegistrationIdRef = useRef('');
  const lastRegistrationPayloadRef = useRef('');

  const bundleId = safeTrim(DeviceInfo.getBundleId());
  const runtimeAppKey =
    bundleId || safeTrim(APP_ENV.APP_TYPE).toUpperCase() || 'app';
  const runtimeDeviceId = normalizeDeviceId(runtimeDevice?.id);
  const runtimeDeviceType = normalizeDeviceType(
    runtimeDeviceConfig?.type ||
      runtimeDeviceConfig?.device?.type ||
      runtimeDevice?.type,
  );
  const currentCompanyId = safeTrim(currentCompany?.id);
  const sessionToken = readSessionToken();
  const isManagerRuntime = isManagerAppType(APP_ENV?.APP_TYPE);
  const managerOrderNotificationPreferences =
    resolveManagerOrderNotificationPreferences(user);
  const userAlertSoundUrl = safeTrim(
    managerOrderNotificationPreferences.soundUrl,
  );
  const userAlertSoundEnabled =
    isManagerRuntime &&
    managerOrderNotificationPreferences.pushEnabled &&
    managerOrderNotificationPreferences.soundEnabled;
  const runtimeDeviceConfigs = parseConfigsObject(runtimeDeviceConfig?.configs);
  const deviceAlertSoundEnabled = isTruthyValue(
    runtimeDeviceConfigs?.[DEVICE_ALERT_SOUND_ENABLED_KEY],
  );
  const deviceAlertSoundUrl = safeTrim(
    runtimeDeviceConfigs?.[DEVICE_ALERT_SOUND_URL_KEY],
  );
  const runtimeDebugInfoEnabled = isTruthyValue(
    runtimeDeviceConfigs?.[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY],
  );
  const alertSoundEnabled = userAlertSoundEnabled || deviceAlertSoundEnabled;
  const alertSoundUrl = userAlertSoundEnabled
    ? userAlertSoundUrl
    : deviceAlertSoundUrl;

  const managedPrinters = useMemo(
    () =>
      getManagedPrinterDevices({
        deviceConfigs: companyDeviceConfigs,
        companyId: currentCompanyId,
        managerDeviceId: runtimeDeviceId,
      })
        .map(printer => {
          const host = safeTrim(getPrinterHost(printer));
          const port = normalizePrinterPort(
            printer?.configs?.[NETWORK_PRINTER_PORT_CONFIG_KEY] ||
              DEFAULT_NETWORK_PRINTER_PORT,
          );
          const deviceId = normalizeDeviceId(printer?.device);

          if (!host || !deviceId) {
            return null;
          }

          return {
            deviceId,
            host,
            port,
          };
        })
        .filter(Boolean),
    [companyDeviceConfigs, currentCompanyId, runtimeDeviceId],
  );

  const spoolDeviceIds = useMemo(() => {
    if (!runtimeDeviceId || isWebRuntimeDevice(runtimeDevice)) {
      return [];
    }

    if (runtimeDeviceType === PDV_DEVICE_TYPE) {
      return Array.from(
        new Set([
          runtimeDeviceId,
          ...managedPrinters.map(printer => normalizeDeviceId(printer?.deviceId)),
        ].filter(Boolean)),
      );
    }

    if (runtimeDeviceType === DISPLAY_DEVICE_TYPE) {
      return Array.from(
        new Set(
          managedPrinters
            .map(printer => normalizeDeviceId(printer?.deviceId))
            .filter(Boolean),
        ),
      );
    }

    return [];
  }, [managedPrinters, runtimeDevice, runtimeDeviceId, runtimeDeviceType]);

  const registration = useMemo(() => {
    if (!isLogged || !sessionToken || !runtimeDeviceId || !currentCompanyId) {
      return null;
    }

    return {
      registrationId: `${runtimeAppKey}::${runtimeDeviceId}::${currentCompanyId}`,
      packageName: runtimeAppKey,
      companyAlias: safeTrim(currentCompany?.alias || currentCompany?.name),
      companyId: currentCompanyId,
      appDomain: safeTrim(resolveAppDomain(APP_ENV.DOMAIN)),
      appType: safeTrim(APP_ENV.APP_TYPE).toUpperCase(),
      backgroundEnabled: true,
      deviceId: runtimeDeviceId,
      deviceType: runtimeDeviceType,
      notificationEnabled: !isManagerRuntime,
      alertSoundEnabled,
      alertSoundUrl,
      deviceAlertSoundEnabled,
      deviceAlertSoundUrl,
      userAlertSoundEnabled,
      userAlertSoundUrl,
      runtimeDebugInfoEnabled,
      printEnabled: spoolDeviceIds.length > 0 && managedPrinters.length > 0,
      managedPrinters,
      socketUrl: safeTrim(APP_ENV.SOCKET),
      spoolDeviceIds,
      token: sessionToken,
      apiBaseUrl: safeTrim(APP_ENV.API_ENTRYPOINT),
    };
  }, [
    currentCompany?.alias,
    currentCompany?.name,
    currentCompanyId,
    alertSoundEnabled,
    alertSoundUrl,
    deviceAlertSoundEnabled,
    deviceAlertSoundUrl,
    runtimeAppKey,
    isLogged,
    isManagerRuntime,
    managedPrinters,
    runtimeDeviceId,
    runtimeDeviceType,
    sessionToken,
    spoolDeviceIds,
    userAlertSoundEnabled,
    userAlertSoundUrl,
    runtimeDebugInfoEnabled,
  ]);

  useEffect(() => {
    syncBackgroundRuntimeRegistration({
      backgroundRuntimeModule,
      registration,
      lastRegistrationIdRef,
      lastRegistrationPayloadRef,
    });
    // Keep the registration alive after this component unmounts.
    // Explicit logout/device changes are handled by the branches above.
  }, [registration]);

  return null;
};

export default BackgroundRuntimeBridge;
