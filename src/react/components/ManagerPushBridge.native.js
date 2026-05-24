import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import {env as APP_ENV} from '@env';
import {useStore} from '@store';
import {
  ensureManagerOrderNotificationPermission,
  isManagerAppType,
  resolveManagerOrderNotificationPreferences,
} from '@controleonline/ui-common/src/react/utils/managerOrderNotifications';
import {
  queueNotificationNavigation,
} from '@controleonline/ui-common/src/react/utils/notificationNavigation';

const normalizeText = value => String(value || '').trim();

const isPlainObject = value =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const extractOrderIdFromResponse = response => {
  const data = response?.notification?.request?.content?.data || {};
  const candidate =
    data?.orderId ||
    data?.order_id ||
    data?.order ||
    data?.id ||
    data?.orderDetailsId ||
    '';

  return normalizeText(candidate).replace(/\D+/g, '');
};

const extractManagerPushToken = metadata =>
  normalizeText(
    metadata?.pushTokens?.manager?.android?.deviceToken ||
      metadata?.push_tokens?.manager?.android?.deviceToken ||
      '',
  );

const resolvePersistableDeviceEntityId = deviceInfo =>
  normalizeText(deviceInfo?.entityId || deviceInfo?.apiId || deviceInfo?.['@id'])
    .replace(/\D+/g, '');

const mergeManagerPushTokenMetadata = (metadata, deviceToken) => {
  const normalizedMetadata = isPlainObject(metadata) ? metadata : {};
  const nextMetadata = {
    ...normalizedMetadata,
  };

  const pushTokens = isPlainObject(normalizedMetadata.pushTokens)
    ? {...normalizedMetadata.pushTokens}
    : {};
  const managerTokens = isPlainObject(pushTokens.manager)
    ? {...pushTokens.manager}
    : {};
  const androidTokens = isPlainObject(managerTokens.android)
    ? {...managerTokens.android}
    : {};

  if (normalizeText(deviceToken)) {
    androidTokens.deviceToken = normalizeText(deviceToken);
    managerTokens.android = androidTokens;
    pushTokens.manager = managerTokens;
    nextMetadata.pushTokens = pushTokens;
    return nextMetadata;
  }

  delete androidTokens.deviceToken;
  if (Object.keys(androidTokens).length > 0) {
    managerTokens.android = androidTokens;
  } else {
    delete managerTokens.android;
  }

  if (Object.keys(managerTokens).length > 0) {
    pushTokens.manager = managerTokens;
  } else {
    delete pushTokens.manager;
  }

  if (Object.keys(pushTokens).length > 0) {
    nextMetadata.pushTokens = pushTokens;
  } else {
    delete nextMetadata.pushTokens;
  }

  return nextMetadata;
};

const ManagerPushBridge = ({device, setDevice}) => {
  const authStore = useStore('auth');
  const deviceStore = useStore('device');

  const authGetters = authStore.getters;
  const deviceActions = deviceStore.actions;

  const {isLogged, sessionChecked, user} = authGetters;
  const isManagerRuntime = isManagerAppType(APP_ENV?.APP_TYPE);
  const pushPreferences = useMemo(
    () => resolveManagerOrderNotificationPreferences(user),
    [user],
  );
  const pushEnabled = isManagerRuntime && pushPreferences.pushEnabled;

  const currentDeviceRef = useRef(device || {});
  const pushTokenListenerRef = useRef(null);
  const notificationResponseListenerRef = useRef(null);

  const persistLocalDevice = useCallback(
    nextDevice => {
      if (!nextDevice?.id) {
        return;
      }

      const currentSerializedDevice = JSON.stringify(
        currentDeviceRef.current || {},
      );
      const nextSerializedDevice = JSON.stringify(nextDevice || {});
      if (currentSerializedDevice === nextSerializedDevice) {
        return;
      }

      currentDeviceRef.current = nextDevice;
      setDevice(nextDevice);
      localStorage.setItem('device', JSON.stringify(nextDevice));
      deviceActions.setItem(nextDevice);
    },
    [deviceActions, setDevice],
  );

  const applyManagerPushToken = useCallback(
    async (deviceToken, {persistImmediately = false} = {}) => {
      const currentDevice = currentDeviceRef.current || {};
      if (!currentDevice?.id) {
        return false;
      }

      const normalizedToken = normalizeText(deviceToken);
      const currentToken = extractManagerPushToken(currentDevice?.metadata);

      if (
        !persistImmediately &&
        normalizedToken &&
        currentToken === normalizedToken
      ) {
        return true;
      }

      if (!persistImmediately && !normalizedToken && !currentToken) {
        return true;
      }

      if (persistImmediately && !normalizedToken && !currentToken) {
        return true;
      }

      const nextMetadata = mergeManagerPushTokenMetadata(
        currentDevice?.metadata,
        normalizedToken,
      );
      const nextDevice = {
        ...currentDevice,
        metadata: nextMetadata,
      };

      persistLocalDevice(nextDevice);

      if (!persistImmediately) {
        return true;
      }

      const entityId = resolvePersistableDeviceEntityId(currentDevice);
      if (!entityId) {
        return true;
      }

      try {
        await deviceActions.save({
          id: entityId,
          device: currentDevice.device || currentDevice.id,
          alias: currentDevice.alias,
          metadata: nextMetadata,
        });
      } catch (error) {
        console.warn('Erro ao limpar push token do Gestor no logout', error);
      }

      return true;
    },
    [deviceActions, persistLocalDevice],
  );

  useEffect(() => {
    currentDeviceRef.current = device || {};
  }, [device]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isManagerRuntime) {
      return;
    }

    global.clearManagerPushTokenOnLogout = () =>
      applyManagerPushToken('', {persistImmediately: true});

    return () => {
      if (global.clearManagerPushTokenOnLogout) {
        delete global.clearManagerPushTokenOnLogout;
      }
    };
  }, [applyManagerPushToken]);

  useEffect(() => {
    if (
      Platform.OS !== 'android' ||
      !isManagerRuntime ||
      !sessionChecked ||
      !currentDeviceRef.current?.id
    ) {
      return;
    }

    let cancelled = false;

    const configurePushSupport = async () => {
      if (!isLogged) {
        const currentToken = extractManagerPushToken(
          currentDeviceRef.current?.metadata,
        );

        if (currentToken) {
          await applyManagerPushToken('', {persistImmediately: false});
        }

        return;
      }

      const permissionStatus = await ensureManagerOrderNotificationPermission();

      if (cancelled) {
        return;
      }

      if (permissionStatus !== 'granted') {
        await applyManagerPushToken('', {persistImmediately: false});
        return;
      }

      if (!pushEnabled) {
        const currentToken = extractManagerPushToken(
          currentDeviceRef.current?.metadata,
        );

        if (currentToken) {
          await applyManagerPushToken('', {persistImmediately: false});
        }

        return;
      }

      const devicePushToken = await Notifications.getDevicePushTokenAsync();
      const nextToken = normalizeText(devicePushToken?.data);

      if (cancelled) {
        return;
      }

      if (!nextToken) {
        await applyManagerPushToken('', {persistImmediately: false});
      } else {
        await applyManagerPushToken(nextToken, {persistImmediately: false});
      }

      if (!pushTokenListenerRef.current) {
        pushTokenListenerRef.current = Notifications.addPushTokenListener(
          token => {
            const nextListenerToken = normalizeText(token?.data);
            if (!nextListenerToken) {
              return;
            }

            void applyManagerPushToken(nextListenerToken, {
              persistImmediately: false,
            });
          },
        );
      }

      if (!notificationResponseListenerRef.current) {
        notificationResponseListenerRef.current =
          Notifications.addNotificationResponseReceivedListener(response => {
            const orderId = extractOrderIdFromResponse(response);
            if (!orderId) {
              return;
            }

            queueNotificationNavigation('OrderDetails', {id: orderId});

            if (typeof Notifications.clearLastNotificationResponseAsync === 'function') {
              Notifications.clearLastNotificationResponseAsync().catch(() => {});
            }
          });
      }

      if (typeof Notifications.getLastNotificationResponseAsync === 'function') {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        const orderId = extractOrderIdFromResponse(lastResponse);

        if (!cancelled && orderId) {
          queueNotificationNavigation('OrderDetails', {id: orderId});

          if (typeof Notifications.clearLastNotificationResponseAsync === 'function') {
            Notifications.clearLastNotificationResponseAsync().catch(() => {});
          }
        }
      }
    };

    configurePushSupport().catch(error => {
      console.warn('Erro ao inicializar push nativo do Gestor', error);
    });

    return () => {
      cancelled = true;

      if (pushTokenListenerRef.current) {
        pushTokenListenerRef.current.remove();
        pushTokenListenerRef.current = null;
      }

      if (notificationResponseListenerRef.current) {
        notificationResponseListenerRef.current.remove();
        notificationResponseListenerRef.current = null;
      }
    };
  }, [
    applyManagerPushToken,
    device?.id,
    isLogged,
    isManagerRuntime,
    pushEnabled,
    sessionChecked,
  ]);

  return null;
};

export default ManagerPushBridge;
