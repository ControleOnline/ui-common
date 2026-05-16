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
  isTruthyValue,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  isManagerAppType,
  resolveManagerOrderNotificationPreferences,
} from '@controleonline/ui-common/src/react/utils/managerOrderNotifications';
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

const serializeRegistration = registration => {
  try {
    return JSON.stringify(registration);
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
    managerOrderNotificationPreferences.soundEnabled &&
    !!userAlertSoundUrl;
  const runtimeDeviceConfigs = parseConfigsObject(runtimeDeviceConfig?.configs);
  const deviceAlertSoundEnabled = isTruthyValue(
    runtimeDeviceConfigs?.[DEVICE_ALERT_SOUND_ENABLED_KEY],
  );
  const deviceAlertSoundUrl = safeTrim(
    runtimeDeviceConfigs?.[DEVICE_ALERT_SOUND_URL_KEY],
  );
  const alertSoundEnabled =
    userAlertSoundEnabled ||
    (deviceAlertSoundEnabled && !!deviceAlertSoundUrl);
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
      notificationEnabled: true,
      alertSoundEnabled,
      alertSoundUrl,
      deviceAlertSoundEnabled,
      deviceAlertSoundUrl,
      userAlertSoundEnabled,
      userAlertSoundUrl,
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
    managedPrinters,
    runtimeDeviceId,
    runtimeDeviceType,
    sessionToken,
    spoolDeviceIds,
    userAlertSoundEnabled,
    userAlertSoundUrl,
  ]);

  useEffect(() => {
    if (!backgroundRuntimeModule) {
      return;
    }

    const nextRegistrationId = safeTrim(registration?.registrationId);
    const nextPayload = registration ? serializeRegistration(registration) : '';

    if (!nextRegistrationId || !nextPayload) {
      const previousRegistrationId = lastRegistrationIdRef.current;
      lastRegistrationPayloadRef.current = '';
      lastRegistrationIdRef.current = '';

      if (previousRegistrationId) {
        backgroundRuntimeModule.clearRegistration(previousRegistrationId).catch(
          () => {},
        );
      }
      return;
    }

    if (
      lastRegistrationIdRef.current === nextRegistrationId &&
      lastRegistrationPayloadRef.current === nextPayload
    ) {
      return;
    }

    const previousRegistrationId = lastRegistrationIdRef.current;
    if (
      previousRegistrationId &&
      previousRegistrationId !== nextRegistrationId
    ) {
      backgroundRuntimeModule.clearRegistration(previousRegistrationId).catch(
        () => {},
      );
    }

    lastRegistrationIdRef.current = nextRegistrationId;
    lastRegistrationPayloadRef.current = nextPayload;

    backgroundRuntimeModule.syncRegistration(nextPayload).catch(() => {});
  }, [registration]);

  return null;
};

export default BackgroundRuntimeBridge;
