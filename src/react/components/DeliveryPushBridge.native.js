import React, {useCallback, useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import {env as APP_ENV} from '@env';
import {useStore} from '@store';
import {ensureManagerOrderNotificationPermission} from '@controleonline/ui-common/src/react/utils/managerOrderNotifications';
import {queueNotificationNavigation} from '@controleonline/ui-common/src/react/utils/notificationNavigation';

const normalizeText = value => String(value || '').trim();

const isDeliveryRuntimeAppType = appType =>
  normalizeText(appType).toUpperCase() === 'DELIVERY';

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

const extractDeliveryPushToken = metadata =>
  normalizeText(metadata?.pushTokens?.delivery?.android?.deviceToken || '');

const resolvePersistableDeviceEntityId = deviceInfo =>
  normalizeText(deviceInfo?.entityId || deviceInfo?.apiId || deviceInfo?.['@id']).replace(/\D+/g, '');

const mergeDeliveryPushTokenMetadata = (metadata, deviceToken) => {
  const normalizedMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : {};
  const nextMetadata = {
    ...normalizedMetadata,
  };

  const pushTokens = normalizedMetadata.pushTokens && typeof normalizedMetadata.pushTokens === 'object' && !Array.isArray(normalizedMetadata.pushTokens)
    ? {...normalizedMetadata.pushTokens}
    : {};
  const deliveryTokens = pushTokens.delivery && typeof pushTokens.delivery === 'object' && !Array.isArray(pushTokens.delivery)
    ? {...pushTokens.delivery}
    : {};
  const androidTokens = deliveryTokens.android && typeof deliveryTokens.android === 'object' && !Array.isArray(deliveryTokens.android)
    ? {...deliveryTokens.android}
    : {};

  if (normalizeText(deviceToken)) {
    androidTokens.deviceToken = normalizeText(deviceToken);
    deliveryTokens.android = androidTokens;
    pushTokens.delivery = deliveryTokens;
    nextMetadata.pushTokens = pushTokens;
    return nextMetadata;
  }

  delete androidTokens.deviceToken;
  if (Object.keys(androidTokens).length > 0) {
    deliveryTokens.android = androidTokens;
  } else {
    delete deliveryTokens.android;
  }

  if (Object.keys(deliveryTokens).length > 0) {
    pushTokens.delivery = deliveryTokens;
  } else {
    delete pushTokens.delivery;
  }

  if (Object.keys(pushTokens).length > 0) {
    nextMetadata.pushTokens = pushTokens;
  } else {
    delete nextMetadata.pushTokens;
  }

  return nextMetadata;
};

const DeliveryPushBridge = ({device, setDevice}) => {
  const authStore = useStore('auth');
  const deviceStore = useStore('device');

  const authGetters = authStore.getters;
  const deviceActions = deviceStore.actions;

  const {isLogged, sessionChecked} = authGetters;
  const isDeliveryRuntime = isDeliveryRuntimeAppType(APP_ENV?.APP_TYPE);

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

  const applyDeliveryPushToken = useCallback(
    async (deviceToken, {persistImmediately = false} = {}) => {
      const currentDevice = currentDeviceRef.current || {};
      if (!currentDevice?.id) {
        return false;
      }

      const normalizedToken = normalizeText(deviceToken);
      const currentToken = extractDeliveryPushToken(currentDevice?.metadata);

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

      const nextMetadata = mergeDeliveryPushTokenMetadata(
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
        console.warn('Erro ao salvar push token de Delivery no logout', error);
      }

      return true;
    },
    [deviceActions, persistLocalDevice],
  );

  useEffect(() => {
    currentDeviceRef.current = device || {};
  }, [device]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isDeliveryRuntime) {
      return;
    }

    global.clearDeliveryPushTokenOnLogout = () =>
      applyDeliveryPushToken('', {persistImmediately: true});

    return () => {
      if (global.clearDeliveryPushTokenOnLogout) {
        delete global.clearDeliveryPushTokenOnLogout;
      }
    };
  }, [applyDeliveryPushToken, isDeliveryRuntime]);

  useEffect(() => {
    if (
      Platform.OS !== 'android' ||
      !isDeliveryRuntime ||
      !sessionChecked ||
      !currentDeviceRef.current?.id
    ) {
      return;
    }

    let cancelled = false;

    const configurePushSupport = async () => {
      if (!isLogged) {
        const currentToken = extractDeliveryPushToken(
          currentDeviceRef.current?.metadata,
        );

        if (currentToken) {
          await applyDeliveryPushToken('', {persistImmediately: true});
        }

        return;
      }

      const permissionStatus = await ensureManagerOrderNotificationPermission();

      if (cancelled) {
        return;
      }

      if (permissionStatus !== 'granted') {
        await applyDeliveryPushToken('', {persistImmediately: true});
        return;
      }

      const devicePushToken = await Notifications.getDevicePushTokenAsync();
      const nextToken = normalizeText(devicePushToken?.data);

      if (cancelled) {
        return;
      }

      if (!nextToken) {
        await applyDeliveryPushToken('', {persistImmediately: true});
      } else {
        await applyDeliveryPushToken(nextToken, {persistImmediately: true});
      }

      if (!pushTokenListenerRef.current) {
        pushTokenListenerRef.current = Notifications.addPushTokenListener(
          token => {
            const nextListenerToken = normalizeText(token?.data);
            if (!nextListenerToken) {
              return;
            }

            void applyDeliveryPushToken(nextListenerToken, {
              persistImmediately: true,
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
      console.warn('Erro ao inicializar push nativo de Delivery', error);
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
  }, [applyDeliveryPushToken, device?.id, isDeliveryRuntime, isLogged, sessionChecked]);

  return null;
};

export default DeliveryPushBridge;
