import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {createAudioPlayer} from 'expo-audio';
import {useStore, useStores} from '@store';
import {
  DEVICE_ALERT_SOUND_ENABLED_KEY,
  DEVICE_ALERT_SOUND_URL_KEY,
  isTruthyValue,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

const MAX_PROCESSED_EVENTS = 200;
const ORDER_CREATED_EVENT = 'order.created';

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

const isRelevantAlertMessage = message => {
  const store = normalizeText(message?.store);
  const event = normalizeText(message?.event);
  const realStatus = normalizeText(message?.realStatus).toLowerCase();

  return (
    store === 'orders' &&
    event === ORDER_CREATED_EVENT &&
    realStatus === 'open' &&
    isTruthyValue(message?.alertSound)
  );
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
  const peopleStore = useStore('people');
  const deviceConfigStore = useStore('device_config');
  const ordersStore = useStores(state => state?.orders || {getters: {}, actions: {}});

  const processedEventsRef = useRef(new Map());
  const playerRef = useRef(null);
  const playerSourceRef = useRef('');

  const {currentCompany} = peopleStore.getters;
  const deviceConfig = useMemo(
    () => parseConfigsObject(deviceConfigStore.getters?.item?.configs),
    [deviceConfigStore.getters?.item?.configs],
  );

  const currentCompanyId = normalizeEntityId(currentCompany?.id);
  const alertSoundEnabled = isTruthyValue(
    deviceConfig?.[DEVICE_ALERT_SOUND_ENABLED_KEY],
  );
  const alertSoundUrl = normalizeText(
    deviceConfig?.[DEVICE_ALERT_SOUND_URL_KEY],
  );

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
    const player = ensurePlayer(alertSoundUrl);

    if (!player) {
      return;
    }

    try {
      if (typeof player.seekTo === 'function') {
        await player.seekTo(0);
      }
    } catch (error) {
      // Alguns players ainda não aceitam seek antes da primeira carga completa.
    }

    try {
      player.play();
    } catch (error) {
      console.warn('Erro ao tocar aviso sonoro do websocket', error);
    }
  }, [alertSoundUrl, ensurePlayer]);

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
    const incomingMessages = [
      ...collectMessages(orderMessages, orderMessage),
    ].filter(
      message =>
        isRelevantAlertMessage(message) &&
        isMessageForCurrentCompany(message, currentCompanyId),
    );

    if (incomingMessages.length === 0) {
      return;
    }

    const unseenKeys = incomingMessages
      .map(buildMessageFingerprint)
      .filter(Boolean)
      .filter(key => !processedEventsRef.current.has(key));

    if (unseenKeys.length === 0) {
      return;
    }

    if (!alertSoundEnabled || !alertSoundUrl) {
      markProcessedKeys(unseenKeys);
      return;
    }

    markProcessedKeys(unseenKeys);

    playAlertSound();
  }, [
    alertSoundEnabled,
    alertSoundUrl,
    currentCompanyId,
    markProcessedKeys,
    orderMessage,
    orderMessages,
    playAlertSound,
  ]);

  return null;
};

export default DeviceAlertSoundService;
