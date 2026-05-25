import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {createAudioPlayer} from 'expo-audio';
import {NativeModules, Platform} from 'react-native';
import {useStore, useStores} from '@store';
import {env as APP_ENV} from '@env';
import {api} from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  DEVICE_ALERT_SOUND_ENABLED_KEY,
  DEVICE_ALERT_SOUND_URL_KEY,
  isTruthyValue,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {resolveOrderIdentity} from '@controleonline/ui-orders/src/react/utils/orderIdentity';
import {
  isManagerAppType,
  resolveManagerFinancialNotificationPreferences,
  resolveManagerOrderNotificationPreferences,
  showManagerFinancialNotification,
  showManagerOrderNotification,
} from '@controleonline/ui-common/src/react/utils/managerOrderNotifications';
import {resolveNotificationSoundSource} from '@controleonline/ui-common/src/react/utils/notificationSound';

const MAX_PROCESSED_EVENTS = 200;
const ORDER_CREATED_EVENT = 'order.created';
const FINANCIAL_ALERT_EVENTS = new Set(['cash.closed', 'store.opened', 'store.closed']);

const normalizeEntityId = value => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'object') {
    return normalizeEntityId(
      value['@id'] ||
        value.id ||
        value.device ||
        value.queue ||
        value.order ||
        value.orderProductQueue,
    );
  }

  return String(value).replace(/\D/g, '');
};

const normalizeText = value => String(value || '').trim();
const DEFAULT_ALERT_SOUND_SOURCE = resolveNotificationSoundSource('');

const parseNumericValue = value => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }

  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return NaN;
  }

  const sanitizedValue = normalizedValue
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const numericValue = Number(sanitizedValue);

  return Number.isFinite(numericValue) ? numericValue : NaN;
};

const resolveOrderCustomerName = order =>
  normalizeText(
    order?.client?.alias ||
      order?.client?.name ||
      order?.customer?.alias ||
      order?.customer?.name ||
      order?.person?.alias ||
      order?.person?.name,
  );

const resolveOrderPriceLabel = order => {
  const numericPrice = parseNumericValue(order?.price);

  if (Number.isFinite(numericPrice) && numericPrice > 0) {
    return Formatter.formatMoney(numericPrice);
  }

  return '';
};

const isFilledObject = value =>
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;

const collectMessages = (messages, message) => {
  const nextMessages = Array.isArray(messages)
    ? messages.filter(isFilledObject)
    : [];

  if (isFilledObject(message)) {
    nextMessages.push(message);
  }

  return nextMessages;
};

const buildMessageFingerprint = message => {
  const payload = {...message};
  delete payload.store;

  return JSON.stringify({
    type: normalizeText(message?.event || message?.action || message?.command),
    companyId: normalizeEntityId(
      message?.company?.id || message?.companyId || message?.company,
    ),
    orderId: normalizeEntityId(message?.order),
    queueId: normalizeEntityId(message?.queue),
    orderProductQueueId: normalizeEntityId(
      message?.orderProductQueue ||
        message?.order_product_queue ||
        message?.orderProductQueueId ||
        message?.id,
    ),
    deviceId: normalizeEntityId(message?.device),
    sentAt: normalizeText(message?.sentAt),
    printType: normalizeText(message?.printType),
    payload,
  });
};

const isRelevantOrderCreatedMessage = message => {
  const store = normalizeText(message?.store);
  const event = normalizeText(message?.event);
  const realStatus = normalizeText(message?.realStatus).toLowerCase();

  return (
    store === 'orders' &&
    event === ORDER_CREATED_EVENT &&
    realStatus === 'open'
  );
};

const isRelevantFinancialMessage = message => {
  const store = normalizeText(message?.store);
  const event = normalizeText(message?.event);

  return store === 'orders' && FINANCIAL_ALERT_EVENTS.has(event);
};

const isMessageForCurrentCompany = (message, currentCompanyId) => {
  if (!currentCompanyId) {
    return true;
  }

  const messageCompanyId = normalizeEntityId(
    message?.company?.id || message?.companyId || message?.company,
  );

  return !messageCompanyId || messageCompanyId === currentCompanyId;
};

const DeviceAlertSoundService = () => {
  const authStore = useStore('auth');
  const peopleStore = useStore('people');
  const deviceConfigStore = useStore('device_config');
  const ordersStore = useStores(state => state?.orders || {getters: {}, actions: {}});

  const processedEventsRef = useRef(new Map());
  const playerRef = useRef(null);
  const playerSourceRef = useRef('');

  const {user} = authStore.getters;
  const {currentCompany} = peopleStore.getters;
  const deviceConfig = useMemo(
    () => parseConfigsObject(deviceConfigStore.getters?.item?.configs),
    [deviceConfigStore.getters?.item?.configs],
  );
  const managerOrderNotificationPreferences = useMemo(
    () => resolveManagerOrderNotificationPreferences(user),
    [user],
  );
  const managerFinancialNotificationPreferences = useMemo(
    () => resolveManagerFinancialNotificationPreferences(user),
    [user],
  );

  const isManagerRuntime = isManagerAppType(APP_ENV?.APP_TYPE);
  const currentCompanyId = normalizeEntityId(currentCompany?.id);
  const managerPushEnabled =
    isManagerRuntime && managerOrderNotificationPreferences.pushEnabled;
  const managerFinancialCashCloseEnabled =
    isManagerRuntime && managerFinancialNotificationPreferences.cashClosePushEnabled;
  const managerFinancialStoreCloseEnabled =
    isManagerRuntime && managerFinancialNotificationPreferences.storeClosePushEnabled;
  const managerSoundEnabled =
    managerPushEnabled && managerOrderNotificationPreferences.soundEnabled;
  const managerSoundUrl = normalizeText(
    managerOrderNotificationPreferences.soundUrl,
  );
  const deviceAlertSoundEnabled = isTruthyValue(
    deviceConfig?.[DEVICE_ALERT_SOUND_ENABLED_KEY],
  );
  const deviceAlertSoundUrl = normalizeText(
    deviceConfig?.[DEVICE_ALERT_SOUND_URL_KEY],
  );
  const shouldPlayManagerSound = managerSoundEnabled;
  const shouldPlayDeviceAlertSound = deviceAlertSoundEnabled;
  const shouldPlayAlertSound =
    shouldPlayManagerSound || shouldPlayDeviceAlertSound;
  const alertSoundSource = shouldPlayManagerSound
    ? resolveNotificationSoundSource(
        managerSoundUrl,
        DEFAULT_ALERT_SOUND_SOURCE,
      )
    : shouldPlayDeviceAlertSound
      ? resolveNotificationSoundSource(
          deviceAlertSoundUrl,
          DEFAULT_ALERT_SOUND_SOURCE,
        )
      : null;
  const isAndroidBackgroundRuntime =
    Platform.OS === 'android' && !!NativeModules?.BackgroundRuntime;

  const ensurePlayer = useCallback(
    source => {
      if (!source) {
        return null;
      }

      try {
        if (!playerRef.current) {
          playerRef.current = createAudioPlayer(source);
          playerSourceRef.current = source;
          return playerRef.current;
        }

        if (playerSourceRef.current !== source) {
          playerRef.current.replace(source);
          playerSourceRef.current = source;
        }

        return playerRef.current;
      } catch (error) {
        console.warn('Erro ao preparar aviso sonoro do websocket', error);
        return null;
      }
    },
    [],
  );

  const playAlertSound = useCallback(async () => {
    const player = ensurePlayer(alertSoundSource);

    if (!player) {
      return;
    }

    try {
      if (typeof player.seekTo === 'function') {
        await player.seekTo(0);
      }
    } catch {
      // Alguns players ainda não aceitam seek antes da primeira carga completa.
    }

    try {
      player.play();
    } catch (error) {
      console.warn('Erro ao tocar aviso sonoro do websocket', error);
    }
  }, [alertSoundSource, ensurePlayer]);

  const enrichNotificationMessages = useCallback(async messages => {
    const messageList = Array.isArray(messages) ? messages : [];

    if (!isManagerRuntime || messageList.length !== 1) {
      return messageList;
    }

    const [message] = messageList;
    const orderId = normalizeEntityId(message?.order);

    if (!orderId) {
      return messageList;
    }

    try {
      const order = await api.fetch(`orders/${orderId}`, {});
      const identity = resolveOrderIdentity(order);

      return [
        {
          ...message,
          notificationHeader:
            normalizeText(identity?.primaryText) ||
            normalizeText(message?.notificationHeader),
          notificationSubheader:
            normalizeText(identity?.secondaryText) ||
            normalizeText(message?.notificationSubheader),
          notificationCustomerName:
            resolveOrderCustomerName(order) ||
            normalizeText(message?.notificationCustomerName),
          notificationPriceLabel:
            resolveOrderPriceLabel(order) ||
            normalizeText(message?.notificationPriceLabel),
          notificationStatusLabel: 'Fila',
        },
      ];
    } catch {
      return [
        {
          ...message,
          notificationStatusLabel:
            normalizeText(message?.notificationStatusLabel) || 'Fila',
        },
      ];
    }
  }, [isManagerRuntime]);

  const markProcessedKeys = useCallback(keys => {
    keys.forEach(key => {
      processedEventsRef.current.set(key, Date.now());
      if (processedEventsRef.current.size > MAX_PROCESSED_EVENTS) {
        const oldestKey = processedEventsRef.current.keys().next().value;
        processedEventsRef.current.delete(oldestKey);
      }
    });
  }, []);

  useEffect(() => {
    processedEventsRef.current.clear();
  }, [currentCompanyId]);

  useEffect(() => {
    return () => {
      if (playerRef.current && typeof playerRef.current.remove === 'function') {
        playerRef.current.remove();
      }
      playerRef.current = null;
      playerSourceRef.current = '';
    };
  }, []);

  const orderMessages = ordersStore.getters?.messages;
  const orderMessage = ordersStore.getters?.message;

  useEffect(() => {
    if (isManagerRuntime && Platform.OS === 'android') {
      return;
    }

    if (isAndroidBackgroundRuntime) {
      return;
    }

    const incomingMessages = [...collectMessages(orderMessages, orderMessage)].filter(
      message =>
        isRelevantOrderCreatedMessage(message) &&
        isMessageForCurrentCompany(message, currentCompanyId),
    );

    if (incomingMessages.length === 0) {
      return;
    }

    const unseenEntries = incomingMessages
      .map(message => ({
        message,
        key: buildMessageFingerprint(message),
      }))
      .filter(entry => entry.key && !processedEventsRef.current.has(entry.key));

    if (unseenEntries.length === 0) {
      return;
    }

    const unseenKeys = unseenEntries.map(entry => entry.key);
    const unseenMessages = unseenEntries.map(entry => entry.message);

    markProcessedKeys(unseenKeys);

    if (!managerPushEnabled && !shouldPlayAlertSound) {
      return;
    }

    Promise.resolve(
      managerPushEnabled
        ? enrichNotificationMessages(unseenMessages)
        : unseenMessages,
    ).then(notificationMessages =>
      Promise.allSettled([
        managerPushEnabled
          ? showManagerOrderNotification({
              messages: notificationMessages,
              currentCompany,
            })
          : Promise.resolve(false),
        shouldPlayAlertSound && alertSoundSource
          ? playAlertSound()
          : Promise.resolve(),
      ]),
    );
  }, [
    alertSoundSource,
    currentCompanyId,
    currentCompany,
    enrichNotificationMessages,
    managerPushEnabled,
    markProcessedKeys,
    orderMessage,
    orderMessages,
    playAlertSound,
    shouldPlayAlertSound,
    isManagerRuntime,
  ]);

  useEffect(() => {
    if (isManagerRuntime && Platform.OS === 'android') {
      return;
    }

    if (isAndroidBackgroundRuntime) {
      return;
    }

    const incomingMessages = [...collectMessages(orderMessages, orderMessage)].filter(
      message =>
        isRelevantFinancialMessage(message) &&
        isMessageForCurrentCompany(message, currentCompanyId),
    );

    if (incomingMessages.length === 0) {
      return;
    }

    const unseenEntries = incomingMessages
      .map(message => ({
        message,
        key: buildMessageFingerprint(message),
      }))
      .filter(entry => entry.key && !processedEventsRef.current.has(entry.key));

    if (unseenEntries.length === 0) {
      return;
    }

    const unseenKeys = unseenEntries.map(entry => entry.key);
    const unseenMessages = unseenEntries.map(entry => entry.message);

    markProcessedKeys(unseenKeys);

    const enabledMessages = unseenMessages.filter(message => {
      const event = normalizeText(message?.event);

      if (event === 'cash.closed') {
        return managerFinancialCashCloseEnabled;
      }

      if (event === 'store.opened' || event === 'store.closed') {
        return managerFinancialStoreCloseEnabled;
      }

      return false;
    });

    if (enabledMessages.length === 0) {
      return;
    }

    Promise.allSettled(
      enabledMessages.map(message =>
        showManagerFinancialNotification({
          messages: [message],
          currentCompany,
          store: 'orders',
          event: normalizeText(message?.event) || 'cash.closed',
        }),
      ),
    ).catch(() => {});
  }, [
    currentCompany,
    currentCompanyId,
    managerFinancialCashCloseEnabled,
    managerFinancialStoreCloseEnabled,
    markProcessedKeys,
    orderMessage,
    orderMessages,
    isManagerRuntime,
  ]);

  return null;
};

export default DeviceAlertSoundService;
